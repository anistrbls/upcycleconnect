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

            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gridAutoRows: "1fr", alignItems: "stretch" }}>
                {loading ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Chargement...</p> : null}
                {!loading && visibleCategories.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucune catégorie trouvée.</p> : null}
                {!loading && visibleCategories.map((item) => (
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
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "center" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{item.name}</h3>
                            <span className="db-badge" style={{ background: item.status === "actif" ? "#E5FFBC" : "#E6EDEE" }}>
                                {item.status}
                            </span>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.87rem", lineHeight: 1.5 }}>{item.description || "-"}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", fontSize: "0.78rem", alignItems: "center" }}>
                            <span style={{ background: "#E5FFBC", color: "#233B3D", borderRadius: "999px", padding: "0.2rem 0.55rem", fontWeight: 600 }}>
                                {item.linkedServices || 0} liées
                            </span>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>
                                {formatDateFR(item.createdAt)}
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
                            <button className="action-cta" type="button" onClick={() => handleEdit(item)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Modifier</button>
                            <button className="action-cta" type="button" onClick={() => handleDelete(item)} style={{ background: "#f4e8e8", color: "#8e2d2d" }}>Supprimer</button>
                        </div>
                    </article>
                ))}
            </div>
        </>
    );
}
