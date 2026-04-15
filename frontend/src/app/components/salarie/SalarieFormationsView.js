"use client";

import { useState } from "react";
import AdminModal from "../admin/AdminModal";
import { EVENT_STATUSES } from "../../lib/constants";
import { formatDateTimeFR, toDateTimeInputValue } from "../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../lib/styles";

const STATUS_COLORS = {
    brouillon: "#E6EDEE",
    planifie: "#EAF4FF",
    valide: "#E5FFBC",
    annule: "#FDE8E8",
    termine: "#F0F0F0",
};

const VALIDATION_COLORS = {
    pending:  { bg: "#FFF3E0", color: "#A56A2A" },
    approved: { bg: "#E5FFBC", color: "#3A6A2A" },
    rejected: { bg: "#FDE8E8", color: "#B24A4A" },
};

const VALIDATION_LABELS = {
    pending:  "En attente de validation",
    approved: "Validé",
    rejected: "Refusé",
};

const SALARIE_STATUSES = ["brouillon", "planifie"];

export default function SalarieFormationsView({ events = [], loading, errorMessage, onCreate, onUpdate, onDelete, categories = [] }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");
    const [formState, setFormState] = useState({
        name: "",
        description: "",
        categoryId: "",
        dateDebut: "",
        dateFin: "",
        lieu: "",
        capacite: "",
        status: "brouillon",
    });

    const myEvents = events.filter(e => {
        const q = query.trim().toLowerCase();
        const matchQ = !q || e.name.toLowerCase().includes(q) || (e.lieu || "").toLowerCase().includes(q);
        const matchS = statusFilter === "all" || e.status === statusFilter;
        return matchQ && matchS;
    });

    const resetForm = () => {
        setEditingEvent(null);
        setFormState({ name: "", description: "", categoryId: categories[0] ? String(categories[0].id) : "", dateDebut: "", dateFin: "", lieu: "", capacite: "", status: "brouillon" });
        setLocalError("");
    };

    const handleEdit = (item) => {
        setEditingEvent(item);
        setFormState({
            name: item.name || "",
            description: item.description || "",
            categoryId: String(item.categoryId || ""),
            dateDebut: toDateTimeInputValue(item.dateDebut),
            dateFin: toDateTimeInputValue(item.dateFin),
            lieu: item.lieu || "",
            capacite: item.capacite == null ? "" : String(item.capacite),
            status: item.status || "brouillon",
        });
        setFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        if (!formState.name.trim()) { setLocalError("Le nom est requis."); return; }
        if (!formState.dateDebut || !formState.dateFin) { setLocalError("Les dates sont obligatoires."); return; }
        const startDate = new Date(formState.dateDebut);
        const endDate = new Date(formState.dateFin);
        if (!editingEvent && startDate <= new Date()) { setLocalError("La date de début doit être dans le futur."); return; }
        if (endDate < startDate) { setLocalError("La date de fin ne peut pas être avant la date de début."); return; }

        setIsSaving(true);
        try {
            const payload = {
                name: formState.name.trim(),
                description: formState.description.trim(),
                categoryId: Number(formState.categoryId) || null,
                type: "formation",
                dateDebut: startDate.toISOString(),
                dateFin: endDate.toISOString(),
                lieu: formState.lieu.trim(),
                capacite: formState.capacite.trim() === "" ? null : Number(formState.capacite),
                status: formState.status,
            };
            if (editingEvent) {
                await onUpdate(editingEvent.id, payload);
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
        if (!window.confirm(`Supprimer "${item.name}" ?`)) return;
        try { await onDelete(item.id); } catch (err) { window.alert(String(err?.message || "Impossible de supprimer.")); }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Espace salarié</span>
                    <h1>Formations & événements</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input type="text" placeholder="Rechercher…" value={query} onChange={e => setQuery(e.target.value)} style={{ flex: "1 1 200px", minWidth: 0, ...pillInputStyle }} />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...pillInputStyle, appearance: "none" }}>
                        <option value="all">Tous les statuts</option>
                        {SALARIE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={() => { resetForm(); setFormOpen(true); }}>+ Créer</button>
                </div>
                {(errorMessage || localError) && <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage || localError}</p>}
            </div>

            <AdminModal open={formOpen} title={editingEvent ? "Modifier" : "Créer une formation / un événement"} onClose={() => { setFormOpen(false); resetForm(); }}>
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>Nom<input type="text" value={formState.name} onChange={e => setFormState(p => ({ ...p, name: e.target.value }))} style={fieldStyle} required /></label>
                    <label style={labelStyle}>Description<textarea rows={3} value={formState.description} onChange={e => setFormState(p => ({ ...p, description: e.target.value }))} style={{ ...fieldStyle, resize: "vertical" }} /></label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
                        <label style={labelStyle}>Statut<select value={formState.status} onChange={e => setFormState(p => ({ ...p, status: e.target.value }))} style={{ ...fieldStyle, appearance: "none" }}>{SALARIE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
                        <label style={labelStyle}>Date début<input type="datetime-local" value={formState.dateDebut} min={!editingEvent ? new Date(Date.now() + 60000).toISOString().slice(0, 16) : undefined} onChange={e => setFormState(p => ({ ...p, dateDebut: e.target.value }))} style={fieldStyle} required /></label>
                        <label style={labelStyle}>Date fin<input type="datetime-local" value={formState.dateFin} min={formState.dateDebut || undefined} onChange={e => setFormState(p => ({ ...p, dateFin: e.target.value }))} style={fieldStyle} required /></label>
                        <label style={labelStyle}>Lieu<input type="text" value={formState.lieu} onChange={e => setFormState(p => ({ ...p, lieu: e.target.value }))} style={fieldStyle} /></label>
                        <label style={labelStyle}>Capacité<input type="number" min="0" value={formState.capacite} onChange={e => setFormState(p => ({ ...p, capacite: e.target.value }))} style={fieldStyle} /></label>
                    </div>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>{isSaving ? "Enregistrement…" : editingEvent ? "Mettre à jour" : "Créer"}</button>
                        <button className="action-cta" type="button" onClick={() => { setFormOpen(false); resetForm(); }} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>

            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1/-1" }}>Chargement…</p>}
                {!loading && myEvents.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1/-1" }}>Aucun résultat.</p>}
                {!loading && myEvents.map(item => {
                    const start = new Date(item.dateDebut);
                    const end = new Date(item.dateFin);
                    return (
                        <article key={item.id} style={{ background: "var(--surface-hover)", borderRadius: "20px", padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, flex: 1, minWidth: 0 }}>{item.name}</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end", flexShrink: 0 }}>
                                    {item.validationStatus && (
                                        <span className="db-badge" style={{ background: VALIDATION_COLORS[item.validationStatus]?.bg || "#E6EDEE", color: VALIDATION_COLORS[item.validationStatus]?.color }}>
                                            {VALIDATION_LABELS[item.validationStatus] || item.validationStatus}
                                        </span>
                                    )}
                                    <span className="db-badge" style={{ background: STATUS_COLORS[item.status] || "#E6EDEE", textTransform: "capitalize" }}>{item.status}</span>
                                </div>
                            </div>
                            {item.validationStatus === "rejected" && item.rejectionComment && (
                                <p style={{ fontSize: "0.78rem", color: "#B24A4A", background: "#FDE8E8", borderRadius: "10px", padding: "0.5rem 0.75rem", margin: 0, lineHeight: 1.5 }}>
                                    Motif de refus : {item.rejectionComment}
                                </p>
                            )}
                            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.5, maxHeight: "2.5rem", overflow: "hidden" }}>{item.description || "—"}</p>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "grid", gap: "0.2rem" }}>
                                <span>{Number.isNaN(start.getTime()) ? "—" : start.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                {item.lieu && <span>{item.lieu}</span>}
                                {item.capacite != null && <span>{item.capacite} places</span>}
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                                <button className="action-cta task-action-btn" style={{ fontSize: "0.78rem", padding: "0.4rem 0.8rem" }} type="button" onClick={() => handleEdit(item)}>Modifier</button>
                                <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.4rem 0.8rem", background: "#FDE8E8", color: "#a23b3b" }} type="button" onClick={() => handleDelete(item)}>Supprimer</button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
