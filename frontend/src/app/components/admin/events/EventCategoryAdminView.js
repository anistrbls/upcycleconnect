"use client";

import { useState } from "react";
import AdminModal from "../AdminModal";
import { formatDateFR } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";

export default function EventCategoryAdminView({ categories, loading, errorMessage, onReload, onCreate, onUpdate, onDelete }) {
    const [query, setQuery] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formState, setFormState] = useState({ name: "", description: "", status: "actif" });
    const [localError, setLocalError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hoveredCategoryId, setHoveredCategoryId] = useState(null);

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
            setLocalError("Le nom de la categorie est requis.");
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
        const hasLinks = Number(item.linkedEvents || 0) > 0;
        const confirmationText = hasLinks
            ? `La categorie ${item.name} possede encore des evenements lies. La suppression est bloquee.`
            : `Supprimer la categorie ${item.name} ?`;

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
            window.alert(String(err?.message || "Impossible de supprimer la categorie."));
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Evenements</span>
                    <h1>Categories d'evenements</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher une categorie"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        style={{
                            flex: "1 1 260px",
                            minWidth: 0,
                            ...pillInputStyle,
                        }}
                    />
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                    <button className="action-cta task-action-btn" type="button" onClick={handleNew}>Ajouter une categorie</button>
                </div>
                {(errorMessage || localError) ? (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage || localError}</p>
                ) : null}
            </div>

            <AdminModal
                open={formOpen}
                title={editingCategory ? "Modifier une categorie" : "Creer une categorie"}
                onClose={() => {
                    setFormOpen(false);
                    resetForm();
                }}
            >
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Nom de la categorie
                        <input
                            type="text"
                            placeholder="Ex: Ateliers pratiques"
                            value={formState.name}
                            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                            style={fieldStyle}
                            required
                        />
                    </label>
                    <label style={labelStyle}>
                        Description
                        <textarea
                            placeholder="Description de la categorie"
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
                            {isSaving ? "Enregistrement..." : (editingCategory ? "Mettre a jour" : "Creer")}
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
                {!loading && visibleCategories.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucune categorie trouvee.</p> : null}
                {!loading && visibleCategories.map((item) => {
                    const isHovered = hoveredCategoryId === item.id;
                    return (
                        <article
                            key={item.id}
                            onMouseEnter={() => setHoveredCategoryId(item.id)}
                            onMouseLeave={() => setHoveredCategoryId(null)}
                            style={{
                                background: "var(--surface-hover)",
                                borderRadius: "20px",
                                padding: "1.25rem",
                                display: "grid",
                                gap: "0.85rem",
                                height: "100%",
                                minHeight: "240px",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600 }} data-i18n-user-content="true">{item.name}</h3>
                                <span className="db-badge" style={{ background: item.status === "actif" ? "#E5FFBC" : "#E6EDEE", textTransform: "capitalize" }}>
                                    {item.status}
                                </span>
                            </div>

                            <p
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.87rem",
                                    lineHeight: 1.5,
                                    minHeight: "2.7rem",
                                    maxHeight: "2.7rem",
                                    overflow: "hidden",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                }}
                            >
                                {item.description ? <span data-i18n-user-content="true">{item.description}</span> : "-"}
                            </p>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", fontSize: "0.78rem", alignItems: "center" }}>
                                <span style={{ background: "#cad6d8", color: "#233B3D", borderRadius: "999px", padding: "0.24rem 0.65rem", fontWeight: 600 }}>
                                    {item.linkedEvents || 0} événements liés
                                </span>
                            </div>

                            <div style={{ display: "grid", gap: "0.6rem", alignContent: "start" }}>
                                <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#1f3335", letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                    <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M8 2v4M16 2v4M3 10h18M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
                                        </svg>
                                    </span>
                                    <span>Diffusée le {formatDateFR(item.createdAt)}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: "auto", display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap" }}>
                                <button className="action-cta" type="button" onClick={() => handleEdit(item)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Modifier</button>
                                <button className="action-cta" type="button" onClick={() => handleDelete(item)} style={{ background: "#f4e8e8", color: "#8e2d2d" }}>Supprimer</button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
