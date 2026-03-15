"use client";

import { useState } from "react";
import AdminModal from "../AdminModal";
import { formatDateFR } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";

export default function ServiceAdminView({ services, categories, loading, errorMessage, onReload, onCreate, onUpdate, onDelete }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [formState, setFormState] = useState({
        name: "",
        description: "",
        categoryId: "",
        type: "service",
        price: "0",
        status: "brouillon",
    });
    const [localError, setLocalError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const hasCategories = categories.length > 0;

    const visibleServices = services.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryMatch = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery) || item.description.toLowerCase().includes(normalizedQuery);
        const statusMatch = statusFilter === "all" || item.status === statusFilter;
        const categoryMatch = categoryFilter === "all" || String(item.categoryId) === categoryFilter;
        return queryMatch && statusMatch && categoryMatch;
    });

    const resetForm = () => {
        setEditingService(null);
        setFormState({
            name: "",
            description: "",
            categoryId: categories[0] ? String(categories[0].id) : "",
            type: "service",
            price: "0",
            status: "brouillon",
        });
        setLocalError("");
    };

    const handleNew = () => {
        if (!hasCategories) {
            window.alert("Aucune catégorie disponible. Créez une catégorie avant d'ajouter une prestation.");
            return;
        }
        resetForm();
        setFormOpen(true);
    };

    const handleEdit = (item) => {
        setEditingService(item);
        setFormState({
            name: item.name || "",
            description: item.description || "",
            categoryId: String(item.categoryId),
            type: item.type || "service",
            price: String(item.price ?? 0),
            status: item.status || "brouillon",
        });
        setLocalError("");
        setFormOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");

        if (!formState.name.trim()) {
            setLocalError("Le nom de la prestation est requis.");
            return;
        }

        if (!formState.categoryId) {
            setLocalError("Une catégorie est obligatoire.");
            return;
        }

        const parsedPrice = Number(formState.price);
        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
            setLocalError("Le prix doit être un nombre positif.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: formState.name.trim(),
                description: formState.description.trim(),
                categoryId: Number(formState.categoryId),
                type: formState.type,
                price: parsedPrice,
                status: formState.status,
            };

            if (editingService) {
                await onUpdate(editingService.id, payload);
            } else {
                await onCreate(payload);
            }

            setFormOpen(false);
            resetForm();
        } catch (err) {
            setLocalError(String(err?.message || "Une erreur est survenue."));
        } finally {
            setIsSaving(false);
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
                {(errorMessage || localError) ? (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage || localError}</p>
                ) : null}
            </div>

            <AdminModal
                open={formOpen}
                title={editingService ? "Modifier une prestation" : "Créer une prestation"}
                onClose={() => {
                    setFormOpen(false);
                    resetForm();
                }}
            >
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Nom de la prestation
                        <input
                            type="text"
                            placeholder="Ex: Atelier couture"
                            value={formState.name}
                            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                            style={fieldStyle}
                            required
                        />
                    </label>
                    <label style={labelStyle}>
                        Description
                        <textarea
                            placeholder="Description de la prestation"
                            value={formState.description}
                            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                            rows={3}
                            style={{ ...fieldStyle, resize: "vertical" }}
                        />
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
                        <label style={labelStyle}>
                            Catégorie
                            <select
                                value={formState.categoryId}
                                onChange={(event) => setFormState((prev) => ({ ...prev, categoryId: event.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                                required
                            >
                                <option value="">Choisir une catégorie</option>
                                {categories.map((item) => (
                                    <option key={item.id} value={String(item.id)}>{item.name}</option>
                                ))}
                            </select>
                        </label>
                        <label style={labelStyle}>
                            Type
                            <select
                                value={formState.type}
                                onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                            >
                                <option value="service">service</option>
                                <option value="atelier">atelier</option>
                                <option value="formation">formation</option>
                                <option value="evenement">événement</option>
                            </select>
                        </label>
                        <label style={labelStyle}>
                            Prix (€)
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formState.price}
                                onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
                                style={fieldStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            Statut
                            <select
                                value={formState.status}
                                onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                            >
                                <option value="actif">actif</option>
                                <option value="inactif">inactif</option>
                                <option value="brouillon">brouillon</option>
                            </select>
                        </label>
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>
                            {isSaving ? "Enregistrement..." : (editingService ? "Mettre à jour" : "Créer")}
                        </button>
                        <button
                            className="action-cta"
                            type="button"
                            onClick={() => {
                                setFormOpen(false);
                                resetForm();
                            }}
                            style={{ background: "#e8ecee", color: "var(--text-main)" }}
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            </AdminModal>

            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gridAutoRows: "1fr", alignItems: "stretch" }}>
                {loading ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Chargement...</p> : null}
                {!loading && visibleServices.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucune prestation trouvée.</p> : null}
                {!loading && visibleServices.map((item) => (
                    <article
                        key={item.id}
                        style={{
                            background: "#F1F6F6",
                            borderRadius: "18px",
                            padding: "1.25rem",
                            display: "grid",
                            gap: "0.85rem",
                            height: "100%",
                            minHeight: "280px",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{item.name}</h3>
                            <div style={{ display: "grid", gap: "0.35rem", justifyItems: "end" }}>
                                <span className="db-badge" style={{ background: item.status === "actif" ? "#E5FFBC" : "#E6EDEE" }}>
                                    {item.status}
                                </span>
                                <span className="db-badge" style={{ background: item.status === "actif" ? "#E5FFBC" : "#E6EDEE", textTransform: "capitalize" }}>
                                    {item.type}
                                </span>
                            </div>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.87rem", lineHeight: 1.5 }}>{item.description || "-"}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", fontSize: "0.78rem", alignItems: "center" }}>
                            <span style={{ background: "#CAD6D8", color: "#233B3D", borderRadius: "999px", padding: "0.2rem 0.55rem", fontWeight: 600 }}>
                                {item.categoryName}
                            </span>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>
                                {formatDateFR(item.createdAt)}
                            </span>
                        </div>
                        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.7rem" }}>
                            <div style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
                                <button className="action-cta" type="button" onClick={() => handleEdit(item)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Modifier</button>
                                <button className="action-cta" type="button" onClick={() => handleDelete(item)} style={{ background: "#f4e8e8", color: "#8e2d2d" }}>Supprimer</button>
                            </div>
                            <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2F4F53", whiteSpace: "nowrap" }}>
                                {Number(item.price || 0).toFixed(2)} €
                            </span>
                        </div>
                    </article>
                ))}
            </div>
        </>
    );
}
