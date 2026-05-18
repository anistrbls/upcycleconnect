"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminModal from "../AdminModal";
import ServiceFormView from "./ServiceFormView";
import { formatDateFR } from "../../../lib/formatters";
import { pillInputStyle } from "../../../lib/styles";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";

export default function ServiceAdminView({ services, categories, loading, errorMessage, onReload, onCreate, onUpdate, onDelete, onToggleStatus }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [hoveredServiceId, setHoveredServiceId] = useState(null);

    const hasCategories = categories.length > 0;

    const visibleServices = services.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryMatch = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery) || item.description.toLowerCase().includes(normalizedQuery);
        const statusMatch = statusFilter === "all" || item.status === statusFilter;
        const categoryMatch = categoryFilter === "all" || String(item.categoryId) === categoryFilter;
        return queryMatch && statusMatch && categoryMatch;
    });

    const handleNew = () => {
        if (!hasCategories) {
            window.alert("Aucune catégorie disponible. Créez une catégorie avant d'ajouter une prestation.");
            return;
        }
        router.push("/offres-prestations/ajouter");
    };

    const handleEdit = (item) => {
        setEditingService(item);
        setFormOpen(true);
    };

    const handleUpdateSubmit = async (payload) => {
        try {
            await onUpdate(editingService.id, payload);
            setFormOpen(false);
            setEditingService(null);
        } catch (err) {
            window.alert(String(err?.message || "Erreur lors de la mise à jour."));
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Supprimer la prestation ${item.name} ?`)) {
            return;
        }

        try {
            await onDelete(item.id);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de supprimer la prestation."));
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Offres & prestations</span>
                    <h1>Prestations</h1>
                </div>
            </div>

            {!hasCategories ? (
                <div className="panel" style={{ marginBottom: "1rem" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Aucune catégorie n'existe encore. Créez d'abord une catégorie de prestations pour pouvoir ajouter une prestation.
                    </p>
                </div>
            ) : null}

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher une prestation"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        style={{ flex: "1 1 220px", minWidth: 0, ...pillInputStyle }}
                    />
                    <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Toutes les catégories</option>
                        {categories.map((item) => (
                            <option key={item.id} value={String(item.id)}>{item.name}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="actif">actif</option>
                        <option value="inactif">inactif</option>
                        <option value="brouillon">brouillon</option>
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                    <button className="action-cta task-action-btn" type="button" onClick={handleNew}>Ajouter une prestation</button>
                </div>
                {errorMessage && (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>
                )}
            </div>

            <AdminModal
                open={formOpen}
                title="Modifier une prestation"
                onClose={() => {
                    setFormOpen(false);
                    setEditingService(null);
                }}
            >
                {editingService && (
                    <ServiceFormView
                        categories={categories}
                        initialData={{
                            ...editingService,
                            price: String(editingService.price || 0),
                            durationMinutes: String(editingService.durationMinutes || 60),
                            categoryId: String(editingService.categoryId),
                        }}
                        onSubmit={handleUpdateSubmit}
                        onCancel={() => {
                            setFormOpen(false);
                            setEditingService(null);
                        }}
                    />
                )}
            </AdminModal>

            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gridAutoRows: "1fr", alignItems: "stretch" }}>
                {loading ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Chargement...</p> : null}
                {!loading && visibleServices.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucune prestation trouvée.</p> : null}
                {!loading && visibleServices.map((item) => {
                    const isHovered = hoveredServiceId === item.id;
                    return (
                        <article
                            key={item.id}
                            onMouseEnter={() => setHoveredServiceId(item.id)}
                            onMouseLeave={() => setHoveredServiceId(null)}
                            style={{
                                background: "var(--surface-hover)",
                                borderRadius: "20px",
                                padding: "1.25rem",
                                display: "grid",
                                gap: "0.85rem",
                                height: "100%",
                                minHeight: "340px",
                            }}
                        >
                            {item.imageUrl && (
                                <div style={{ width: "100%", height: "140px", borderRadius: "12px", overflow: "hidden", marginBottom: "0.5rem", background: "#111" }}>
                                    {previewLooksLikeVideo(item.imageUrl) ? (
                                        <video src={item.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
                                    ) : (
                                        <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    )}
                                </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{item.name}</h3>
                                <span className="db-badge" style={{ background: item.status === "actif" ? "#E5FFBC" : "#E6EDEE", textTransform: "capitalize" }}>
                                    {item.status}
                                </span>
                            </div>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.87rem", lineHeight: 1.5, minHeight: "2.6rem", maxHeight: "2.6rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                {item.shortDescription || item.description || "-"}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", fontSize: "0.78rem", alignItems: "center" }}>
                                <span style={{ background: "#cad6d8", color: "#233B3D", borderRadius: "999px", padding: "0.24rem 0.65rem", fontWeight: 600 }}>
                                    {item.categoryName || "Sans catégorie"}
                                </span>
                                <span style={{ background: "#E8ECEE", color: "#2B4548", borderRadius: "999px", padding: "0.24rem 0.65rem", fontWeight: 600 }}>
                                    {item.durationMinutes} min
                                </span>
                                <span style={{ background: "#F1F5F9", color: "#334155", borderRadius: "999px", padding: "0.24rem 0.65rem", fontWeight: 600 }}>
                                    Cible: {item.targetAudience}
                                </span>
                            </div>
                            <div style={{ display: "grid", gap: "0.6rem", alignContent: "start" }}>
                                {!isHovered ? (
                                    <>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.96rem", color: "#1f3335", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                            </span>
                                            <span style={{ fontWeight: 700, fontSize: "1rem" }}>{Number(item.price || 0).toFixed(2)} €</span>
                                        </div>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#1f3335", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                            </span>
                                            <span style={{ textTransform: "capitalize" }}>
                                                {item.bookingMode === "booking" ? "Réservation" : "Demande"}
                                            </span>
                                        </div>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#2b4548", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            </span>
                                            <span>{formatDateFR(item.createdAt)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335" }}>
                                                {item.bookingMode === "booking" ? "Réservable en ligne" : "Demande simple"}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.categoryName || "Sans catégorie"}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335" }}>Créé le {formatDateFR(item.createdAt)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div style={{ marginTop: "auto", display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap" }}>
                                <button className="action-cta" type="button" onClick={() => handleEdit(item)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Modifier</button>
                                {onToggleStatus && item.status !== "actif" && (
                                    <button className="action-cta" type="button" onClick={() => onToggleStatus(item.id, "actif")} style={{ background: "#E5FFBC", color: "#233B3D" }}>Activer</button>
                                )}
                                {onToggleStatus && item.status === "actif" && (
                                    <button className="action-cta" type="button" onClick={() => onToggleStatus(item.id, "inactif")} style={{ background: "#EAF0F1", color: "#4F6163" }}>Désactiver</button>
                                )}
                                <button className="action-cta" type="button" onClick={() => handleDelete(item)} style={{ background: "#f4e8e8", color: "#8e2d2d" }}>Supprimer</button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
