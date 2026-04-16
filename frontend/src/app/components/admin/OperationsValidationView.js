"use client";

import { useState } from "react";
import AdminModal from "./AdminModal";
import { fieldStyle, labelStyle, pillInputStyle } from "../../lib/styles";
import { formatDateFR } from "../../lib/formatters";

const TABS = [
    { key: "conseils", label: "Conseils" },
    { key: "evenements", label: "Événements" },
];

// ─── Onglet Conseils ──────────────────────────────────────────────────────────

function ConseilsValidation({ contents, loading, errorMessage, onReload, onValidate, onReject }) {
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = contents.filter((c) => {
        const q = query.trim().toLowerCase();
        return (
            c.status === "en_attente" &&
            (!q || c.title.toLowerCase().includes(q) || (c.authorName || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (item) => {
        if (!window.confirm(`Publier "${item.title}" ?`)) return;
        try { await onValidate(item.id); } catch (err) { window.alert(String(err?.message || "Impossible de valider.")); }
    };

    const openReject = (item) => { setRejectTarget(item); setRejectComment(""); setLocalError(""); };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        setIsSubmitting(true);
        try {
            await onReject(rejectTarget.id, rejectComment.trim());
            setRejectTarget(null);
        } catch (err) {
            setLocalError(String(err?.message || "Impossible de refuser."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Rechercher un conseil ou un auteur…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Conseils en attente</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun conseil en attente de validation.</p>
                )}
                {!loading && pending.map((item) => (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start", padding: "1rem 0", borderBottom: "1px solid #EAF0F1" }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.title}</span>
                                {item.authorName && (
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>par {item.authorName}</span>
                                )}
                            </div>
                            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, maxHeight: "3rem", overflow: "hidden" }}>{item.body}</p>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, paddingTop: "0.15rem" }}>
                            <button className="action-cta task-action-btn" style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem" }} type="button" onClick={() => handleValidate(item)}>Publier</button>
                            <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", background: "#FDE8E8", color: "#a23b3b" }} type="button" onClick={() => openReject(item)}>Refuser</button>
                        </div>
                    </div>
                ))}
            </div>

            <AdminModal open={!!rejectTarget} title={`Refuser : ${rejectTarget?.title || ""}`} onClose={() => setRejectTarget(null)}>
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Précisez la raison pour informer le salarié…" style={{ ...fieldStyle, resize: "vertical" }} />
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="action-cta" style={{ background: "#FDE8E8", color: "#a23b3b" }} type="submit" disabled={isSubmitting}>{isSubmitting ? "Refus…" : "Confirmer le refus"}</button>
                        <button className="action-cta" type="button" onClick={() => setRejectTarget(null)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}

// ─── Onglet Événements ────────────────────────────────────────────────────────

function EvenementsValidation({ events, loading, errorMessage, onReload, onValidate, onReject }) {
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = events.filter((e) => {
        const q = query.trim().toLowerCase();
        return (
            e.validationStatus === "pending" &&
            (!q || e.name.toLowerCase().includes(q) || (e.intervenant || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (event) => {
        if (!window.confirm(`Valider l'événement "${event.name}" ?`)) return;
        try { await onValidate(event.id); } catch (err) { window.alert(String(err?.message || "Impossible de valider.")); }
    };

    const openReject = (event) => { setRejectTarget(event); setRejectComment(""); setLocalError(""); };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        setIsSubmitting(true);
        try {
            await onReject(rejectTarget.id, rejectComment.trim());
            setRejectTarget(null);
        } catch (err) {
            setLocalError(String(err?.message || "Impossible de refuser."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Rechercher un événement…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Événements en attente</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun événement en attente de validation.</p>
                )}
                {!loading && pending.map((event) => (
                    <div key={event.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start", padding: "1rem 0", borderBottom: "1px solid #EAF0F1" }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{event.name}</span>
                                {event.intervenant && (
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>par {event.intervenant}</span>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                {event.dateDebut && <span>{formatDateFR(event.dateDebut)}</span>}
                                {event.lieu && <span>{event.lieu}</span>}
                                {event.type && <span className="db-badge" style={{ background: "#EAF4FF", textTransform: "capitalize" }}>{event.type}</span>}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, paddingTop: "0.15rem" }}>
                            <button className="action-cta task-action-btn" style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem" }} type="button" onClick={() => handleValidate(event)}>Valider</button>
                            <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", background: "#FDE8E8", color: "#a23b3b" }} type="button" onClick={() => openReject(event)}>Refuser</button>
                        </div>
                    </div>
                ))}
            </div>

            <AdminModal open={!!rejectTarget} title={`Refuser : ${rejectTarget?.name || ""}`} onClose={() => setRejectTarget(null)}>
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Précisez la raison…" style={{ ...fieldStyle, resize: "vertical" }} />
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="action-cta" style={{ background: "#FDE8E8", color: "#a23b3b" }} type="submit" disabled={isSubmitting}>{isSubmitting ? "Refus…" : "Confirmer le refus"}</button>
                        <button className="action-cta" type="button" onClick={() => setRejectTarget(null)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}

// ─── Vue principale ───────────────────────────────────────────────────────────

export default function OperationsValidationView({
    contents = [],
    events = [],
    loadingContents,
    loadingEvents,
    errorContents,
    errorEvents,
    onReloadContents,
    onReloadEvents,
    onValidateContent,
    onRejectContent,
    onValidateEvent,
    onRejectEvent,
}) {
    const [activeTab, setActiveTab] = useState("conseils");

    const pendingContentsCount = contents.filter((c) => c.status === "en_attente").length;
    const pendingEventsCount = events.filter((e) => e.validationStatus === "pending").length;

    const counts = { conseils: pendingContentsCount, evenements: pendingEventsCount };

    return (
        <>
            <div className="header-section" style={{ marginBottom: "1.5rem" }}>
                <div className="title-area">
                    <span className="activities-label">Opérations</span>
                    <h1>Validation</h1>
                </div>
            </div>

            {/* Onglets */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid #EAF0F1", paddingBottom: "0" }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: activeTab === tab.key ? 700 : 500,
                            fontSize: "0.9rem",
                            color: activeTab === tab.key ? "var(--text-main)" : "var(--text-muted)",
                            padding: "0.6rem 1rem",
                            borderBottom: activeTab === tab.key ? "2px solid var(--text-main)" : "2px solid transparent",
                            marginBottom: "-2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            transition: "color 0.15s",
                        }}
                    >
                        {tab.label}
                        {counts[tab.key] > 0 && (
                            <span style={{ background: "#F5A623", color: "#fff", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.5rem", minWidth: "18px", textAlign: "center" }}>
                                {counts[tab.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Contenu de l'onglet actif */}
            {activeTab === "conseils" && (
                <ConseilsValidation
                    contents={contents}
                    loading={loadingContents}
                    errorMessage={errorContents}
                    onReload={onReloadContents}
                    onValidate={onValidateContent}
                    onReject={onRejectContent}
                />
            )}
            {activeTab === "evenements" && (
                <EvenementsValidation
                    events={events}
                    loading={loadingEvents}
                    errorMessage={errorEvents}
                    onReload={onReloadEvents}
                    onValidate={onValidateEvent}
                    onReject={onRejectEvent}
                />
            )}
        </>
    );
}
