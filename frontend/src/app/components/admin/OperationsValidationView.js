"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminModal from "./AdminModal";
import { fieldStyle, labelStyle, pillInputStyle } from "../../lib/styles";
import { formatDateFR } from "../../lib/formatters";

const TABS = [
    { key: "conseils", label: "Conseils" },
    { key: "evenements", label: "Événements" },
    { key: "annonces", label: "Annonces" },
    { key: "projets", label: "Projets" },
];

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
    const router = useRouter();
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

    const goToEventDetails = (eventId) => {
        router.push(`/evenements/tous-evenements?id=${eventId}`);
    };

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

            <div>
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Événements en attente</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun événement en attente de validation.</p>
                )}
                {!loading && pending.length > 0 && (
                    <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))" }}>
                        {pending.map((event) => (
                            <article
                                key={event.id}
                                onClick={() => goToEventDetails(event.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        goToEventDetails(event.id);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                style={{
                                    position: "relative",
                                    borderRadius: "28px",
                                    overflow: "hidden",
                                    height: "400px",
                                    background: "#111",
                                    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                                    cursor: "pointer",
                                }}
                            >
                                <img
                                    src={event.imageUrl || ""}
                                    alt={event.name}
                                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", pointerEvents: "none" }} />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5, 10, 5, 0.92) 0%, rgba(5, 10, 5, 0.6) 38%, rgba(5, 10, 5, 0.1) 62%, transparent 78%)", pointerEvents: "none" }} />

                                <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 2, display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(255, 255, 255, 0.12)", color: "#EAF5F4", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255, 255, 255, 0.22)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                        En attente
                                    </span>
                                </div>

                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem", zIndex: 2 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                goToEventDetails(event.id);
                                            }}
                                            style={{
                                                border: "none",
                                                background: "none",
                                                padding: 0,
                                                margin: 0,
                                                color: "white",
                                                fontWeight: 700,
                                                fontSize: "1.15rem",
                                                lineHeight: 1.3,
                                                textAlign: "left",
                                                cursor: "pointer",
                                                flex: 1,
                                            }}
                                        >
                                            {event.name}
                                        </button>
                                        <div style={{ padding: "5px 14px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.15)", color: "white", fontSize: "0.88rem", fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255, 255, 255, 0.25)", whiteSpace: "nowrap", flexShrink: 0 }}>
                                            {event.pricingType === "payant" && Number(event.price) > 0 ? `${Number(event.price).toLocaleString("fr-FR")} €` : "Gratuit"}
                                        </div>
                                    </div>

                                    <p style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.7)", margin: 0, lineHeight: 1.5 }}>
                                        {event.dateDebut
                                            ? new Date(event.dateDebut).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                            : "Date non renseignée"}
                                        {event.lieu ? ` · ${event.lieu}` : ""}
                                    </p>

                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                        {event.type && (
                                            <span style={{ padding: "4px 12px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.12)", fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.85)", fontWeight: 500, border: "1px solid rgba(255, 255, 255, 0.2)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", textTransform: "capitalize" }}>
                                                {event.type}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                        <button type="button" title="Modifier" onClick={(e) => { e.stopPropagation(); goToEventDetails(event.id); }} style={{ padding: "9px", borderRadius: "50%", border: "1px solid rgba(255, 255, 255, 0.25)", background: "rgba(255, 255, 255, 0.12)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <IconPencil />
                                        </button>
                                        <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); openReject(event); }} style={{ padding: "9px", borderRadius: "50%", border: "1px solid rgba(220, 60, 60, 0.35)", background: "rgba(220, 60, 60, 0.15)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "rgb(255, 128, 128)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <IconTrash />
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleValidate(event); }} style={{ flex: 1, padding: "0.72rem 0.8rem", borderRadius: "999px", border: "1px solid rgba(255, 255, 255, 0.28)", background: "rgba(255, 255, 255, 0.16)", color: "rgba(255, 255, 255, 0.95)", fontFamily: "inherit", fontSize: "0.84rem", fontWeight: 650, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                                            Valider
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); openReject(event); }} style={{ flex: 1, padding: "0.72rem 1rem", borderRadius: "999px", border: "1px solid rgba(248, 113, 113, 0.45)", background: "rgba(185, 28, 28, 0.32)", color: "#ffe4e6", fontFamily: "inherit", fontSize: "0.84rem", fontWeight: 650, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                                            Refuser
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
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

// ─── Onglet Annonces ─────────────────────────────────────────────────────────

function AnnoncesValidation({ items, loading, errorMessage, onReload, onValidate, onReject }) {
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = items.filter((item) => {
        const q = query.trim().toLowerCase();
        return (
            item.status === "en_attente" &&
            (!q || item.name.toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (item) => {
        if (!window.confirm(`Valider l'annonce "${item.name}" ?`)) return;
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
                    placeholder="Rechercher une annonce…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Annonces en attente</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucune annonce en attente de validation.</p>
                )}
                {!loading && pending.map((item) => (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start", padding: "1rem 0", borderBottom: "1px solid #EAF0F1" }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.name}</span>
                                {item.category && <span className="db-badge" style={{ background: "#EAF4FF" }}>{item.category}</span>}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                {item.city} · {item.type}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, paddingTop: "0.15rem" }}>
                            <button className="action-cta task-action-btn" style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem" }} type="button" onClick={() => handleValidate(item)}>Valider</button>
                            <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", background: "#FDE8E8", color: "#a23b3b" }} type="button" onClick={() => openReject(item)}>Refuser</button>
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

// ─── Onglet Projets ──────────────────────────────────────────────────────────

function ProjetsValidation({ projects, loading, errorMessage, onReload, onValidate, onReject }) {
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = projects.filter((p) => {
        const q = query.trim().toLowerCase();
        return (
            p.moderation_status === "pending" &&
            (!q || p.title.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (project) => {
        if (!window.confirm(`Valider le projet "${project.title}" ?`)) return;
        try { await onValidate(project.id); } catch (err) { window.alert(String(err?.message || "Impossible de valider.")); }
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
                    placeholder="Rechercher un projet…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Projets en attente</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun projet en attente de validation.</p>
                )}
                {!loading && pending.map((p) => (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start", padding: "1rem 0", borderBottom: "1px solid #EAF0F1" }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{p.title}</span>
                                {p.category && <span className="db-badge" style={{ background: "#EAF4FF" }}>{p.category}</span>}
                            </div>
                            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, maxHeight: "3rem", overflow: "hidden" }}>{p.description}</p>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, paddingTop: "0.15rem" }}>
                            <button className="action-cta task-action-btn" style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem" }} type="button" onClick={() => handleValidate(p)}>Valider</button>
                            <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", background: "#FDE8E8", color: "#a23b3b" }} type="button" onClick={() => openReject(p)}>Refuser</button>
                        </div>
                    </div>
                ))}
            </div>

            <AdminModal open={!!rejectTarget} title={`Refuser : ${rejectTarget?.title || ""}`} onClose={() => setRejectTarget(null)}>
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
    items = [],
    projects = [],
    loadingContents,
    loadingEvents,
    loadingItems,
    loadingProjects,
    errorContents,
    errorEvents,
    errorItems,
    errorProjects,
    onReloadContents,
    onReloadEvents,
    onReloadItems,
    onReloadProjects,
    onValidateContent,
    onRejectContent,
    onValidateEvent,
    onRejectEvent,
    onValidateItem,
    onRejectItem,
    onValidateProject,
    onRejectProject,
}) {
    const [activeTab, setActiveTab] = useState("conseils");

    const pendingContentsCount = contents.filter((c) => c.status === "en_attente").length;
    const pendingEventsCount = events.filter((e) => e.validationStatus === "pending").length;
    const pendingItemsCount = items.filter((i) => i.status === "en_attente").length;
    const pendingProjectsCount = projects.filter((p) => p.moderation_status === "pending").length;

    const counts = { 
        conseils: pendingContentsCount, 
        evenements: pendingEventsCount,
        annonces: pendingItemsCount,
        projets: pendingProjectsCount
    };

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
            {activeTab === "annonces" && (
                <AnnoncesValidation
                    items={items}
                    loading={loadingItems}
                    errorMessage={errorItems}
                    onReload={onReloadItems}
                    onValidate={onValidateItem}
                    onReject={onRejectItem}
                />
            )}
            {activeTab === "projets" && (
                <ProjetsValidation
                    projects={projects}
                    loading={loadingProjects}
                    errorMessage={errorProjects}
                    onReload={onReloadProjects}
                    onValidate={onValidateProject}
                    onReject={onRejectProject}
                />
            )}
        </>
    );
}
