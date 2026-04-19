"use client";

import { useEffect, useState } from "react";
import AdminModal from "../AdminModal";
import { EVENT_STATUSES, EVENT_TYPES } from "../../../lib/constants";
import { toDateTimeInputValue } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";
import { TOKEN_KEY, buildAuthHeaders } from "../../../lib/api";

const TYPE_LABELS = { atelier: "Atelier", formation: "Formation", evenement: "Événement", conference: "Conférence" };
const TYPE_COLORS = {
    atelier:    { bg: "#EAF4FF", color: "#2563EB" },
    formation:  { bg: "#F0FFF4", color: "#166534" },
    evenement:  { bg: "#FFF7ED", color: "#92400E" },
    conference: { bg: "#FAF5FF", color: "#6B21A8" },
};
const STATUS_COLORS = {
    brouillon: { bg: "#E6EDEE", color: "#444" },
    planifie:  { bg: "#EAF4FF", color: "#2563EB" },
    valide:    { bg: "#E5FFBC", color: "#166534" },
    annule:    { bg: "#FDE8E8", color: "#B24A4A" },
    termine:   { bg: "#F0F0F0", color: "#555" },
};
const VALIDATION_COLORS = {
    pending:  { bg: "#FFF3E0", color: "#A56A2A" },
    approved: { bg: "#E5FFBC", color: "#3A6A2A" },
    rejected: { bg: "#FDE8E8", color: "#B24A4A" },
};
const VALIDATION_LABELS = { pending: "En attente", approved: "Validé", rejected: "Refusé" };

const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
);
const IconPencil = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);

export default function EventAdminView({ events, categories, salaries = [], loading, errorMessage, onReload, onCreate, onUpdate, onDelete, onOpenEvent, pendingOpenEventId, onConsumedOpenEvent }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");

    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [participantsEvent, setParticipantsEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);

    const handleViewParticipants = async (item) => {
        setParticipantsEvent(item);
        setParticipantsLoading(true);
        setParticipantsOpen(true);
        try {
            const res = await fetch("/api/events/" + item.id + "/participants", { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setParticipants(data.items || []);
        } catch {
            setParticipants([]);
        } finally {
            setParticipantsLoading(false);
        }
    };

    const [formState, setFormState] = useState({
        name: "",
        description: "",
        type: "evenement",
        dateDebut: "",
        duree: "60",
        lieu: "",
        capaciteMax: "",
        status: "brouillon",
        intervenantId: "",
    });
    const visibleEvents = events.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryMatch = !normalizedQuery
            || item.name.toLowerCase().includes(normalizedQuery)
            || item.description.toLowerCase().includes(normalizedQuery)
            || item.lieu.toLowerCase().includes(normalizedQuery)
            || item.intervenant.toLowerCase().includes(normalizedQuery);
        const statusMatch = statusFilter === "all" || item.status === statusFilter;
        const typeMatch = typeFilter === "all" || item.type === typeFilter;
        return queryMatch && statusMatch && typeMatch;
    });

    const resetForm = () => {
        setEditingEvent(null);
        setFormState({
            name: "",
            description: "",
            type: "evenement",
            dateDebut: "",
            duree: "60",
            lieu: "",
            capaciteMax: "",
            status: "brouillon",
            intervenantId: "",
        });
        setLocalError("");
    };

    const handleCreate = () => {
        resetForm();
        setFormOpen(true);
    };

    const handleEdit = (item) => {
        setEditingEvent(item);
        setFormState({
            name: item.name || "",
            description: item.description || "",
            type: item.type || "evenement",
            dateDebut: toDateTimeInputValue(item.dateDebut),
            duree: (() => { const opts=[30,60,90,120,180,240,360,480]; const m=Math.round((new Date(item.dateFin)-new Date(item.dateDebut))/60000); return String(opts.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a,opts[0])); })(),
            lieu: item.lieu || "",
            capaciteMax: item.capacite == null ? (item.capaciteMax == null ? "" : String(item.capaciteMax)) : String(item.capacite),
            status: item.status || "brouillon",
            intervenantId: item.intervenantId != null ? String(item.intervenantId) : "",
        });
        setLocalError("");
        setFormOpen(true);
    };

    useEffect(() => {
        if (!pendingOpenEventId) {
            return;
        }

        const target = events.find((item) => item.id === pendingOpenEventId);
        if (target) {
            setEditingEvent(target);
            setFormState({
                name: target.name || "",
                description: target.description || "",
                type: target.type || "evenement",
                dateDebut: toDateTimeInputValue(target.dateDebut),
                duree: (() => { const opts=[30,60,90,120,180,240,360,480]; const m=Math.round((new Date(target.dateFin)-new Date(target.dateDebut))/60000); return String(opts.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a,opts[0])); })(),
                lieu: target.lieu || "",
                capaciteMax: target.capacite == null ? (target.capaciteMax == null ? "" : String(target.capaciteMax)) : String(target.capacite),
                status: target.status || "brouillon",
                intervenantId: target.intervenantId != null ? String(target.intervenantId) : "",
            });
            setLocalError("");
            setFormOpen(true);
        }

        onConsumedOpenEvent();
    }, [pendingOpenEventId, events, onConsumedOpenEvent]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");

        if (!formState.name.trim()) {
            setLocalError("Le nom de l'événement est requis.");
            return;
        }


        if (!formState.dateDebut) {
            setLocalError("La date de début est obligatoire.");
            return;
        }

        const startDate = new Date(formState.dateDebut);
        const endDate = new Date(startDate.getTime() + Number(formState.duree) * 60000);
        if (Number.isNaN(startDate.getTime())) {
            setLocalError("Format de date invalide.");
            return;
        }
        if (!editingEvent && startDate <= new Date()) {
            setLocalError("La date de début doit être dans le futur.");
            return;
        }

        const capacity = formState.capaciteMax.trim() === "" ? null : Number(formState.capaciteMax);
        if (capacity != null && (Number.isNaN(capacity) || capacity < 0)) {
            setLocalError("La capacité doit être un nombre positif.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: formState.name.trim(),
                description: formState.description.trim(),
                type: formState.type,
                dateDebut: startDate.toISOString(),
                dateFin: endDate.toISOString(),
                lieu: formState.lieu.trim(),
                capacite: capacity,
                capaciteMax: capacity,
                status: formState.status,
                intervenantId: formState.intervenantId !== "" ? Number(formState.intervenantId) : null,
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
        if (!window.confirm(`Supprimer l'événement ${item.name} ?`)) {
            return;
        }
        try {
            await onDelete(item.id);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de supprimer l'événement."));
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Événements</span>
                    <h1>Tous les événements</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher un événement"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        style={{ flex: "1 1 220px", minWidth: 0, ...pillInputStyle }}
                    />
                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ ...pillInputStyle, appearance: "none" }}>
                        <option value="all">Tous les types</option>
                        {EVENT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ ...pillInputStyle, appearance: "none" }}>
                        <option value="all">Tous les statuts</option>
                        {EVENT_STATUSES.map((statusName) => <option key={statusName} value={statusName}>{statusName}</option>)}
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                    <button className="action-cta task-action-btn" type="button" onClick={handleCreate}>Ajouter un événement</button>
                </div>
                {(errorMessage || localError) ? (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage || localError}</p>
                ) : null}
            </div>

            <AdminModal
                open={formOpen}
                title={editingEvent ? "Modifier un événement" : "Créer un événement"}
                onClose={() => {
                    setFormOpen(false);
                    resetForm();
                }}
            >
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>Nom<input type="text" value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} style={fieldStyle} required /></label>
                    <label style={labelStyle}>Description<textarea rows={3} value={formState.description} onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))} style={{ ...fieldStyle, resize: "vertical" }} /></label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
                        <label style={labelStyle}>Type<select value={formState.type} onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))} style={{ ...fieldStyle, appearance: "none" }}>{EVENT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}</select></label>
                        <label style={labelStyle}>Statut<select value={formState.status} onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))} style={{ ...fieldStyle, appearance: "none" }}>{EVENT_STATUSES.map((statusName) => <option key={statusName} value={statusName}>{statusName}</option>)}</select></label>
                        <label style={labelStyle}>Date début<input type="datetime-local" value={formState.dateDebut} min={!editingEvent ? new Date(Date.now() + 60000).toISOString().slice(0, 16) : undefined} onChange={(event) => setFormState((prev) => ({ ...prev, dateDebut: event.target.value }))} style={fieldStyle} required /></label>
                        <label style={labelStyle}>Durée<select value={formState.duree} onChange={(event) => setFormState((prev) => ({ ...prev, duree: event.target.value }))} style={{ ...fieldStyle, appearance: "none" }} required><option value="30">30 min</option><option value="60">1h</option><option value="90">1h30</option><option value="120">2h</option><option value="180">3h</option><option value="240">4h</option><option value="360">6h</option><option value="480">8h</option></select></label>
                        <label style={labelStyle}>Lieu<input type="text" value={formState.lieu} onChange={(event) => setFormState((prev) => ({ ...prev, lieu: event.target.value }))} style={fieldStyle} /></label>
                        <label style={labelStyle}>Intervenant (salarié)<select value={formState.intervenantId} onChange={(event) => setFormState((prev) => ({ ...prev, intervenantId: event.target.value }))} style={{ ...fieldStyle, appearance: "none" }}><option value="">— Aucun —</option>{salaries.map((s) => <option key={s.id} value={String(s.id)}>{s.firstname} {s.lastname}</option>)}</select></label>
                        <label style={labelStyle}>Places max<input type="number" min="0" value={formState.capaciteMax} onChange={(event) => setFormState((prev) => ({ ...prev, capaciteMax: event.target.value }))} style={fieldStyle} /></label>
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>{isSaving ? "Enregistrement..." : (editingEvent ? "Mettre à jour" : "Créer")}</button>
                        <button className="action-cta" type="button" onClick={() => { setFormOpen(false); resetForm(); }} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>

            <AdminModal
                open={participantsOpen}
                title={("Participants — ") + (participantsEvent ? participantsEvent.name : "")}
                onClose={() => { setParticipantsOpen(false); setParticipants([]); }}
            >
                {participantsLoading ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>
                ) : participants.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun participant inscrit.</p>
                ) : (
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 0.25rem 0" }}>{participants.length} participant{participants.length > 1 ? "s" : ""}</p>
                        {participants.map((p) => (
                            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--surface-hover)", borderRadius: "12px", fontSize: "0.82rem", gap: "0.5rem", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 600 }}>{p.firstname} {p.lastname}</span>
                                <span style={{ color: "var(--text-muted)" }}>{p.email}</span>
                                <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: p.paymentStatus === "paid" ? "#E5FFBC" : p.paymentStatus === "pending" ? "#FFF3E0" : "#E6EDEE", color: p.paymentStatus === "paid" ? "#166534" : p.paymentStatus === "pending" ? "#A56A2A" : "#555" }}>{p.paymentStatus === "paid" ? "Payé" : p.paymentStatus === "pending" ? "En attente" : "Gratuit"}</span>
                                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{new Date(p.registeredAt).toLocaleDateString("fr-FR")}</span>
                            </div>
                        ))}
                    </div>
                )}
            </AdminModal>

            <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                {loading ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Chargement...</p> : null}
                {!loading && visibleEvents.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucun événement trouvé.</p> : null}
                {!loading && visibleEvents.map((item) => {
                    const start = new Date(item.dateDebut);
                    const tc = TYPE_COLORS[item.type] || { bg: "#E6EDEE", color: "#444" };
                    const isFull = item.capacite != null && item.capacite > 0 && (item.participantCount ?? 0) >= item.capacite;
                    const vBadge = item.validationStatus === "approved"
                        ? { bg: "rgba(50,200,100,0.15)", color: "#E5FFBC", border: "rgba(50,200,100,0.3)" }
                        : item.validationStatus === "rejected"
                        ? { bg: "rgba(220,60,60,0.18)", color: "#ff8080", border: "rgba(220,60,60,0.3)" }
                        : { bg: "rgba(255,255,255,0.12)", color: "#EAF5F4", border: "rgba(255,255,255,0.22)" };
                    return (
                        <article key={item.id} style={{ position: "relative", borderRadius: "28px", overflow: "hidden", height: "400px", background: item.imageUrl ? "#111" : tc.bg, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
                            {item.imageUrl ? (
                                <>
                                    <img src={item.imageUrl} alt={item.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                                    <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", pointerEvents: "none" }} />
                                </>
                            ) : null}
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.6) 38%, rgba(5,10,5,0.1) 62%, transparent 78%)", pointerEvents: "none" }} />

                            {/* Badge status haut gauche */}
                            <div style={{ position: "absolute", top: "14px", left: "14px", zIndex: 2 }}>
                                <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(255,255,255,0.15)", color: "white", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    {item.status}
                                </div>
                            </div>

                            {/* Badges haut droite */}
                            <div style={{ position: "absolute", top: "14px", right: "14px", display: "flex", gap: "0.4rem", zIndex: 2, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                {isFull && (
                                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(220,38,38,0.75)", color: "#fff", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.22)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                        Complet
                                    </div>
                                )}
                                {item.validationStatus && (
                                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: vBadge.bg, color: vBadge.color, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: `1px solid ${vBadge.border}`, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                        {VALIDATION_LABELS[item.validationStatus] || item.validationStatus}
                                    </div>
                                )}
                            </div>

                            {/* Overlay bas */}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem", zIndex: 2 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3, flex: 1 }}>{item.name}</h3>
                                    <div style={{ padding: "5px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.88rem", fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", whiteSpace: "nowrap", flexShrink: 0 }}>
                                        {item.pricingType === "payant" && item.price > 0 ? `${Number(item.price).toLocaleString("fr-FR")} €` : "Gratuit"}
                                    </div>
                                </div>
                                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.5 }}>
                                    {!isNaN(start.getTime()) && start.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    {item.lieu && ` · ${item.lieu}`}
                                </p>
                                {item.intervenant && (
                                    <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>{item.intervenant}</p>
                                )}
                                {item.validationStatus === "rejected" && item.rejectionComment && (
                                    <p style={{ fontSize: "0.76rem", color: "#ff8080", margin: 0, lineHeight: 1.5 }}>{item.rejectionComment}</p>
                                )}
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                    <span style={{ padding: "4px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
                                        {TYPE_LABELS[item.type] || item.type}
                                    </span>
                                    {item.capacite != null && (
                                        <span style={{ padding: "4px 12px", borderRadius: "999px", background: isFull ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.12)", fontSize: "0.75rem", color: isFull ? "#fca5a5" : "rgba(255,255,255,0.85)", fontWeight: 500, border: isFull ? "1px solid rgba(220,38,38,0.4)" : "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
                                            {item.participantCount ?? 0}/{item.capacite} places
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <button type="button" onClick={() => handleEdit(item)} title="Modifier" style={{ padding: "9px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <IconPencil />
                                    </button>
                                    <button type="button" onClick={() => handleDelete(item)} title="Supprimer" style={{ padding: "9px", borderRadius: "50%", border: "1px solid rgba(220,60,60,0.35)", background: "rgba(220,60,60,0.15)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#ff8080", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <IconTrash />
                                    </button>
                                    <button type="button" onClick={() => handleViewParticipants(item)} style={{ flex: 1, padding: "0.72rem 0.75rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.12)", color: "white", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                        Participants
                                    </button>
                                    <button type="button" onClick={() => onOpenEvent(item)} style={{ flex: 1, padding: "0.72rem 1rem", borderRadius: "999px", border: "none", background: "white", color: "#111", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        Ouvrir
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
