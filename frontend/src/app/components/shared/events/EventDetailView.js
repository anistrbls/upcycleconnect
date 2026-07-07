"use client";

import { useState, useEffect } from "react";
import { 
    ArrowLeft, 
    Calendar, 
    MapPin, 
    Clock, 
    Tag, 
    Users, 
    XCircle,
    Share2,
    Ticket,
    Info,
    CalendarCheck,
    CreditCard,
    AlertCircle
} from "lucide-react";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
import AdminModal from "../../admin/AdminModal";

const STATUS_CONFIG = {
    "planifie": { label: "Planifié", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
    "valide": { label: "Validé", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
    "annule": { label: "Annulé", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
    "termine": { label: "Terminé", color: "#71717a", bg: "rgba(113, 113, 122, 0.1)" },
    "brouillon": { label: "Brouillon", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
};

function isEventPastFromEvent(ev) {
    if (!ev) return false;
    const end = new Date(ev.dateFin);
    const start = new Date(ev.dateDebut);
    const now = new Date();
    if (!isNaN(end.getTime())) return end < now;
    if (!isNaN(start.getTime())) return start < now;
    return false;
}

export default function EventDetailView({ eventId, onBack }) {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [activePhoto, setActivePhoto] = useState(0);
    const [userRole, setUserRole] = useState(null);
    const [adminSubmitting, setAdminSubmitting] = useState("");
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectComment, setRejectComment] = useState("");
    const [rejectError, setRejectError] = useState("");
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelComment, setCancelComment] = useState("");
    const [cancelError, setCancelError] = useState("");
    const [unregisterModalOpen, setUnregisterModalOpen] = useState(false);
    const [refundRequestReason, setRefundRequestReason] = useState("");

    useEffect(() => {
        if (unregisterModalOpen) setRefundRequestReason("");
    }, [unregisterModalOpen, eventId]);

    const loadEventData = async (id) => {
        const token = localStorage.getItem(TOKEN_KEY);
        const res = await fetch(apiUrl(`/events/${id}`), {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Événement introuvable");
        const data = await res.json();
        setEvent(data);

        const regRes = await fetch(apiUrl("/events/my-registrations"), {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (regRes.ok) {
            const regData = await regRes.json();
            setIsRegistered(
                regData.items?.some(
                    (r) => String(r.id) === String(id) && r.registrationStatus !== "cancelled"
                )
            );
        }
    };

    useEffect(() => {
        const fetchEvent = async () => {
            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
                try {
                    const parsed = JSON.parse(atob(token.split('.')[1]));
                    setUserRole(parsed.role);
                } catch (e) {}
            }
            try {
                await loadEventData(eventId);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (eventId) fetchEvent();
    }, [eventId]);

    const runAdminAction = async (action, payload = {}) => {
        const token = localStorage.getItem(TOKEN_KEY);
        setAdminSubmitting(action);
        if (action === "reject") {
            setRejectError("");
        }
        if (action === "cancel") {
            setCancelError("");
        }
        try {
            if (action === "validate") {
                const res = await fetch(apiUrl(`/admin/events/${eventId}/validate`), {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    throw new Error(data?.error || "Impossible de valider l'événement.");
                }
            }

            if (action === "reject") {
                const comment = String(payload.comment || "").trim();
                if (!comment) {
                    setRejectError("Le motif du refus est obligatoire.");
                    return;
                }
                const res = await fetch(apiUrl(`/admin/events/${eventId}/reject`), {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ comment }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    throw new Error(data?.error || "Impossible de refuser l'événement.");
                }
                setRejectModalOpen(false);
                setRejectComment("");
                setRejectError("");
            }

            if (action === "delete") {
                if (!window.confirm(`Supprimer l'événement "${event?.name || ""}" ?`)) {
                    return;
                }
                const res = await fetch(apiUrl(`/admin/events/${eventId}`), {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    throw new Error(data?.error || "Impossible de supprimer l'événement.");
                }
                onBack?.();
                return;
            }

            if (action === "cancel") {
                const comment = String(payload.comment || "").trim();
                if (!comment) {
                    setCancelError("Le message d'annulation est obligatoire.");
                    return;
                }
                const res = await fetch(apiUrl(`/admin/events/${eventId}/cancel`), {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ comment }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    throw new Error(data?.error || "Impossible d'annuler l'événement.");
                }
                setCancelModalOpen(false);
                setCancelComment("");
                setCancelError("");
            }

            await loadEventData(eventId);
        } catch (err) {
            const message = String(err?.message || "Action impossible.");
            if (action === "reject") {
                setRejectError(message);
            } else if (action === "cancel") {
                setCancelError(message);
            } else {
                alert(message);
            }
        } finally {
            setAdminSubmitting("");
        }
    };

    const openRejectModal = () => {
        setRejectComment("");
        setRejectError("");
        setRejectModalOpen(true);
    };

    const openCancelModal = () => {
        setCancelComment("");
        setCancelError("");
        setCancelModalOpen(true);
    };

    const submitReject = async (e) => {
        e.preventDefault();
        await runAdminAction("reject", { comment: rejectComment });
    };

    const submitCancel = async (e) => {
        e.preventDefault();
        await runAdminAction("cancel", { comment: cancelComment });
    };

    const handleRegister = async () => {
        if (isRegistered && !unregisterModalOpen) {
            setUnregisterModalOpen(true);
            return;
        }
        
        const token = localStorage.getItem(TOKEN_KEY);
        setRegistering(true);
        try {
            if (isRegistered) {
                const pastRefund = isEventPastFromEvent(event);
                const needReason = pastRefund && event.paymentStatus === "paid";
                const reason = refundRequestReason.trim();
                if (needReason && !reason) {
                    throw new Error("Veuillez indiquer le motif de votre demande de remboursement.");
                }
                const body = needReason ? JSON.stringify({ reason }) : undefined;
                const res = await fetch(apiUrl(`/events/${eventId}/register`), {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...(body ? { "Content-Type": "application/json" } : {}),
                    },
                    body,
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Erreur lors de la désinscription");
                }
                setIsRegistered(false);
                setUnregisterModalOpen(false);
            } else {
                if (event.pricingType === "payant" && event.price > 0) {
                    const res = await fetch(apiUrl(`/events/${eventId}/checkout`), {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || "Erreur lors de l'initialisation du paiement");
                    if (data.url) {
                        window.location.href = data.url;
                        return; // Redirection, don't update state here
                    }
                } else {
                    const res = await fetch(apiUrl(`/events/${eventId}/register`), {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || "Erreur lors de l'inscription");
                    }
                    setIsRegistered(true);
                }
            }

            const refreshRes = await fetch(apiUrl(`/events/${eventId}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (refreshRes.ok) {
                const newData = await refreshRes.json();
                setEvent(newData);
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setRegistering(false);
        }
    };

    if (loading) return <div className="panel" style={{ padding: "4rem", textAlign: "center" }}><div className="loading-spinner" /></div>;
    if (error || !event) return <div className="panel" style={{ padding: "4rem", textAlign: "center", color: "var(--state-critical)" }}><XCircle size={48} style={{ marginBottom: "1rem" }} /><p>{error || "Événement non trouvé"}</p></div>;

    const startDate = new Date(event.dateDebut);
    const endDate = new Date(event.dateFin);
    const isSameEventDay = startDate.getFullYear() === endDate.getFullYear()
        && startDate.getMonth() === endDate.getMonth()
        && startDate.getDate() === endDate.getDate();
    const day = isSameEventDay
        ? startDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        : `Du ${startDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} au ${endDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`;
    const startTime = startDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const endTime = endDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const timeLabel = isSameEventDay ? `${startTime} - ${endTime}` : `${startTime} → ${endTime}`;
    
    const isPassed = startDate < new Date();
    
    const sc = STATUS_CONFIG[event.status] || { label: event.status, color: "var(--text-muted)", bg: "rgba(35,59,61,0.08)" };
    const displayLabel = (isPassed && event.status !== "annule") ? "Passé" : sc.label;
    const displayBg = (isPassed && event.status !== "annule") ? "rgba(113, 113, 122, 0.1)" : sc.bg;
    const displayColor = (isPassed && event.status !== "annule") ? "#71717a" : sc.color;

    const isFull = event.capacite > 0 && event.participantCount >= event.capacite;
    const photos = event.imageUrl ? [event.imageUrl] : [];

    const isPaidEvent = event.pricingType === "payant" || event.paymentStatus === "paid";
    const isPastEventRefund = isEventPastFromEvent(event);
    const refundDiffHours = (startDate - new Date()) / (1000 * 3600);
    const isRefundWindow24h = refundDiffHours >= 24;
    const unregisterModalTitle = isPastEventRefund && isPaidEvent ? "Demande de remboursement" : "Désinscription";

    const copyShareLink = () => {
        if (navigator.share) {
            navigator.share({ title: event.name, text: event.description, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Lien copié !");
        }
    };

    const actionBtn = (type) => ({
        width: "100%",
        padding: "0.82rem 1rem",
        borderRadius: "999px",
        fontSize: "0.88rem",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        cursor: "pointer",
        border: type === "neutral" ? "1px solid rgba(35,59,61,0.12)" : "none",
        fontFamily: "inherit",
        transition: "background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.2s",
        background: type === "primary" ? "var(--forest-deep)" : "transparent",
        color: type === "primary" ? "white" : "var(--text-main)",
        opacity: type === "disabled" ? 0.5 : 1,
        pointerEvents: type === "disabled" ? "none" : "auto",
    });

    return (
        <div style={{ width: "100%", padding: "1rem 0 4rem 0", animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Top bar like Annonce */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", paddingBottom: "0.9rem", borderBottom: "1px solid rgba(35,59,61,0.08)" }}>
                    <button
                        onClick={onBack}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: "0.45rem",
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", fontSize: "0.86rem",
                            fontFamily: "inherit", fontWeight: "600", padding: "0.25rem 0",
                        }}
                    >
                        <ArrowLeft size={16} /> Retour
                    </button>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ 
                            display: "inline-flex", alignItems: "center", padding: "5px 11px",
                            borderRadius: "999px", fontSize: "0.72rem", letterSpacing: "0.05em",
                            fontWeight: "700", background: displayBg, color: displayColor,
                        }}>{displayLabel}</span>



                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            <Tag size={12} /> {event.type || "Événement"}
                        </span>
                        
                        <button onClick={copyShareLink} style={{
                            display: "inline-flex", alignItems: "center", gap: "0.4rem",
                            background: "var(--surface-hover)", border: "none",
                            color: "var(--text-main)", fontSize: "0.78rem", fontWeight: "600",
                            padding: "6px 12px", borderRadius: "999px", cursor: "pointer",
                            transition: "background 0.2s"
                        }}>
                            <Share2 size={13} /> Partager
                        </button>
                    </div>
                </div>

                {event.validationStatus === "rejected" && event.status !== "annule" && (
                    <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, rgba(214, 78, 40, 0.07) 0%, rgba(255, 255, 255, 0.98) 34%, rgba(246, 249, 248, 0.98) 100%)", borderRadius: "28px", padding: "1.35rem", display: "grid", gap: "0.95rem" }}>
                        <div style={{ position: "absolute", top: "-38px", right: "-30px", width: "140px", height: "140px", borderRadius: "999px", background: "rgba(214, 78, 40, 0.08)", filter: "blur(2px)", pointerEvents: "none" }} />
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.9rem", position: "relative", zIndex: 1 }}>
                            <div style={{ width: "48px", height: "48px", flexShrink: 0, background: "linear-gradient(rgba(214, 78, 40, 0.14) 0%, rgba(214, 78, 40, 0.07) 100%)", color: "var(--state-critical)", border: "1px solid rgba(214, 78, 40, 0.15)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)" }}>
                                <AlertCircle size={20} />
                            </div>
                            <div style={{ display: "grid", gap: "0.42rem", minWidth: 0 }}>
                                <div style={{ display: "inline-flex", alignItems: "center", width: "fit-content", padding: "0.35rem 0.7rem", borderRadius: "999px", background: "rgba(214, 78, 40, 0.08)", color: "var(--state-critical)", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                    Evenement refuse
                                </div>
                                <div style={{ fontSize: "1.22rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                                    Demande de correction
                                </div>
                                <div style={{ fontSize: "0.9rem", lineHeight: 1.58, color: "var(--text-muted)", maxWidth: "72ch" }}>
                                    <span style={{ color: "var(--text-main)", fontWeight: 700 }}>Motif du refus :</span>{" "}
                                    {event.rejectionComment || event.moderationComment || event.moderationNote ? (
                                        <span data-i18n-user-content="true">{event.rejectionComment || event.moderationComment || event.moderationNote}</span>
                                    ) : "Aucun motif n'a ete renseigne."}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {event.status === "annule" && (
                    <div style={{ background: "rgba(214, 78, 40, 0.08)", border: "1px solid rgba(214, 78, 40, 0.16)", borderRadius: "18px", padding: "0.95rem 1rem", color: "#A43B21", fontSize: "0.9rem", lineHeight: 1.5 }}>
                        <strong>Evenement annule.</strong>
                        {event.rejectionComment ? <> <span data-i18n-user-content="true">{event.rejectionComment}</span></> : " L'organisateur a annule cet evenement."}
                    </div>
                )}

                {/* Hero Grid like Annonce */}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(360px, 0.8fr)", gap: "1.5rem", alignItems: "stretch" }}>
                    {/* Left: Image Container */}
                    <div style={{ background: "var(--black)", borderRadius: "28px", padding: "1rem", border: "1px solid rgba(18, 25, 26, 0.08)" }}>
                        <div style={{ borderRadius: "22px", overflow: "hidden", background: "#12191A", position: "relative" }}>
                            <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
                                {photos[activePhoto] ? (
                                    <img
                                        src={photos[activePhoto]}
                                        alt={event.name}
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}
                                        data-i18n-user-content="true"
                                    />
                                ) : (
                                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#2d3738" }}>
                                        <CalendarCheck size={80} strokeWidth={1} style={{ opacity: 0.5 }} />
                                    </div>
                                )}
                                <div style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "linear-gradient(to top, rgba(10, 15, 15, 0.7) 0%, rgba(10, 15, 15, 0.2) 20%, rgba(10, 15, 15, 0) 40%)",
                                    pointerEvents: "none",
                                    zIndex: 2,
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Info Panel */}
                    <div style={{ display: "grid", gap: "0.85rem", gridTemplateRows: "1fr auto", height: "100%" }}>
                        <div style={{ background: "#F7F8F7", borderRadius: "24px", padding: "1.5rem", border: "none", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
                            <div>
                                <div style={{ fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.45rem" }}>Détails de l'événement</div>
                                <h1 style={{ fontSize: "1.84rem", fontWeight: "700", color: "var(--text-main)", margin: "0 0 0.5rem", lineHeight: "1.1", letterSpacing: "-0.03em" }} data-i18n-user-content="true">{event.name}</h1>
                                <div style={{ fontSize: "1.62rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "0.8rem" }}>
                                    {event.pricingType === "payant" ? `${event.price} €` : "Gratuit"}
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", color: "var(--text-muted)", fontSize: "0.86rem", marginBottom: "1.2rem" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><MapPin size={14} /> {event.lieu ? <span data-i18n-user-content="true">{event.lieu}</span> : "Lieu non précisé"}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><Calendar size={14} /> {day}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><Clock size={14} /> {timeLabel}</span>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", padding: "1.2rem 0", borderTop: "1px solid rgba(35,59,61,0.08)", borderBottom: "1px solid rgba(35,59,61,0.08)", marginBottom: "1.2rem" }}>
                                    <div>
                                        <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Participants</div>
                                        <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--text-main)" }}>
                                            {event.participantCount} <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>/ {event.capacite > 0 ? event.capacite : "∞"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Durée</div>
                                        <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--text-main)" }}>
                                            {(() => {
                                                const diff = (endDate - startDate) / (1000 * 60);
                                                const h = Math.floor(diff / 60);
                                                const m = diff % 60;
                                                return h > 0 ? `${h}h${m > 0 ? m : ""}` : `${m}min`;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gap: "0.6rem" }}>
                                {userRole === "admin" ? (
                                    <>
                                        {event.validationStatus === "approved" ? (
                                            !isPassed && (
                                                <button
                                                        onClick={openRejectModal}
                                                    disabled={adminSubmitting !== ""}
                                                    style={{ ...actionBtn("neutral"), background: "transparent", color: "var(--state-critical)", border: "1px solid rgba(214, 78, 40, 0.35)" }}
                                                >
                                                        {adminSubmitting === "reject" ? "Mise a jour..." : "Passer le statut en refuse"}
                                                </button>
                                            )
                                        ) : event.validationStatus === "rejected" ? (
                                            !isPassed && (
                                                <button
                                                    onClick={() => runAdminAction("validate")}
                                                    disabled={adminSubmitting !== ""}
                                                    style={actionBtn("primary")}
                                                >
                                                    {adminSubmitting === "validate" ? "Mise a jour..." : "Passer le statut en valide"}
                                                </button>
                                            )
                                        ) : (
                                            !isPassed && (
                                                <>
                                                    <button
                                                        onClick={() => runAdminAction("validate")}
                                                        disabled={adminSubmitting !== ""}
                                                        style={actionBtn("primary")}
                                                    >
                                                        {adminSubmitting === "validate" ? "Validation..." : "Valider"}
                                                    </button>
                                                    <button
                                                        onClick={openRejectModal}
                                                        disabled={adminSubmitting !== ""}
                                                        style={{ ...actionBtn("neutral"), background: "transparent", color: "var(--state-critical)", border: "1px solid rgba(214, 78, 40, 0.35)" }}
                                                    >
                                                        {adminSubmitting === "reject" ? "Refus..." : "Refuser"}
                                                    </button>
                                                </>
                                            )
                                        )}
                                        {event.status !== "annule" && !isPassed && (
                                            <button
                                                onClick={openCancelModal}
                                                disabled={adminSubmitting !== ""}
                                                style={{ ...actionBtn("neutral"), background: "transparent", color: "var(--state-critical)", border: "1px solid rgba(214, 78, 40, 0.35)" }}
                                            >
                                                {adminSubmitting === "cancel" ? "Annulation..." : "Annuler l'evenement"}
                                            </button>
                                        )}
                                        {Number(event.participantCount || 0) === 0 ? (
                                            <button
                                                onClick={() => runAdminAction("delete")}
                                                disabled={adminSubmitting !== ""}
                                                style={{ ...actionBtn("neutral") }}
                                            >
                                                {adminSubmitting === "delete" ? "Suppression..." : "Supprimer"}
                                            </button>
                                        ) : (
                                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "0.55rem 0.7rem", borderRadius: "12px", background: "rgba(35,59,61,0.06)" }}>
                                                Suppression indisponible: des participants sont inscrits. Utilisez l'annulation.
                                            </div>
                                        )}
                                    </>
                                ) : userRole === "salarie" ? (
                                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", background: "rgba(35,59,61,0.06)", padding: "0.85rem", borderRadius: "14px", textAlign: "center", fontWeight: "600" }}>
                                        Inscriptions réservées au public
                                    </div>
                                ) : (
                                    <>
                                        {event.status === "annule" ? (
                                            <div style={{ fontSize: "0.85rem", color: "var(--state-critical)", background: "rgba(214, 78, 40, 0.08)", padding: "0.85rem", borderRadius: "14px", textAlign: "center", fontWeight: "700" }}>
                                                Cet evenement est annule.
                                            </div>
                                        ) : isPastEventRefund && isRegistered && isPaidEvent ? (
                                            <div style={{ display: "grid", gap: "0.6rem" }}>
                                                {event.transactionRef && (
                                                    <div style={{ marginBottom: "0.2rem" }}>
                                                        <div style={{ fontSize: "0.65rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>Référence de paiement</div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-main)", fontWeight: "600", fontFamily: "monospace" }}>
                                                            <CreditCard size={13} style={{ color: "#2563eb" }} /> <span data-i18n-user-content="true">{event.transactionRef}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setUnregisterModalOpen(true)}
                                                    disabled={registering}
                                                    style={{
                                                        ...actionBtn("neutral"),
                                                        border: "1px solid rgba(220,38,38,0.45)",
                                                        background: "rgba(220,38,38,0.1)",
                                                        color: "#B91C1C",
                                                    }}
                                                >
                                                    <><XCircle size={18} /> Remboursement</>
                                                </button>
                                            </div>
                                        ) : isPassed ? (
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", background: "rgba(35,59,61,0.06)", padding: "0.85rem", borderRadius: "14px", textAlign: "center", fontWeight: "600" }}>
                                                Cet événement est terminé.
                                            </div>
                                        ) : (
                                            <div style={{ display: "grid", gap: "0.6rem" }}>
                                                {isRegistered && event.transactionRef && (
                                                    <div style={{ marginBottom: "0.2rem" }}>
                                                        <div style={{ fontSize: "0.65rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>Référence de paiement</div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-main)", fontWeight: "600", fontFamily: "monospace" }}>
                                                            <CreditCard size={13} style={{ color: "#2563eb" }} /> <span data-i18n-user-content="true">{event.transactionRef}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={handleRegister}
                                                    disabled={registering || (isFull && !isRegistered)}
                                                    style={
                                                        isRegistered
                                                            ? {
                                                                  ...actionBtn("neutral"),
                                                                  border: "1px solid rgba(220,38,38,0.45)",
                                                                  background: "rgba(220,38,38,0.1)",
                                                                  color: "#B91C1C",
                                                              }
                                                            : actionBtn(isFull ? "disabled" : "primary")
                                                    }
                                                >
                                                    {isRegistered ? (
                                                        <><XCircle size={18} /> Se désinscrire</>
                                                    ) : isFull ? (
                                                        "Événement complet"
                                                    ) : event.pricingType === "payant" ? (
                                                        <><CreditCard size={18} /> Réserver ma place ({event.price} €)</>
                                                    ) : (
                                                        <><Ticket size={18} /> S'inscrire gratuitement</>
                                                    )}
                                                </button>
                                                {isRegistered && (
                                                    <div style={{ fontSize: "0.78rem", color: "#166534", background: "#f0fff4", padding: "0.6rem", borderRadius: "10px", textAlign: "center", fontWeight: "600" }}>
                                                        ✓ Vous êtes inscrit à cet événement
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content area below like Annonce */}
                <div style={{ display: "grid", gridTemplateColumns: "1.45fr 0.8fr", gap: "1.5rem" }}>
                    <div className="panel" style={{ padding: "2rem", borderRadius: "28px" }}>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <Info size={20} color="black" /> À propos de cet événement
                        </h2>
                        <div style={{ fontSize: "1.02rem", color: "var(--text-main)", lineHeight: "1.75", whiteSpace: "pre-wrap" }}>
                            {event.description ? <span data-i18n-user-content="true">{event.description}</span> : "Aucune description fournie pour cet événement."}
                        </div>
                    </div>

                    <div className="panel" style={{ padding: "1.8rem", borderRadius: "28px", background: "#F8FBFB" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1.2rem", color: "var(--text-main)" }}>Informations pratiques</h3>
                        <div style={{ display: "grid", gap: "1rem" }}>
                            <div style={{ padding: "1rem", background: "white", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.03)" }}>
                                <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>Type de public</div>
                                <div style={{ fontWeight: "600", fontSize: "0.92rem" }}>Tout public</div>
                            </div>
                            <div style={{ padding: "1rem", background: "white", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.03)" }}>
                                <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>Organisé par</div>
                                <div style={{ fontWeight: "600", fontSize: "0.92rem" }}>
                                    {event.intervenantName ? <span data-i18n-user-content="true">{event.intervenantName}</span> : "UpcycleConnect Team"}
                                </div>
                            </div>
                            <div style={{ padding: "1.2rem", background: "var(--accent-light)", borderRadius: "16px", color: "var(--accent-dark)" }}>
                                <div style={{ fontSize: "0.85rem", fontWeight: "700", marginBottom: "0.4rem" }}>Besoin d'aide ?</div>
                                <p style={{ fontSize: "0.8rem", margin: 0, lineHeight: 1.4 }}>Consultez notre FAQ ou contactez le support pour toute question relative aux inscriptions.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AdminModal open={rejectModalOpen} title="Refuser l'événement" onClose={() => setRejectModalOpen(false)}>
                <form onSubmit={submitReject} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.86rem", color: "var(--text-main)", fontWeight: 600 }}>
                        Motif du refus
                        <textarea
                            rows={4}
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="Precisez la raison du refus..."
                            style={{ width: "100%", border: "1px solid rgba(35,59,61,0.16)", borderRadius: "14px", padding: "0.75rem 0.9rem", fontFamily: "inherit", fontSize: "0.9rem", resize: "vertical", outline: "none" }}
                        />
                    </label>
                    {rejectError && <p style={{ margin: 0, color: "var(--state-critical)", fontSize: "0.82rem" }}>{rejectError}</p>}
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => setRejectModalOpen(false)} style={{ ...actionBtn("neutral"), width: "auto", padding: "0.7rem 1rem" }}>
                            Annuler
                        </button>
                        <button type="submit" disabled={adminSubmitting === "reject"} style={{ ...actionBtn("primary"), width: "auto", padding: "0.7rem 1rem" }}>
                            {adminSubmitting === "reject" ? "Confirmation..." : "Confirmer le refus"}
                        </button>
                    </div>
                </form>
            </AdminModal>

            <AdminModal open={cancelModalOpen} title="Annuler l'événement" onClose={() => setCancelModalOpen(false)}>
                <form onSubmit={submitCancel} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.86rem", color: "var(--text-main)", fontWeight: 600 }}>
                        Message pour les inscrits
                        <textarea
                            rows={4}
                            value={cancelComment}
                            onChange={(e) => setCancelComment(e.target.value)}
                            placeholder="Precisez pourquoi l'evenement est annule..."
                            style={{ width: "100%", border: "1px solid rgba(35,59,61,0.16)", borderRadius: "14px", padding: "0.75rem 0.9rem", fontFamily: "inherit", fontSize: "0.9rem", resize: "vertical", outline: "none" }}
                        />
                    </label>
                    {cancelError && <p style={{ margin: 0, color: "var(--state-critical)", fontSize: "0.82rem" }}>{cancelError}</p>}
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => setCancelModalOpen(false)} style={{ ...actionBtn("neutral"), width: "auto", padding: "0.7rem 1rem" }}>
                            Annuler
                        </button>
                        <button type="submit" disabled={adminSubmitting === "cancel"} style={{ ...actionBtn("primary"), width: "auto", padding: "0.7rem 1rem" }}>
                            {adminSubmitting === "cancel" ? "Confirmation..." : "Confirmer l'annulation"}
                        </button>
                    </div>
                </form>
            </AdminModal>

            {/* Unregistration Confirmation Modal */}
            {event && (
                <AdminModal open={unregisterModalOpen} title={unregisterModalTitle} onClose={() => setUnregisterModalOpen(false)}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {isPastEventRefund && isPaidEvent ? (
                            <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-main)" }}>
                                Vous souhaitez demander un remboursement pour votre participation à cet événement, qui est déjà terminé.
                            </p>
                        ) : (
                            <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-main)" }}>
                                Êtes-vous sûr de vouloir vous désinscrire de cet événement ?
                            </p>
                        )}

                        {isPaidEvent && (
                            <div style={{
                                background: isPastEventRefund ? "rgba(220,38,38,0.1)" : isRefundWindow24h ? "rgba(34,197,94,0.1)" : "rgba(220,38,38,0.1)",
                                padding: "1rem",
                                borderRadius: "12px",
                                border: isPastEventRefund ? "1px solid rgba(220,38,38,0.35)" : isRefundWindow24h ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(220,38,38,0.3)",
                            }}>
                                <h4 style={{ margin: "0 0 0.4rem 0", color: isPastEventRefund ? "#991B1B" : isRefundWindow24h ? "#166534" : "#991B1B", fontSize: "0.95rem" }}>
                                    {isPastEventRefund ? "Remboursement (événement passé)" : "Condition de remboursement"}
                                </h4>
                                <p style={{ margin: 0, fontSize: "0.85rem", color: isPastEventRefund ? "#991B1B" : isRefundWindow24h ? "#166534" : "#991B1B", lineHeight: 1.5 }}>
                                    {isPastEventRefund
                                        ? "Votre demande sera examinée conformément aux conditions prévues pour les événements terminés."
                                        : isRefundWindow24h
                                          ? "L'événement commence dans plus de 24h. Vous serez intégralement remboursé sur votre moyen de paiement."
                                          : "L'événement commence dans moins de 24h. Conformément à nos conditions, aucun remboursement n'est possible."}
                                </p>
                            </div>
                        )}

                        {isPastEventRefund && event.paymentStatus === "paid" && (
                            <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)" }}>
                                Expliquez pourquoi vous souhaitez être remboursé
                                <textarea
                                    value={refundRequestReason}
                                    onChange={(e) => setRefundRequestReason(e.target.value)}
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

                        <div style={{ display: "flex", gap: "0.65rem", paddingTop: "0.5rem" }}>
                            <button
                                type="button"
                                disabled={registering || (isPastEventRefund && event.paymentStatus === "paid" && !refundRequestReason.trim())}
                                onClick={handleRegister}
                                className="action-cta"
                                style={{ flex: 1, background: "#DC2626", color: "white", border: "none", fontSize: "0.9rem", fontFamily: "inherit" }}
                            >
                                {registering ? "…" : isPastEventRefund && isPaidEvent ? "Confirmer la demande" : "Confirmer la désinscription"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setUnregisterModalOpen(false)}
                                className="action-cta"
                                style={{ background: "#E8ECEE", color: "var(--text-main)", fontSize: "0.9rem", fontFamily: "inherit" }}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </AdminModal>
            )}
        </div>
    );
}
