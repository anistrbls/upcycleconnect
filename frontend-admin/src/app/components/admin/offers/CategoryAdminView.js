"use client";

import { useState } from "react";
import AdminModal from "../AdminModal";
import { formatDateFR } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";

export default function CategoryAdminView({ categories, loading, errorMessage, onReload, onCreate, onUpdate, onDelete }) {
    const [query, setQuery] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formState, setFormState] = useState({ name: "", description: "", status: "actif" });
    const [localError, setLocalError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const visibleCategories = categories.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return true;
        }
        return item.name.toLowerCase().includes(normalizedQuery) || item.description.toLowerCase().includes(normalizedQuery);
    });

    const resetForm = () => {
        setEditingCategory(null);
        setFormState({ name: "", description: "", status: "actif" });
        setLocalError("");
    };

    const handleNew = () => {
        resetForm();
        setFormOpen(true);
    };

    const handleEdit = (item) => {
        setEditingCategory(item);
        setFormState({
            name: item.name || "",
            description: item.description || "",
            status: item.status || "actif",
        });
        setLocalError("");
        setFormOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");

        if (!formState.name.trim()) {
            setLocalError("Le nom de la catégorie est requis.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: formState.name.trim(),
                description: formState.description.trim(),
                status: formState.status,
            };

            if (editingCategory) {
                await onUpdate(editingCategory.id, payload);
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
        const hasLinks = Number(item.linkedServices || 0) > 0;
        const confirmationText = hasLinks
            ? `La catégorie ${item.name} possède encore des prestations liées. La suppression est bloquée.`
            : `Supprimer la catégorie ${item.name} ?`;

        if (hasLinks) {
            window.alert(confirmationText);
            return;
        }

        if (!window.confirm(confirmationText)) {
            return;
        }

        try {
            await onDelete(item.id);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de supprimer la catégorie."));
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Offres & prestations</span>
                    <h1>Catégories de prestations</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher une catégorie"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        style={{
                            flex: "1 1 260px",
                            minWidth: 0,
                            ...pillInputStyle,
                        }}
                    />
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                    <button className="action-cta task-action-btn" type="button" onClick={handleNew}>Ajouter une catégorie</button>
                </div>
                {(errorMessage || localError) ? (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage || localError}</p>
                ) : null}
            </div>

            <AdminModal
                open={formOpen}
                title={editingCategory ? "Modifier une catégorie" : "Créer une catégorie"}
                onClose={() => {
                    setFormOpen(false);
                    resetForm();
                }}
            >
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Nom de la catégorie
                        <input
                            type="text"
                            placeholder="Ex: Atelier textile"
                            value={formState.name}
                            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                            style={fieldStyle}
                            required
                        />
                    </label>
                    <label style={labelStyle}>
                        Description
                        <textarea
                            placeholder="Description de la catégorie"
                            value={formState.description}
                            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                            rows={3}
                            style={{ ...fieldStyle, resize: "vertical" }}
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
                        </select>
                    </label>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>
                            {isSaving ? "Enregistrement..." : (editingCategory ? "Mettre à jour" : "Créer")}
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

            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gridAutoRows: "1fr", alignItems: "stretch" }}>
                {loading ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Chargement...</p> : null}
                {!loading && visibleCategories.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucune catégorie trouvée.</p> : null}
                {!loading && visibleCategories.map((item) => (
                    <article
                        key={item.id}
                        style={{
                            background: "var(--surface-hover)",
                            borderRadius: "20px",
                            padding: "1.25rem",
                            display: "grid",
                            gap: "0.85rem",
                            height: "100%",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{item.name}</h3>
                            <span className="db-badge" style={{ background: item.status === "actif" ? "#E5FFBC" : "#E6EDEE" }}>
                                {item.status}
                            </span>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.87rem", lineHeight: 1.5, minHeight: "2.6rem", maxHeight: "2.6rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {item.description || "-"}
                        </p>
                        <div style={{ display: "grid", gap: "0.6rem" }}>
                            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#1f3335", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </span>
                                <span>{item.linkedServices || 0} prestation{Number(item.linkedServices || 0) !== 1 ? "s" : ""} liée{Number(item.linkedServices || 0) !== 1 ? "s" : ""}</span>
                            </div>
                            <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#2b4548", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                </span>
                                <span>{formatDateFR(item.createdAt)}</span>
                            </div>
                        </div>
                        <div style={{ marginTop: "auto", display: "flex", gap: "0.55rem", alignItems: "center" }}>
                            <button className="action-cta" type="button" onClick={() => handleEdit(item)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Modifier</button>
                            <button className="action-cta" type="button" onClick={() => handleDelete(item)} style={{ background: "#f4e8e8", color: "#8e2d2d" }}>Supprimer</button>
                        </div>
                    </article>
                ))}
            </div>
        </>
    );
}
