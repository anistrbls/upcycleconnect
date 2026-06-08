"use client";

import { useEffect, useState, useCallback } from "react";
import { listUsers, updateUser } from "../../../lib/userService";
import { fieldStyle, labelStyle } from "../../../lib/styles";
import AdminModal from "../AdminModal";
import { AlertCircle, Check, Search, CreditCard, Users, ShieldAlert, Sparkles, Plus, Trash } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";

const statusLabel = (status) => {
    if (status === "active") return "Actif";
    if (status === "pending") return "En attente";
    if (status === "suspended") return "Suspendu";
    return status || "—";
};

const statusStyle = (status) => {
    if (status === "active") {
        return { bg: "#E5FFBC", color: "#3E4A1A" };
    }
    if (status === "pending") {
        return { bg: "#EAF0F1", color: "#4F6163" };
    }
    return { bg: "#151A1B", color: "#C8D2D4" };
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Date invalide";
    return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
};

export default function SubscriptionsAdminView() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dynamic plans configuration state
    const [plans, setPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("subscribers"); // "subscribers" | "config"

    // Plan editing state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        key: "",
        name: "",
        price_euro: 0,
        features: [],
    });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState("");

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [subTypeFilter, setSubTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        subscriptionType: "decouverte",
        subscriptionStart: "",
        status: "active",
    });
    const [modalSaving, setModalSaving] = useState(false);
    const [modalError, setModalError] = useState("");

    // Toast feedback
    const [toast, setToast] = useState(null);

    const loadPlans = useCallback(async () => {
        setPlansLoading(true);
        try {
            const res = await fetch(apiUrl("/pro/subscription-plans"), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.plans) {
                setPlans(data.plans);
            }
        } catch (err) {
            console.error("Failed to load plans:", err);
        } finally {
            setPlansLoading(false);
        }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Retrieve professional users
            const allUsers = await listUsers({ role: "professionnel" });
            setUsers(allUsers);
        } catch (err) {
            setError(err.message || "Erreur lors du chargement des abonnements.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        loadPlans();
    }, [loadData, loadPlans]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(timer);
    }, [toast]);

    const handleOpenModal = (user) => {
        setSelectedUser(user);
        setFormData({
            subscriptionType: user.subscriptionType || "decouverte",
            subscriptionStart: user.subscriptionStart
                ? new Date(user.subscriptionStart).toISOString().split("T")[0]
                : "",
            status: user.status || "active",
        });
        setModalError("");
        setModalOpen(true);
    };

    const handleSaveSubscription = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        
        setModalSaving(true);
        setModalError("");
        try {
            const payload = {
                ...selectedUser,
                subscriptionType: formData.subscriptionType,
                subscriptionStart: formData.subscriptionStart
                    ? new Date(formData.subscriptionStart).toISOString()
                    : null,
                status: formData.status,
            };

            await updateUser(selectedUser.id, payload);
            setModalOpen(false);
            setToast({
                type: "success",
                msg: `L'abonnement de ${selectedUser.companyName || selectedUser.firstname} a été mis à jour.`,
            });
            await loadData();
        } catch (err) {
            setModalError(err.message || "Une erreur est survenue lors de la mise à jour.");
        } finally {
            setModalSaving(false);
        }
    };

    const handleOpenEditPlanModal = (plan) => {
        setEditFormData({
            key: plan.key,
            name: plan.name,
            price_euro: plan.price_euro,
            features: [...(plan.features || [])],
        });
        setEditError("");
        setEditModalOpen(true);
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        setEditSaving(true);
        setEditError("");
        try {
            const res = await fetch(apiUrl("/admin/subscription-plans"), {
                method: "PUT",
                headers: {
                    ...buildAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editFormData),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "Impossible de mettre à jour l'offre.");
            }
            setEditModalOpen(false);
            setToast({
                type: "success",
                msg: `L'offre "${editFormData.name}" a été mise à jour avec succès.`,
            });
            await loadPlans();
        } catch (err) {
            setEditError(err.message || "Une erreur est survenue lors de la mise à jour de l'offre.");
        } finally {
            setEditSaving(false);
        }
    };

    // Calculate dynamic stats
    const totalPros = users.length;
    const decouverteCount = users.filter((u) => u.subscriptionType === "decouverte" || u.subscriptionType === "gratuit" || !u.subscriptionType).length;
    const proCount = users.filter((u) => u.subscriptionType === "pro_essentiel").length;
    const premiumCount = users.filter((u) => u.subscriptionType === "premium_atelier").length;
    const paidCount = proCount + premiumCount;

    const proPrice = plans.find((p) => p.key === "pro_essentiel")?.price_euro ?? 15;
    const premiumPrice = plans.find((p) => p.key === "premium_atelier")?.price_euro ?? 30;
    const estimatedMRR = (proCount * proPrice) + (premiumCount * premiumPrice);

    // Filter users list
    const filteredUsers = users.filter((u) => {
        // Search filter
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || 
            (u.companyName && u.companyName.toLowerCase().includes(q)) ||
            (u.companyManager && u.companyManager.toLowerCase().includes(q)) ||
            (`${u.firstname} ${u.lastname}`).toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.siret && u.siret.includes(q));

        // Subscription type filter
        let currentType = u.subscriptionType || "decouverte";
        if (currentType === "gratuit") currentType = "decouverte";
        const matchesSubType = subTypeFilter === "all" || currentType === subTypeFilter;

        // Status filter
        const matchesStatus = statusFilter === "all" || u.status === statusFilter;

        return matchesSearch && matchesSubType && matchesStatus;
    });

    return (
        <div style={{ padding: "0" }}>
            {/* Header */}
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Administration</span>
                    <h1>Gestion des Abonnements</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
                        Suivi des abonnements professionnels, de la facturation récurrente et des statuts de compte.
                    </p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div style={{ display: "flex", gap: "1.5rem", borderBottom: "1px solid var(--border-color)", marginBottom: "2rem" }}>
                <button
                    onClick={() => setActiveTab("subscribers")}
                    style={{
                        padding: "0.75rem 0.5rem",
                        background: "none",
                        border: "none",
                        borderBottom: activeTab === "subscribers" ? "2px solid var(--primary-color)" : "2px solid transparent",
                        color: activeTab === "subscribers" ? "var(--text-main)" : "var(--text-muted)",
                        fontWeight: "600",
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    Liste des abonnés
                </button>
                <button
                    onClick={() => setActiveTab("config")}
                    style={{
                        padding: "0.75rem 0.5rem",
                        background: "none",
                        border: "none",
                        borderBottom: activeTab === "config" ? "2px solid var(--primary-color)" : "2px solid transparent",
                        color: activeTab === "config" ? "var(--text-main)" : "var(--text-muted)",
                        fontWeight: "600",
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    Configuration des offres
                </button>
            </div>

            {activeTab === "subscribers" ? (
                <>
                    {/* KPI Section */}
                    <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                        <div className="kpi-card" style={{ background: "#ffffff", padding: "1.5rem", borderRadius: "22px", border: "1px solid var(--border-color)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Comptes Pro</span>
                                <div style={{ padding: "8px", background: "rgba(0,0,0,0.03)", borderRadius: "12px", color: "var(--text-main)" }}><Users size={20} /></div>
                            </div>
                            <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-main)" }}>{loading ? "..." : totalPros}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Inscrits sur la plateforme</div>
                        </div>

                        <div className="kpi-card" style={{ background: "#D6EEF0", padding: "1.5rem", borderRadius: "22px", border: "1px solid var(--border-color)", boxShadow: "0 4px 12px rgba(46, 92, 96, 0.03)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#2e5c60", textTransform: "uppercase", letterSpacing: "0.05em" }}>Abonnés Payants</span>
                                <div style={{ padding: "8px", background: "rgba(255, 255, 255, 0.45)", borderRadius: "12px", color: "#2e5c60" }}><Sparkles size={20} /></div>
                            </div>
                            <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#1f3e41" }}>{loading ? "..." : paidCount}</div>
                            <div style={{ fontSize: "0.78rem", color: "#2e5c60", marginTop: "0.25rem" }}>
                                {loading ? "..." : `${((paidCount / (totalPros || 1)) * 100).toFixed(0)}% de conversion`}
                            </div>
                        </div>

                        <div className="kpi-card" style={{ background: "#ffffff", padding: "1.5rem", borderRadius: "22px", border: "1px solid var(--border-color)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Formules Découverte</span>
                                <div style={{ padding: "8px", background: "rgba(0,0,0,0.03)", borderRadius: "12px", color: "var(--text-muted)" }}><CreditCard size={20} /></div>
                            </div>
                            <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-main)" }}>{loading ? "..." : decouverteCount}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Fonctionnalités gratuites de base</div>
                        </div>

                        <div className="kpi-card" style={{ background: "#E5FFBC", padding: "1.5rem", borderRadius: "22px", border: "1px solid var(--border-color)", boxShadow: "0 4px 12px rgba(62, 74, 26, 0.03)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#3e4a1a", textTransform: "uppercase", letterSpacing: "0.05em" }}>MRR Estimé</span>
                                <span style={{ fontSize: "0.7rem", fontWeight: "700", background: "rgba(255, 255, 255, 0.45)", color: "#3e4a1a", padding: "0.15rem 0.45rem", borderRadius: "6px" }}>Réel</span>
                            </div>
                            <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#233b3d" }}>
                                {loading ? "..." : `${estimatedMRR.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#3e4a1a", marginTop: "0.25rem" }}>15€ (Pro) & 30€ (Premium)</div>
                        </div>
                    </div>

            {/* Table Panel */}
            <div className="panel">
                {/* Search & Filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: "1 1 280px" }}>
                        <input
                            type="text"
                            placeholder="Rechercher une entreprise, un gérant ou un email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: "100%",
                                border: "none",
                                borderRadius: "999px",
                                padding: "0.6rem 1rem 0.6rem 2.2rem",
                                fontSize: "0.88rem",
                                background: "rgb(229, 255, 188)",
                                color: "var(--text-main)",
                                fontFamily: "inherit",
                                outline: "none"
                            }}
                        />
                        <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <select
                            value={subTypeFilter}
                            onChange={(e) => setSubTypeFilter(e.target.value)}
                            style={{
                                border: "none",
                                borderRadius: "999px",
                                padding: "0.6rem 2.6rem 0.6rem 1.1rem",
                                fontSize: "0.88rem",
                                background: "rgb(229, 255, 188)",
                                color: "var(--text-main)",
                                fontFamily: "inherit",
                                outline: "none",
                                cursor: "pointer",
                                appearance: "none",
                                WebkitAppearance: "none",
                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232b4548%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 0.9rem center",
                                backgroundSize: "0.65rem auto",
                            }}
                        >
                            <option value="all">Tous les abonnements</option>
                            <option value="decouverte">Découverte (Free)</option>
                            <option value="pro_essentiel">Pro Essentiel (15€)</option>
                            <option value="premium_atelier">Premium Atelier (30€)</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                border: "none",
                                borderRadius: "999px",
                                padding: "0.6rem 2.6rem 0.6rem 1.1rem",
                                fontSize: "0.88rem",
                                background: "rgb(229, 255, 188)",
                                color: "var(--text-main)",
                                fontFamily: "inherit",
                                outline: "none",
                                cursor: "pointer",
                                appearance: "none",
                                WebkitAppearance: "none",
                                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232b4548%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 0.9rem center",
                                backgroundSize: "0.65rem auto",
                            }}
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="active">Actif</option>
                            <option value="pending">En attente</option>
                            <option value="suspended">Suspendu</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: "4rem", textAlign: "center" }}>
                        <div className="loading-spinner" style={{ margin: "0 auto 1rem" }}></div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement des données abonnements...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: "3rem", textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
                        <h3 style={{ marginBottom: "0.5rem" }}>Erreur de chargement</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
                        <button className="action-cta task-action-btn" onClick={loadData}>Réessayer</button>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div style={{ padding: "5rem 2rem", textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1.5rem", opacity: 0.3 }}>💳</div>
                        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
                            Aucun compte professionnel ne correspond à ces critères.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto", margin: "0 -1.5rem" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                            <thead>
                                <tr style={{ textAlign: "left", background: "var(--surface-sunken)" }}>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Entreprise</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact Gérant</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Formule</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date Début</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Compte</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => {
                                    const st = statusStyle(user.status);
                                    const isPremiumAtelier = user.subscriptionType === "premium_atelier";
                                    const isProEssentiel = user.subscriptionType === "pro_essentiel";

                                    return (
                                        <tr key={user.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }}>
                                            <td style={{ padding: "1.2rem 1.5rem" }}>
                                                <div style={{ fontWeight: "700", color: "var(--text-main)", marginBottom: "0.2rem" }}>
                                                    {user.companyName || "—"}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                    SIRET : {user.siret || "—"}
                                                </div>
                                            </td>
                                            <td style={{ padding: "1.2rem 1.5rem" }}>
                                                <div style={{ fontWeight: "600" }}>{user.firstname} {user.lastname}</div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user.email}</div>
                                            </td>
                                            <td style={{ padding: "1.2rem 1.5rem" }}>
                                                {isPremiumAtelier ? (
                                                    <span style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        padding: "0.3rem 0.75rem",
                                                        borderRadius: "999px",
                                                        fontSize: "0.75rem",
                                                        fontWeight: "700",
                                                        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                                                        color: "#ffffff",
                                                        boxShadow: "0 2px 6px rgba(109, 40, 217, 0.15)",
                                                        gap: "4px"
                                                    }}>
                                                        <Sparkles size={11} />
                                                        Premium Atelier
                                                    </span>
                                                ) : isProEssentiel ? (
                                                    <span style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        padding: "0.3rem 0.75rem",
                                                        borderRadius: "999px",
                                                        fontSize: "0.75rem",
                                                        fontWeight: "700",
                                                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                                        color: "#ffffff",
                                                        boxShadow: "0 2px 6px rgba(5, 150, 105, 0.15)",
                                                        gap: "4px"
                                                    }}>
                                                        <Sparkles size={11} />
                                                        Pro Essentiel
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        padding: "0.3rem 0.75rem",
                                                        borderRadius: "999px",
                                                        fontSize: "0.75rem",
                                                        fontWeight: "600",
                                                        background: "#f1f5f9",
                                                        color: "#475569",
                                                        border: "1px solid #cbd5e1"
                                                    }}>
                                                        Découverte
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: "1.2rem 1.5rem" }}>
                                                <span style={{ fontWeight: "500", color: user.subscriptionStart ? "var(--text-main)" : "var(--text-muted)" }}>
                                                    {formatDate(user.subscriptionStart)}
                                                </span>
                                            </td>
                                            <td style={{ padding: "1.2rem 1.5rem" }}>
                                                <span style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    padding: "0.22rem 0.65rem",
                                                    borderRadius: "999px",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600,
                                                    whiteSpace: "nowrap",
                                                    letterSpacing: "0.01em",
                                                    background: st.bg,
                                                    color: st.color,
                                                }}>
                                                    {statusLabel(user.status)}
                                                </span>
                                            </td>
                                            <td style={{ padding: "1.2rem 1.5rem", textAlign: "right" }}>
                                                <button
                                                    type="button"
                                                    className="action-cta task-action-btn"
                                                    style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem" }}
                                                    onClick={() => handleOpenModal(user)}
                                                >
                                                    Gérer l&apos;abonnement
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            </>
            ) : (
                /* Plan Configuration panel */
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    {plansLoading ? (
                        <div style={{ padding: "4rem", textAlign: "center" }}>
                            <div className="loading-spinner" style={{ margin: "0 auto 1rem" }}></div>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement des offres...</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
                            {plans.map((p) => {
                                let color = "#4F6163";
                                let bgHeader = "#EAF0F1";
                                if (p.key === "pro_essentiel") {
                                    color = "#2E5C60";
                                    bgHeader = "#D6EEF0";
                                } else if (p.key === "premium_atelier") {
                                    color = "#3E4A1A";
                                    bgHeader = "#E5FFBC";
                                }

                                return (
                                    <div
                                        key={p.key}
                                        className="panel"
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            border: "1px solid var(--border-color)",
                                            borderRadius: "22px",
                                            padding: "0",
                                            overflow: "hidden",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                                            background: "#ffffff"
                                        }}
                                    >
                                        {/* Card Header */}
                                        <div style={{ padding: "2rem 1.5rem", background: bgHeader, borderBottom: "1px solid var(--border-color)" }}>
                                            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: color, marginBottom: "0.5rem" }}>
                                                {p.name}
                                            </h3>
                                            <div style={{ display: "flex", alignItems: "baseline" }}>
                                                <span style={{ fontSize: "2.25rem", fontWeight: "800", color: "var(--text-main)" }}>
                                                    {p.price_euro} €
                                                </span>
                                                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "0.3rem" }}>
                                                    / mois
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Features List */}
                                        <div style={{ padding: "2rem 1.5rem", flex: 1 }}>
                                            <ul style={{ listStyle: "none", padding: "0", margin: "0", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                                {(p.features || []).map((f, i) => (
                                                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.88rem", color: "var(--text-main)" }}>
                                                        <Check size={16} color={color} style={{ marginTop: "0.15rem", flexShrink: 0 }} />
                                                        <span>{f}</span>
                                                    </li>
                                                ))}
                                                {(!p.features || p.features.length === 0) && (
                                                    <li style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                                                        Aucune fonctionnalité configurée.
                                                    </li>
                                                )}
                                            </ul>
                                        </div>

                                        {/* Card Action */}
                                        <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditPlanModal(p)}
                                                style={{
                                                    width: "100%",
                                                    background: "var(--surface-sunken, #f3f6f7)",
                                                    border: "1px solid var(--border-color)",
                                                    color: "var(--text-main)",
                                                    borderRadius: "12px",
                                                    padding: "0.75rem",
                                                    fontSize: "0.9rem",
                                                    fontWeight: "600",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: "0.5rem",
                                                    transition: "all 0.2s"
                                                }}
                                                className="config-btn"
                                            >
                                                <CreditCard size={16} />
                                                Configurer l'offre
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modal "Gérer l'abonnement" */}
            <AdminModal
                open={modalOpen}
                title={`Modifier l'abonnement : ${selectedUser?.companyName || selectedUser?.firstname}`}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSaveSubscription} style={{ display: "grid", gap: "1.25rem", marginTop: "1rem" }}>
                    
                    <div style={{ background: "#f8fafb", padding: "1rem", borderRadius: "16px", border: "1px solid #e2eaea", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <div><strong style={{ color: "var(--text-main)" }}>Professionnel :</strong> {selectedUser?.firstname} {selectedUser?.lastname}</div>
                        <div><strong style={{ color: "var(--text-main)" }}>Email :</strong> {selectedUser?.email}</div>
                        <div><strong style={{ color: "var(--text-main)" }}>SIRET :</strong> {selectedUser?.siret}</div>
                    </div>

                    <label style={labelStyle}>
                        Formule d&apos;abonnement
                        <select
                            style={fieldStyle}
                            value={formData.subscriptionType}
                            onChange={(e) => setFormData(prev => ({ ...prev, subscriptionType: e.target.value }))}
                        >
                            <option value="decouverte">Découverte (0 €/mois - Inclus par défaut)</option>
                            <option value="pro_essentiel">Pro Essentiel (15 €/mois)</option>
                            <option value="premium_atelier">Premium Atelier (30 €/mois)</option>
                        </select>
                    </label>

                    <label style={labelStyle}>
                        Date de début de l&apos;abonnement
                        <input
                            type="date"
                            style={fieldStyle}
                            value={formData.subscriptionStart}
                            onChange={(e) => setFormData(prev => ({ ...prev, subscriptionStart: e.target.value }))}
                        />
                    </label>

                    <label style={labelStyle}>
                        Statut du compte
                        <select
                            style={fieldStyle}
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="active">Actif (Accès autorisé)</option>
                            <option value="pending">En attente (Validation requise)</option>
                            <option value="suspended">Suspendu (Accès bloqué)</option>
                        </select>
                    </label>

                    {modalError && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "var(--state-critical)", background: "#fef2f2", padding: "0.75rem", borderRadius: "12px", border: "1px solid #fecaca", fontSize: "0.85rem" }}>
                            <ShieldAlert size={16} />
                            <span>{modalError}</span>
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                        <button
                            type="button"
                            className="action-btn"
                            onClick={() => setModalOpen(false)}
                            disabled={modalSaving}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="action-btn primary"
                            disabled={modalSaving}
                            style={{ opacity: modalSaving ? 0.7 : 1 }}
                        >
                            {modalSaving ? "Enregistrement..." : "Enregistrer"}
                        </button>
                    </div>
                </form>
            </AdminModal>

            {/* Modal "Modifier l'offre d'abonnement" */}
            <AdminModal
                open={editModalOpen}
                title={`Configurer l'offre : ${editFormData.name}`}
                onClose={() => setEditModalOpen(false)}
            >
                <form onSubmit={handleSavePlan} style={{ display: "grid", gap: "1.25rem", marginTop: "1rem" }}>
                    
                    <label style={labelStyle}>
                        Nom de l'offre
                        <input
                            type="text"
                            style={fieldStyle}
                            value={editFormData.name}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </label>

                    <label style={labelStyle}>
                        Tarif mensuel (en €)
                        <input
                            type="number"
                            min="0"
                            style={fieldStyle}
                            value={editFormData.price_euro}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, price_euro: parseInt(e.target.value) || 0 }))}
                            required
                        />
                    </label>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <span style={labelStyle}>Fonctionnalités incluses</span>
                        <div style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "0.25rem" }}>
                            {editFormData.features.map((feat, index) => (
                                <div key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                                    <input
                                        type="text"
                                        placeholder="Ex: Assistance VIP 7j/7"
                                        style={{ ...fieldStyle, flex: 1 }}
                                        value={feat}
                                        onChange={(e) => {
                                            const newFeats = [...editFormData.features];
                                            newFeats[index] = e.target.value;
                                            setEditFormData(prev => ({ ...prev, features: newFeats }));
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newFeats = editFormData.features.filter((_, idx) => idx !== index);
                                            setEditFormData(prev => ({ ...prev, features: newFeats }));
                                        }}
                                        style={{
                                            border: "1px solid #fee2e2",
                                            background: "#fef2f2",
                                            color: "#ef4444",
                                            borderRadius: "12px",
                                            padding: "0.6rem",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                        title="Supprimer cette ligne"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setEditFormData(prev => ({ ...prev, features: [...prev.features, ""] }))}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.4rem",
                                border: "1px dashed var(--border-color)",
                                background: "rgba(0,0,0,0.02)",
                                borderRadius: "12px",
                                padding: "0.6rem",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "0.85rem",
                                color: "var(--text-main)",
                                marginTop: "0.25rem"
                            }}
                        >
                            <Plus size={16} />
                            Ajouter une fonctionnalité
                        </button>
                    </div>

                    {editError && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "var(--state-critical)", background: "#fef2f2", padding: "0.75rem", borderRadius: "12px", border: "1px solid #fecaca", fontSize: "0.85rem" }}>
                            <ShieldAlert size={16} />
                            <span>{editError}</span>
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                        <button
                            type="button"
                            className="action-btn"
                            onClick={() => setEditModalOpen(false)}
                            disabled={editSaving}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="action-btn primary"
                            disabled={editSaving}
                            style={{ opacity: editSaving ? 0.7 : 1 }}
                        >
                            {editSaving ? "Enregistrement..." : "Enregistrer"}
                        </button>
                    </div>
                </form>
            </AdminModal>

            {/* Toast feedback */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        position: "fixed",
                        bottom: "2rem",
                        right: "2rem",
                        background: "var(--black, #151a1b)",
                        color: "white",
                        padding: "1rem 1.5rem",
                        borderRadius: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        zIndex: 9999,
                        maxWidth: "min(420px, calc(100vw - 2.5rem))",
                        animation: "toastSlide 0.3s ease-out"
                    }}
                >
                    <div style={{ background: "var(--green-leaf, #bbf7d0)", borderRadius: "50%", padding: "2px", display: "flex", flexShrink: 0 }}>
                        <Check size={16} color="var(--black, #151a1b)" />
                    </div>
                    <span style={{ fontWeight: 500, fontSize: "0.95rem", lineHeight: 1.35 }}>{toast.msg}</span>
                </div>
            )}

            <style jsx>{`
                .table-row-hover:hover {
                    background: var(--surface-hover) !important;
                }
                .loading-spinner {
                    width: 30px;
                    height: 30px;
                    border: 3px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes toastSlide {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
