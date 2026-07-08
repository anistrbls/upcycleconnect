"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { pillInputStyle } from "../../lib/styles";
import AdminModal from "../admin/AdminModal";
import { TOKEN_KEY, apiUrl, buildAuthHeaders } from "../../lib/api";

const TYPE_LABELS = { formation: "Formation", atelier: "Atelier", evenement: "Événement", conference: "Conférence" };
const TYPE_COLORS = {
    formation:  { bg: "#EAF4FF", color: "#2563EB" },
    atelier:    { bg: "#E5FFBC", color: "#166534" },
    evenement:  { bg: "#FFF7ED", color: "#92400E" },
    conference: { bg: "#FAF5FF", color: "#6B21A8" },
};
const TYPE_FILTERS = [
    { key: "all",       label: "Toutes" },
    { key: "formation", label: "Formations" },
    { key: "atelier",   label: "Ateliers" },
    { key: "evenement", label: "Événements" },
];
const PRICE_FILTERS = [
    { key: "all",    label: "Gratuit & payant" },
    { key: "gratuit", label: "Gratuit" },
    { key: "payant",  label: "Payant" },
];

function formatDate(raw) {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatTime(raw) {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function getEventSessions(item) {
    const source = item?.type === "formation" && Array.isArray(item.sessions) && item.sessions.length > 0
        ? item.sessions.map((session) => ({ start: session.start, end: session.end }))
        : [{ start: item?.dateDebut, end: item?.dateFin }];
    return source
        .map((session) => ({
            start: new Date(session.start),
            end: new Date(session.end || session.start),
        }))
        .filter((session) => !isNaN(session.start.getTime()) && !isNaN(session.end.getTime()))
        .sort((a, b) => a.start - b.start);
}
function formatEventSchedule(item) {
    const sessions = getEventSessions(item);
    if (item?.type === "formation" && sessions.length > 1) {
        const first = sessions[0].start.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        return `${sessions.length} sessions · dès le ${first}`;
    }
    return formatDate(item?.dateDebut);
}
function formatPrice(item) {
    if (item.pricingType === "payant" && item.price > 0) return `${Number(item.price).toLocaleString("fr-FR")} €`;
    return "Gratuit";
}
function placesRestantes(item) {
    if (item.capacite == null && item.capaciteMax == null) return null;
    const max = item.capaciteMax ?? item.capacite;
    if (max == null) return null;
    return Math.max(0, max - (item.participantCount ?? 0));
}

/** Événement terminé : date de fin passée (ou date de début si fin absente). */
function isEventPast(item) {
    if (!item) return false;
    const sessions = getEventSessions(item);
    const end = sessions[sessions.length - 1]?.end || new Date(item.dateFin);
    const start = new Date(item.dateDebut);
    const now = new Date();
    if (!isNaN(end.getTime())) return end < now;
    if (!isNaN(start.getTime())) return start < now;
    return false;
}

/* ── Card événement style photo plein fond ── */
function EventCard({ item, index, onDetail, onRegister, onUnregister, onCheckout, registeredIds, loadingIds, isPremiumAtelier }) {
    const tc = TYPE_COLORS[item.type] || { bg: "#E6EDEE", color: "#444" };
    const scheduleLabel = formatEventSchedule(item);
    const isFull = (() => { const r = placesRestantes(item); return r !== null && r <= 0; })();
    const canRegisterDespiteFull = isFull && isPremiumAtelier;
    const isRegistered = registeredIds.has(item.id);
    const isLoading = loadingIds.has(item.id);
    const isPaid = item.pricingType === "payant" && item.price > 0;

    return (
        <article
            style={{ position: "relative", borderRadius: "28px", overflow: "hidden", height: "380px", background: item.imageUrl ? "#111" : tc.bg, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", cursor: "pointer", animation: "cardAppear 0.45s ease-out both", animationDelay: `${(index ?? 0) * 0.06}s` }}
            onClick={() => onDetail(item)}
        >
            {item.imageUrl ? (
                <>
                    <img src={item.imageUrl} alt={item.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                    <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", pointerEvents: "none" }} />
                </>
            ) : null}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.6) 38%, rgba(5,10,5,0.1) 62%, transparent 78%)", pointerEvents: "none" }} />

            {/* Badges haut droite */}
            <div style={{ position: "absolute", top: "14px", right: "14px", display: "flex", gap: "0.4rem", zIndex: 2, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {isRegistered && (
                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.24)", letterSpacing: "0.03em" }}>Inscrit</div>
                )}
            </div>

            {/* Contenu bas */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem", zIndex: 2 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3, flex: 1 }}>{item.name}</h3>
                    <div style={{ padding: "5px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.88rem", fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {formatPrice(item)}
                    </div>
                </div>
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                    {scheduleLabel}
                    {item.lieu && ` · ${item.lieu}`}
                </p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", fontSize: "0.73rem", color: "rgba(255,255,255,0.85)", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                        {TYPE_LABELS[item.type] || item.type}
                    </span>
                    {(() => { const r = placesRestantes(item); return r !== null ? (
                        <span style={{ padding: "3px 10px", borderRadius: "999px", background: r <= 0 ? (canRegisterDespiteFull ? "rgba(124,58,237,0.25)" : "rgba(220,38,38,0.2)") : "rgba(255,255,255,0.12)", fontSize: "0.73rem", color: r <= 0 ? (canRegisterDespiteFull ? "#c4b5fd" : "#fca5a5") : "rgba(255,255,255,0.85)", fontWeight: 500, border: r <= 0 ? (canRegisterDespiteFull ? "1px solid rgba(124,58,237,0.45)" : "1px solid rgba(220,38,38,0.4)") : "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                            {r <= 0 ? (canRegisterDespiteFull ? "★ Accès prioritaire" : "Complet") : `${r} place${r > 1 ? "s" : ""} restante${r > 1 ? "s" : ""}`}
                        </span>
                    ) : null; })()}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button
                        type="button"
                        onClick={() => onDetail(item)}
                        style={{
                            padding: "9px 14px",
                            borderRadius: "999px",
                            border: "1px solid rgba(255,255,255,0.25)",
                            background: "rgba(255,255,255,0.12)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            ...(isFull && !isRegistered && !canRegisterDespiteFull ? { flex: 1 } : {}),
                        }}
                    >
                        Voir le détail
                    </button>
                    {isRegistered ? (
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => onUnregister(item)}
                            style={{
                                flex: 1,
                                padding: "9px 14px",
                                borderRadius: "999px",
                                border: "1px solid rgba(252,165,165,0.45)",
                                background: "rgba(220,38,38,0.28)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                color: "#fecaca",
                                cursor: "pointer",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                            }}
                        >
                            {isLoading ? "…" : "Se désinscrire"}
                        </button>
                    ) : canRegisterDespiteFull ? (
                        <button type="button" disabled={isLoading} onClick={() => isPaid ? onCheckout(item) : onRegister(item)} style={{ flex: 1, padding: "9px 14px", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                            {isLoading ? "…" : <>★ {isPaid ? "Réserver (prioritaire)" : "S'inscrire (prioritaire)"}</>}
                        </button>
                    ) : isFull ? null : isPaid ? (
                        <button type="button" disabled={isLoading} onClick={() => onCheckout(item)} style={{ flex: 1, padding: "9px 14px", borderRadius: "999px", border: "none", background: "white", color: "#111", cursor: "pointer", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
                            {isLoading ? "…" : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Réserver</>}
                        </button>
                    ) : (
                        <button type="button" disabled={isLoading} onClick={() => onRegister(item)} style={{ flex: 1, padding: "9px 14px", borderRadius: "999px", border: "none", background: "white", color: "#111", cursor: "pointer", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 700 }}>
                            {isLoading ? "…" : "S'inscrire"}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

/* ── Modale détail ── */
function EventDetailModal({ item, open, onClose, onRegister, onUnregister, onCheckout, isRegistered, isLoading, isPremiumAtelier }) {
    if (!item) return null;
    const tc = TYPE_COLORS[item.type] || { bg: "#E6EDEE", color: "#444" };
    const isFull = (() => { const r = placesRestantes(item); return r !== null && r <= 0; })();
    const canRegisterDespiteFull = isFull && isPremiumAtelier;
    const isPaid = item.pricingType === "payant" && item.price > 0;
    const restantes = placesRestantes(item);
    const start = new Date(item.dateDebut);
    const end = new Date(item.dateFin);
    const sessions = getEventSessions(item);
    const hasSessionSchedule = item.type === "formation" && sessions.length > 1;

    return (
        <AdminModal open={open} title={item.name} onClose={onClose}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "16px" }} onError={e => e.target.style.display = "none"} />
                )}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, background: tc.bg, color: tc.color }}>{TYPE_LABELS[item.type] || item.type}</span>
                    {isFull && !canRegisterDespiteFull && <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, background: "#FDE8E8", color: "#B24A4A" }}>Complet</span>}
                    {isFull && canRegisterDespiteFull && <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, background: "#EDE9FE", color: "#6D28D9" }}>★ Accès prioritaire Premium</span>}
                    {isRegistered && <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, background: "#E5FFBC", color: "#166534" }}>Inscrit</span>}
                </div>
                {item.description && <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.65 }}>{item.description}</p>}
                <div style={{ display: "grid", gap: "0.55rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                    {!isNaN(start.getTime()) && !hasSessionSchedule && <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Date</span><span>{formatDate(item.dateDebut)}{!isNaN(end.getTime()) && ` → ${start.toDateString() === end.toDateString() ? formatTime(item.dateFin) : formatDate(item.dateFin)}`}</span></div>}
                    {hasSessionSchedule && (
                        <div style={{ display: "grid", gap: "0.35rem" }}>
                            <span style={{ color: "var(--text-muted)" }}>Sessions</span>
                            {sessions.map((session, index) => (
                                <span key={`${session.start.toISOString()}-${index}`} style={{ fontWeight: 650 }}>
                                    {index + 1}. {session.start.toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} - {session.end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            ))}
                        </div>
                    )}
                    {item.lieu && <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Lieu</span><span>{item.lieu}</span></div>}
                    {item.categoryName && <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Catégorie</span><span>{item.categoryName}</span></div>}
                    {item.intervenant && <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Intervenant</span><span>{item.intervenant}</span></div>}
                    <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Tarif</span><span style={{ fontWeight: 700 }}>{formatPrice(item)}</span></div>
                    {restantes !== null && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Places</span>
                            <span style={{ color: restantes <= 0 && !canRegisterDespiteFull ? "#B24A4A" : restantes <= 0 ? "#6D28D9" : "inherit" }}>
                                {item.participantCount ?? 0}/{item.capaciteMax ?? item.capacite} inscrits{restantes > 0 ? ` · ${restantes} restante${restantes > 1 ? "s" : ""}` : canRegisterDespiteFull ? " · Complet (accès prioritaire activé)" : " · Complet"}
                            </span>
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", gap: "0.65rem", paddingTop: "0.25rem" }}>
                    {isRegistered ? (
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => { onUnregister(item); onClose(); }}
                            style={{
                                flex: 1,
                                padding: "0.75rem",
                                borderRadius: "16px",
                                border: "1px solid rgba(220,38,38,0.45)",
                                background: "rgba(220,38,38,0.1)",
                                color: "#B91C1C",
                                fontFamily: "inherit",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            {isLoading ? "…" : "Se désinscrire"}
                        </button>
                    ) : canRegisterDespiteFull ? (
                        <button type="button" disabled={isLoading} onClick={() => { if (isPaid) { onCheckout(item); } else { onRegister(item); } onClose(); }} style={{ flex: 1, padding: "0.75rem", borderRadius: "16px", border: "none", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
                            {isLoading ? "…" : `★ ${isPaid ? "Réserver" : "S'inscrire"} (accès prioritaire)`}
                        </button>
                    ) : isFull ? (
                        <div style={{ flex: 1, padding: "0.75rem", borderRadius: "16px", background: "#FDE8E8", color: "#B24A4A", fontSize: "0.9rem", fontWeight: 600, textAlign: "center" }}>Complet — inscription impossible</div>
                    ) : isPaid ? (
                        <button type="button" disabled={isLoading} onClick={() => { onCheckout(item); onClose(); }} className="action-cta task-action-btn" style={{ flex: 1, fontSize: "0.9rem" }}>
                            {isLoading ? "…" : `Réserver · ${formatPrice(item)}`}
                        </button>
                    ) : (
                        <button type="button" disabled={isLoading} onClick={() => { onRegister(item); onClose(); }} className="action-cta task-action-btn" style={{ flex: 1, fontSize: "0.9rem" }}>
                            {isLoading ? "…" : "S'inscrire gratuitement"}
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="action-cta" style={{ background: "#E8ECEE", color: "var(--text-main)" }}>Fermer</button>
                </div>
            </div>
        </AdminModal>
    );
}

/* ── Modale Confirmation Annulation ── */

function CancelConfirmModal({ item, open, onClose, onConfirm, isLoading }) {
    const [refundReason, setRefundReason] = useState("");
    useEffect(() => {
        if (open && item?.id) setRefundReason("");
    }, [open, item?.id]);

    if (!item) return null;
    const isPaid = item.pricingType === "payant" || item.paymentStatus === "paid";
    const start = new Date(item.dateDebut);
    const now = new Date();
    const diffHours = (start - now) / (1000 * 60 * 60);
    const isRefundable = diffHours >= 24;
    const isPastEvent = isEventPast(item);
    const needsRefundExplanation = isPastEvent && item.paymentStatus === "paid";
    const modalTitle = isPastEvent && isPaid ? "Demande de remboursement" : "Annuler ma participation";

    return (
        <AdminModal open={open} title={modalTitle} onClose={onClose}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {isPastEvent && isPaid ? (
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-main)" }}>
                        Vous souhaitez demander un remboursement pour votre participation à l&apos;événement <strong>{item.name}</strong>, qui est déjà terminé.
                    </p>
                ) : (
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-main)" }}>
                        Êtes-vous sûr de vouloir annuler votre participation à l&apos;événement <strong>{item.name}</strong> ?
                    </p>
                )}
                {isPaid && (
                    <div style={{ background: isPastEvent ? "rgba(220,38,38,0.1)" : isRefundable ? "rgba(34,197,94,0.1)" : "rgba(220,38,38,0.1)", padding: "1rem", borderRadius: "12px", border: isPastEvent ? "1px solid rgba(220,38,38,0.35)" : isRefundable ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(220,38,38,0.3)" }}>
                        <h4 style={{ margin: "0 0 0.4rem 0", color: isPastEvent ? "#991B1B" : isRefundable ? "#166534" : "#991B1B", fontSize: "0.95rem" }}>
                            {isPastEvent ? "Remboursement (événement passé)" : "Condition de remboursement"}
                        </h4>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: isPastEvent ? "#991B1B" : isRefundable ? "#166534" : "#991B1B", lineHeight: 1.5 }}>
                            {isPastEvent
                                ? "Votre demande sera examinée conformément aux conditions prévues pour les événements terminés."
                                : isRefundable
                                  ? "L'événement commence dans plus de 24h. Vous serez intégralement remboursé sur votre moyen de paiement."
                                  : "L'événement commence dans moins de 24h. Conformément à nos conditions, aucun remboursement n'est possible."}
                        </p>
                    </div>
                )}
                {needsRefundExplanation && (
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)" }}>
                        Expliquez pourquoi vous souhaitez être remboursé
                        <textarea
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            rows={8}
                            placeholder="Décrivez la situation (obligatoire pour enregistrer votre demande)…"
                            style={{
                                width: "100%",
                                minHeight: "10rem",
                                boxSizing: "border-box",
                                border: "1px solid rgba(35,59,61,0.2)",
                                borderRadius: "14px",
                                padding: "0.85rem 1rem",
                                fontFamily: "inherit",
                                fontSize: "0.95rem",
                                lineHeight: 1.5,
                                resize: "vertical",
                                outline: "none",
                            }}
                        />
                    </label>
                )}
                {!isPaid && (
                    <div style={{ background: "rgba(59,130,246,0.1)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(59,130,246,0.3)" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#1D4ED8", lineHeight: 1.5 }}>
                            Il s'agit d'un événement gratuit. Votre place sera libérée pour un autre participant.
                        </p>
                    </div>
                )}
                <div style={{ display: "flex", gap: "0.65rem", paddingTop: "0.5rem" }}>
                    <button type="button" disabled={isLoading || (needsRefundExplanation && !refundReason.trim())} onClick={() => onConfirm(item, { refundReason: refundReason.trim() })} className="action-cta" style={{ flex: 1, background: "#DC2626", color: "white", border: "none", fontSize: "0.9rem", fontFamily: "inherit" }}>
                        {isLoading ? "…" : isPastEvent && isPaid ? "Confirmer la demande" : "Confirmer l'annulation"}
                    </button>
                    <button type="button" onClick={onClose} className="action-cta" style={{ background: "#E8ECEE", color: "var(--text-main)", fontSize: "0.9rem", fontFamily: "inherit" }}>Fermer</button>
                </div>
            </div>
        </AdminModal>
    );
}

/* ── Carte inscription (Mes inscriptions) ── */
function RegistrationCard({ item, index, onDetail, onUnregister, isLoading }) {
    const tc = TYPE_COLORS[item.type] || { bg: "#E6EDEE", color: "#444" };
    const start = new Date(item.dateDebut);
    const isPastEvent = isEventPast(item);
    const isPaid = item.paymentStatus === "paid";
    const isPending = item.paymentStatus === "pending";
    const isEventCancelled = item.status === "annule";
    const isRegCancelled = item.registrationStatus === "cancelled";
    const paymentLabel = isPending ? "Paiement en attente" : isPaid ? "Paye" : "Gratuit";
    const paymentStyle = isPending
        ? { bg: "rgba(245, 158, 11, 0.18)", color: "#FCD34D", border: "1px solid rgba(245, 158, 11, 0.35)" }
        : isPaid
            ? { bg: "rgba(59,130,246,0.18)", color: "#BFDBFE", border: "1px solid rgba(59,130,246,0.35)" }
            : { bg: "rgba(34,197,94,0.18)", color: "#BBF7D0", border: "1px solid rgba(34,197,94,0.35)" };

    return (
        <article
            style={{ position: "relative", borderRadius: "28px", overflow: "hidden", height: "380px", background: item.imageUrl ? "#111" : tc.bg, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", cursor: "pointer", animation: "cardAppear 0.45s ease-out both", animationDelay: `${(index ?? 0) * 0.06}s` }}
            onClick={() => onDetail(item)}
        >
            {item.imageUrl ? (
                <>
                    <img src={item.imageUrl} alt={item.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                    <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", pointerEvents: "none" }} />
                </>
            ) : null}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.6) 38%, rgba(5,10,5,0.1) 62%, transparent 78%)", pointerEvents: "none" }} />

            <div style={{ position: "absolute", top: "14px", right: "14px", display: "flex", gap: "0.4rem", zIndex: 2, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {isEventCancelled && (
                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(214, 78, 40, 0.16)", color: "#FECACA", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(214, 78, 40, 0.28)", letterSpacing: "0.03em" }}>
                        Annule
                    </div>
                )}
                {!isEventCancelled && isRegCancelled && item.refundStatus === "requested" && (
                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(245, 158, 11, 0.2)", color: "#FDE68A", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(245, 158, 11, 0.35)", letterSpacing: "0.03em" }}>
                        Remb. demande
                    </div>
                )}
                {!isEventCancelled && !isRegCancelled && isPaid && (
                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.24)", letterSpacing: "0.03em" }}>
                        Inscrit
                    </div>
                )}
                <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: paymentStyle.bg, color: paymentStyle.color, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: paymentStyle.border, letterSpacing: "0.03em" }}>
                    {paymentLabel}
                </div>
            </div>

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem", zIndex: 2 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3, flex: 1 }}>{item.name}</h3>
                    <div style={{ padding: "5px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.88rem", fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {formatPrice(item)}
                    </div>
                </div>
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                    {!isNaN(start.getTime()) && start.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {item.lieu && ` · ${item.lieu}`}
                </p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", fontSize: "0.73rem", color: "rgba(255,255,255,0.85)", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                        {TYPE_LABELS[item.type] || item.type}
                    </span>
                    {item.intervenant && (
                        <span style={{ padding: "3px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", fontSize: "0.73rem", color: "rgba(255,255,255,0.85)", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                            {item.intervenant}
                        </span>
                    )}
                </div>
                {isEventCancelled && (
                    <div style={{ background: "rgba(214, 78, 40, 0.14)", border: "1px solid rgba(214, 78, 40, 0.24)", color: "#FEE2E2", borderRadius: "14px", padding: "0.7rem 0.8rem", fontSize: "0.78rem", lineHeight: 1.45, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                        <strong>Evenement annule.</strong>
                        {item.rejectionComment ? ` ${item.rejectionComment}` : " L'organisateur a annule cet evenement."}
                    </div>
                )}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button type="button" onClick={() => onDetail(item)} style={{ padding: "9px 14px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "white", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, fontFamily: "inherit" }}>
                        Voir le detail
                    </button>
                    {!isEventCancelled && !isRegCancelled && !(isPastEvent && !isPaid) && (
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => onUnregister(item)}
                            style={{
                                flex: 1,
                                padding: "9px 14px",
                                borderRadius: "999px",
                                border: "1px solid rgba(252,165,165,0.45)",
                                background: isPastEvent && isPaid ? "rgba(220,38,38,0.35)" : "rgba(220,38,38,0.28)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                color: "#fecaca",
                                cursor: "pointer",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                fontFamily: "inherit",
                            }}
                        >
                            {isLoading ? "…" : isPastEvent && isPaid ? "Remboursement" : "Se désinscrire"}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

/* ══════════════════════════════════════════════════════════ */
export default function ParticulierEvenementsView({ events = [], registrations = [], loading, errorMessage, onReload, subpage = "activites" }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [typeFilter, setTypeFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [detailItem, setDetailItem] = useState(null);
    const [cancelItem, setCancelItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [loadingIds, setLoadingIds] = useState(new Set());
    const [registeredIds, setRegisteredIds] = useState(() => new Set((registrations || []).filter(r => r.paymentStatus !== "pending" && r.registrationStatus !== "cancelled" && r.refundStatus !== "refunded").map(r => r.id ?? r.eventId)));
    const [isPremiumAtelier, setIsPremiumAtelier] = useState(false);
    const toastTimerRef = useRef(null);
    const handledPaymentRef = useRef("");

    useEffect(() => {
        fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() })
            .then((r) => r.json())
            .then((d) => setIsPremiumAtelier(String(d.user?.subscriptionType || "").toLowerCase() === "premium_atelier"))
            .catch(() => {});
    }, []);

    // Sync registeredIds when registrations prop changes
    const syncRegistrations = useCallback((regs) => {
        setRegisteredIds(new Set((regs || []).filter(r => r.paymentStatus !== "pending" && r.registrationStatus !== "cancelled" && r.refundStatus !== "refunded").map(r => r.id ?? r.eventId)));
    }, []);

    useEffect(() => {
        syncRegistrations(registrations);
    }, [registrations, syncRegistrations]);

    const showToast = (msg, ok = true) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ msg, ok });
        toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const selectedIdRaw = searchParams.get("id");
        if (!selectedIdRaw || !events.length || subpage !== "activites") {
            return;
        }
        const selectedId = Number(selectedIdRaw);
        if (Number.isNaN(selectedId)) {
            return;
        }
        const selected = events.find((event) => Number(event.id) === selectedId);
        if (selected) {
            setDetailItem(selected);
        }
    }, [searchParams, events, subpage]);

    useEffect(() => {
        if (subpage !== "activites") {
            return;
        }
        const paymentState = searchParams.get("payment");
        const paidEventIdRaw = searchParams.get("id");

        if (paymentState !== "success" && paymentState !== "failed") {
            return;
        }

        const paymentKey = `${paymentState}:${paidEventIdRaw || ""}`;
        if (handledPaymentRef.current === paymentKey) {
            return;
        }
        handledPaymentRef.current = paymentKey;

        if (paymentState === "success") {
            const paidEventId = Number(paidEventIdRaw);
            if (!Number.isNaN(paidEventId)) {
                setRegisteredIds((prev) => new Set([...prev, paidEventId]));
            }
            if (onReload) {
                onReload();
            }
            showToast("Paiement confirme. Vous etes inscrit a l'evenement.");
        } else {
            showToast("Le paiement n'a pas pu etre confirme. Reessayez depuis l'evenement.", false);
        }

        const params = new URLSearchParams(searchParams.toString());
        params.delete("payment");
        const query = params.toString();
        const nextPath = query ? `/evenements/activites?${query}` : "/evenements/activites";
        if (typeof window !== "undefined") {
            window.history.replaceState(window.history.state, "", nextPath);
        }
    }, [searchParams, subpage, onReload]);

    const setLoading = (id, val) => {
        setLoadingIds(prev => {
            const next = new Set(prev);
            val ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const handleRegister = async (item) => {
        setLoading(item.id, true);
        try {
            const res = await fetch(apiUrl(`/events/${item.id}/register`), { method: "POST", headers: buildAuthHeaders() });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Erreur d'inscription");
            setRegisteredIds(prev => new Set([...prev, item.id]));
            showToast(`Inscription confirmée pour "${item.name}" !`);
            if (onReload) onReload();
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setLoading(item.id, false);
        }
    };

    const handleDetailAction = (item) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("id", item.id);
        router.push(`/evenements/${subpage}?${params.toString()}`);
    };

    const handleUnregisterClick = (item) => {
        setCancelItem(item);
    };

    const handleConfirmCancel = async (item, opts = {}) => {
        const past = isEventPast(item);
        const paidDone = item.paymentStatus === "paid";
        const reason = (opts.refundReason || "").trim();
        if (past && paidDone && !reason) {
            showToast("Veuillez indiquer le motif de votre demande de remboursement.", false);
            return;
        }

        setLoading(item.id, true);
        try {
            const headers = past && paidDone
                ? buildAuthHeaders({ "Content-Type": "application/json" })
                : buildAuthHeaders();
            const body = past && paidDone ? JSON.stringify({ reason }) : undefined;
            const res = await fetch(apiUrl(`/events/${item.id}/register`), { method: "DELETE", headers, body });
            const data = await res.json().catch(() => ({}));
            
            // Check the HTTP status explicitly
            if (!res.ok) throw new Error(data.error || "Erreur d'annulation");
            
            setRegisteredIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
            
            if (data.refundRequested) {
                showToast("Demande de remboursement enregistrée. Nous reviendrons vers vous.");
            } else if (data.refunded) {
                showToast(`Annulation confirmée et remboursement de ${data.refundAmount}€ initié.`);
            } else if (data.refunded === false) {
                showToast(`Annulation confirmée. Non remboursable : ${data.reason}.`, false);
            } else {
                showToast(`Désinscription effectuée.`);
            }
            if (onReload) onReload();
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setLoading(item.id, false);
            setCancelItem(null);
            setDetailItem(null);
        }
    };

    const handleCheckout = async (item) => {
        setLoading(item.id, true);
        try {
            const res = await fetch(apiUrl(`/events/${item.id}/checkout`), { method: "POST", headers: buildAuthHeaders() });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Erreur de paiement");
            if (data.url) window.location.href = data.url;
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setLoading(item.id, false);
        }
    };

    /* ── Vue Activités ── */
    if (subpage === "activites" || subpage == null) {
        const visible = events.filter(item => {
            const q = query.trim().toLowerCase();
            const matchQ = !q || item.name.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q) || (item.lieu || "").toLowerCase().includes(q);
            const matchT = typeFilter === "all" || item.type === typeFilter;
            const matchP = priceFilter === "all" || item.pricingType === priceFilter || (priceFilter === "gratuit" && (!item.pricingType || item.pricingType === "gratuit"));
            return matchQ && matchT && matchP;
        });

        return (
            <>
                {toast && (
                    <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#166534" : "#B24A4A", color: "#fff", padding: "0.8rem 1.5rem", borderRadius: "999px", fontSize: "0.88rem", fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", animation: "fadeIn 0.3s ease" }}>
                        {toast.msg}
                    </div>
                )}

                <div className="header-section">
                    <div className="title-area">
                        <span className="activities-label">Activités & inscriptions</span>
                        <h1>Activités & événements</h1>
                    </div>
                </div>

                <div className="panel" style={{ marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                        <input type="text" placeholder="Rechercher…" value={query} onChange={e => setQuery(e.target.value)}
                            style={{ flex: "1 1 200px", minWidth: 0, ...pillInputStyle }} />
                        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                            {TYPE_FILTERS.map(f => (
                                <button key={f.key} type="button" className={`action-btn ${typeFilter === f.key ? "primary" : ""}`} onClick={() => setTypeFilter(f.key)} style={{ fontSize: "0.83rem" }}>
                                    {f.label}
                                    {f.key !== "all" && (
                                        <span className="db-badge" style={{ marginLeft: "0.4rem", background: typeFilter === f.key ? "rgba(255,255,255,0.22)" : (TYPE_COLORS[f.key]?.bg || "#eee"), color: typeFilter === f.key ? "inherit" : (TYPE_COLORS[f.key]?.color || "inherit"), padding: "1px 7px", fontSize: "0.75rem" }}>
                                            {events.filter(e => e.type === f.key).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                            {PRICE_FILTERS.map(f => (
                                <button key={f.key} type="button" className={`action-btn ${priceFilter === f.key ? "primary" : ""}`} onClick={() => setPriceFilter(f.key)} style={{ fontSize: "0.83rem" }}>{f.label}</button>
                            ))}
                        </div>
                    </div>
                    {errorMessage && <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>}
                </div>

                {loading && (
                    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} style={{ borderRadius: "28px", height: "380px", background: "var(--surface-hover)", animation: `skeletonPulse 1.4s ease-in-out ${i * 0.1}s infinite` }} />
                        ))}
                    </div>
                )}
                {!loading && visible.length === 0 && (
                    <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                            {query || typeFilter !== "all" || priceFilter !== "all" ? "Aucune activité ne correspond à votre recherche." : "Aucune activité disponible pour le moment."}
                        </p>
                    </div>
                )}
                {!loading && visible.length > 0 && (
                    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                        {visible.map((item, index) => (
                            <EventCard key={item.id} index={index} item={item} onDetail={handleDetailAction}
                                onRegister={handleRegister} onUnregister={handleUnregisterClick} onCheckout={handleCheckout}
                                registeredIds={registeredIds} loadingIds={loadingIds} isPremiumAtelier={isPremiumAtelier} />
                        ))}
                    </div>
                )}
                
                <CancelConfirmModal item={cancelItem} open={!!cancelItem} onClose={() => setCancelItem(null)}
                    onConfirm={handleConfirmCancel} isLoading={cancelItem ? loadingIds.has(cancelItem.id) : false} />
            </>
        );
    }

    /* ── Vue Mes inscriptions ── */
    if (subpage === "mes-inscriptions") {
        const visibleRegistrations = (registrations || []).filter((item) => item.paymentStatus !== "pending" && item.registrationStatus !== "cancelled" && item.refundStatus !== "refunded");

        return (
            <>
                {toast && (
                    <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#166534" : "#B24A4A", color: "#fff", padding: "0.8rem 1.5rem", borderRadius: "999px", fontSize: "0.88rem", fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
                        {toast.msg}
                    </div>
                )}
                <div className="header-section">
                    <div className="title-area">
                        <span className="activities-label">Activités & inscriptions</span>
                        <h1>Mes inscriptions</h1>
                    </div>
                </div>
                {loading && (
                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} style={{ borderRadius: "20px", height: "140px", background: "var(--surface-hover)", animation: `skeletonPulse 1.4s ease-in-out ${i * 0.1}s infinite` }} />
                        ))}
                    </div>
                )}
                {!loading && visibleRegistrations.length === 0 && (
                    <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>Vous n'êtes inscrit à aucun événement pour le moment.</p>
                    </div>
                )}
                {!loading && visibleRegistrations.length > 0 && (
                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                        {visibleRegistrations.map((item, index) => (
                            <RegistrationCard key={item.id ?? item.eventId} index={index} item={item} onDetail={handleDetailAction}
                                onUnregister={handleUnregisterClick}
                                isLoading={loadingIds.has(item.id)} />
                        ))}
                    </div>
                )}
                
                <CancelConfirmModal item={cancelItem} open={!!cancelItem} onClose={() => setCancelItem(null)}
                    onConfirm={handleConfirmCancel} isLoading={cancelItem ? loadingIds.has(cancelItem.id) : false} />
            </>
        );
    }

    return null;
}

// Keyframes injectés globalement une seule fois
if (typeof window !== "undefined" && !document.getElementById("pev-keyframes")) {
    const s = document.createElement("style");
    s.id = "pev-keyframes";
    s.textContent = `
        @keyframes cardAppear { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes skeletonPulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.9; } }
    `;
    document.head.appendChild(s);
}
