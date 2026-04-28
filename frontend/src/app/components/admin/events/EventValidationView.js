"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";
import AdminModal from "../AdminModal";

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

export default function EventValidationView({ events = [], loading, errorMessage, onReload, onValidate, onReject }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [validateTarget, setValidateTarget] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = events.filter((e) => {
        const q = query.trim().toLowerCase();
        return (
            e.validationStatus === "pending" &&
            (!q ||
                e.name.toLowerCase().includes(q) ||
                (e.intervenant || "").toLowerCase().includes(q) ||
                (e.lieu || "").toLowerCase().includes(q))
        );
    });

    const handleValidateClick = (event) => {
        setValidateTarget(event);
        setLocalError("");
    };

    const handleConfirmValidate = async () => {
        setIsSubmitting(true);
        setLocalError("");
        try {
            await onValidate(validateTarget.id);
            setValidateTarget(null);
        } catch (err) {
            setLocalError(String(err?.message || "Impossible de valider l'événement."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const openRejectModal = (event) => {
        setRejectTarget(event);
        setRejectComment("");
        setLocalError("");
    };

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
            setLocalError(String(err?.message || "Impossible de refuser l'événement."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="header-section" style={{ marginBottom: "1.5rem" }}>
                <div className="title-area">
                    <span className="activities-label">Modération</span>
                    <h1>Validation des événements</h1>
                </div>
            </div>

            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.5rem" }}>
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
                <div className="section-header" style={{ marginBottom: "1rem" }}>
                    <span className="section-title">Événements en attente ({pending.length})</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun événement en attente de validation.</p>
                )}
                {!loading && pending.length > 0 && (
                    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(min(400px, 100%), 1fr))" }}>
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
                                    height: "420px",
                                    background: "#111",
                                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                                    cursor: "pointer",
                                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-4px)";
                                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.18)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
                                }}
                            >
                                {event.imageUrl && (
                                    <img
                                        src={event.imageUrl}
                                        alt={event.name}
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                    />
                                )}
                                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", maskImage: "linear-gradient(to top, black 0%, black 40%, transparent 65%)", WebkitMaskImage: "linear-gradient(to top, black 0%, black 40%, transparent 65%)", pointerEvents: "none" }} />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5, 10, 5, 0.95) 0%, rgba(5, 10, 5, 0.65) 40%, rgba(5, 10, 5, 0.1) 65%, transparent 85%)", pointerEvents: "none" }} />

                                <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 2, display: "flex", gap: "0.5rem" }}>
                                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(255, 255, 255, 0.12)", color: "#EAF5F4", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255, 255, 255, 0.25)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                        En attente
                                    </span>
                                </div>

                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem", zIndex: 2 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                                        <h3 style={{ margin: 0, color: "white", fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2, flex: 1 }}>
                                            {event.name}
                                        </h3>
                                        <div style={{ padding: "5px 14px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.15)", color: "white", fontSize: "0.88rem", fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255, 255, 255, 0.25)", whiteSpace: "nowrap" }}>
                                            {event.pricingType === "payant" && Number(event.price) > 0 ? `${Number(event.price).toLocaleString("fr-FR")} €` : "Gratuit"}
                                        </div>
                                    </div>

                                    <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)", margin: 0, display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                                        <span>
                                            {event.dateDebut
                                                ? new Date(event.dateDebut).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                                : "Date non renseignée"}
                                        </span>
                                        {event.lieu && (
                                            <>
                                                <span style={{ opacity: 0.5 }}>•</span>
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.lieu}</span>
                                            </>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                        {event.type && (
                                            <span style={{ padding: "4px 10px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.12)", fontSize: "0.72rem", color: "white", fontWeight: 600, border: "1px solid rgba(255, 255, 255, 0.2)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                                                {event.type}
                                            </span>
                                        )}
                                        {event.intervenant && (
                                            <span style={{ padding: "4px 10px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.08)", fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.8)", fontWeight: 500, border: "1px solid rgba(255, 255, 255, 0.15)" }}>
                                                Par {event.intervenant}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginTop: "0.5rem" }}>
                                        <button type="button" title="Modifier" onClick={(e) => { e.stopPropagation(); goToEventDetails(event.id); }} style={{ padding: "10px", borderRadius: "50%", border: "1px solid rgba(255, 255, 255, 0.25)", background: "rgba(255, 255, 255, 0.12)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <IconPencil />
                                        </button>
                                        <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); openRejectModal(event); }} style={{ padding: "10px", borderRadius: "50%", border: "1px solid rgba(220, 60, 60, 0.35)", background: "rgba(220, 60, 60, 0.15)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "rgb(255, 128, 128)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <IconTrash />
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleValidateClick(event); }} style={{ flex: 1.5, padding: "0.8rem 1rem", borderRadius: "999px", border: "1px solid rgba(255, 255, 255, 0.3)", background: "rgba(255, 255, 255, 0.2)", color: "white", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}>
                                            Valider
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); openRejectModal(event); }} style={{ flex: 1, padding: "0.8rem 1rem", borderRadius: "999px", border: "1px solid rgba(248, 113, 113, 0.45)", background: "rgba(185, 28, 28, 0.35)", color: "#ffe4e6", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(185, 28, 28, 0.5)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(185, 28, 28, 0.35)"}>
                                            Refuser
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <AdminModal open={!!validateTarget} title="Confirmer la validation" onClose={() => setValidateTarget(null)}>
                <div style={{ display: "grid", gap: "1rem" }}>
                    <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
                        Souhaitez-vous valider l'événement <strong>"{validateTarget?.name}"</strong> ?
                        Il deviendra alors visible par tous les utilisateurs.
                    </p>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.85rem", margin: 0 }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                        <button className="action-cta task-action-btn" style={{ flex: 1 }} type="button" disabled={isSubmitting} onClick={handleConfirmValidate}>
                            {isSubmitting ? "Validation…" : "Confirmer la validation"}
                        </button>
                        <button className="action-cta" type="button" onClick={() => setValidateTarget(null)} style={{ background: "#e8ecee", color: "var(--text-main)", flex: 1 }}>
                            Annuler
                        </button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal open={!!rejectTarget} title={`Refuser : ${rejectTarget?.name || ""}`} onClose={() => setRejectTarget(null)}>
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "1rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Précisez la raison pour informer le salarié…" style={{ ...fieldStyle, resize: "vertical" }} />
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.85rem", margin: 0 }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                        <button className="action-cta" style={{ background: "#FDE8E8", color: "#a23b3b", flex: 1 }} type="submit" disabled={isSubmitting}>{isSubmitting ? "Refus en cours…" : "Confirmer le refus"}</button>
                        <button className="action-cta" type="button" onClick={() => setRejectTarget(null)} style={{ background: "#e8ecee", color: "var(--text-main)", flex: 1 }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}
