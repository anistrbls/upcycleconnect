"use client";

import { useState } from "react";
import AdminModal from "../admin/AdminModal";
import { fieldStyle, labelStyle, pillInputStyle } from "../../lib/styles";

const CONTENT_TYPES = ["conseil", "actualite"];
const CONTENT_STATUSES = ["brouillon", "publie", "archive"];

const STATUS_COLORS = {
    brouillon: "#E6EDEE",
    en_attente: "#FFF3E0",
    publie: "#E5FFBC",
    archive: "#F0F0F0",
};

export default function SalarieContenuView({ contents = [], loading, errorMessage, type, onCreate, onUpdate, onDelete }) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");
    const [query, setQuery] = useState("");
    const [formState, setFormState] = useState({ title: "", body: "", status: "brouillon" });

    const filtered = contents.filter(c => {
        const q = query.trim().toLowerCase();
        return (!q || c.title.toLowerCase().includes(q)) && c.type === type;
    });

    const resetForm = () => {
        setEditingItem(null);
        setFormState({ title: "", body: "", status: "brouillon" });
        setLocalError("");
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormState({ title: item.title || "", body: item.body || "", status: item.status || "brouillon" });
        setFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        if (!formState.title.trim()) { setLocalError("Le titre est requis."); return; }
        if (!formState.body.trim()) { setLocalError("Le contenu est requis."); return; }
        setIsSaving(true);
        try {
            const payload = { title: formState.title.trim(), body: formState.body.trim(), status: formState.status, type };
            if (editingItem) { await onUpdate(editingItem.id, payload); } else { await onCreate(payload); }
            setFormOpen(false);
            resetForm();
        } catch (err) {
            setLocalError(String(err?.message || "Une erreur est survenue."));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Supprimer "${item.title}" ?`)) return;
        try { await onDelete(item.id); } catch (err) { window.alert(String(err?.message || "Impossible de supprimer.")); }
    };

    const sectionLabel = type === "conseil" ? "Conseils" : "Actualités";
    const createLabel = type === "conseil" ? "+ Nouveau conseil" : "+ Nouvelle actualité";

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Espace salarié — Contenu</span>
                    <h1>{sectionLabel}</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input type="text" placeholder="Rechercher…" value={query} onChange={e => setQuery(e.target.value)} style={{ flex: "1 1 200px", minWidth: 0, ...pillInputStyle }} />
                    <button className="action-cta task-action-btn" type="button" onClick={() => { resetForm(); setFormOpen(true); }}>{createLabel}</button>
                </div>
                {errorMessage && <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>}
            </div>

            <AdminModal open={formOpen} title={editingItem ? "Modifier" : createLabel.replace("+ ", "")} onClose={() => { setFormOpen(false); resetForm(); }}>
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>Titre<input type="text" value={formState.title} onChange={e => setFormState(p => ({ ...p, title: e.target.value }))} style={fieldStyle} required /></label>
                    <label style={labelStyle}>Contenu<textarea rows={6} value={formState.body} onChange={e => setFormState(p => ({ ...p, body: e.target.value }))} style={{ ...fieldStyle, resize: "vertical" }} required /></label>
                    <label style={labelStyle}>Statut<select value={formState.status} onChange={e => setFormState(p => ({ ...p, status: e.target.value }))} style={{ ...fieldStyle, appearance: "none" }}>{CONTENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>{isSaving ? "Enregistrement…" : editingItem ? "Mettre à jour" : "Publier"}</button>
                        <button className="action-cta" type="button" onClick={() => { setFormOpen(false); resetForm(); }} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>

            <div style={{ display: "grid", gap: "0.85rem" }}>
                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && filtered.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun contenu pour l'instant.</p>}
                {!loading && filtered.map(item => (
                    <div key={item.id} className="panel" style={{ display: "grid", gap: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: "0.92rem", fontWeight: 600 }}>{item.title}</h3>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", lineHeight: 1.5, maxHeight: "3rem", overflow: "hidden" }}>{item.body}</p>
                            </div>
                            <span className="db-badge" style={{ background: STATUS_COLORS[item.status] || "#E6EDEE", textTransform: "capitalize", flexShrink: 0 }}>{item.status}</span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                            <button className="action-cta task-action-btn" style={{ fontSize: "0.78rem", padding: "0.4rem 0.8rem" }} type="button" onClick={() => handleEdit(item)}>Modifier</button>
                            <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.4rem 0.8rem", background: "#FDE8E8", color: "#a23b3b" }} type="button" onClick={() => handleDelete(item)}>Supprimer</button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
