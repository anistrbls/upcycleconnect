"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { formatDateTimeFR } from "../../../lib/formatters";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";
import BookingCancelModal, { canCancelBooking, isBookingPast } from "./BookingCancelModal";

const FALLBACK_GRADIENT = "linear-gradient(135deg, #2E7D6E 0%, #1a4d44 100%)";

const STATUS_MAP = {
    pending: { label: "En attente", color: "#7A5E00", bg: "rgba(255, 245, 214, 0.92)" },
    confirmed: { label: "Confirmée", color: "#233B3D", bg: "rgba(229, 255, 188, 0.92)" },
    cancelled: { label: "Annulée", color: "#8B2020", bg: "rgba(255, 232, 232, 0.92)" },
    completed: { label: "Terminée", color: "#4F6163", bg: "rgba(234, 240, 241, 0.92)" },
};

const PAYMENT_LABELS = {
    paid: "Payé",
    pending: "Paiement en attente",
    refunded: "Remboursé",
};

const tagStyle = {
    padding: "3px 10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    fontSize: "0.73rem",
    color: "rgba(255,255,255,0.85)",
    fontWeight: 500,
    border: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
};

const pricePillStyle = {
    padding: "5px 14px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.15)",
    color: "white",
    fontSize: "0.88rem",
    fontWeight: 700,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.25)",
    whiteSpace: "nowrap",
    flexShrink: 0,
};

function formatAmount(amount) {
    const price = Number(amount || 0);
    if (price <= 0) return "Gratuit";
    return `${price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function BookingCard({ booking, index, onOpenService, onCancel, isCancelling }) {
    const status = STATUS_MAP[booking.status] || {
        label: booking.status,
        color: "#333",
        bg: "rgba(238, 238, 238, 0.92)",
    };
    const hasImage = Boolean(booking.serviceImageUrl);
    const bookingType = booking.bookingType === "request" ? "Demande" : "Réservation";
    const paymentLabel = PAYMENT_LABELS[booking.paymentStatus] || booking.paymentStatus;
    const showCancel = canCancelBooking(booking);
    const refundPending = booking.status === "cancelled" && booking.refundStatus === "requested";

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={() => onOpenService(booking.serviceId)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenService(booking.serviceId);
                }
            }}
            style={{
                position: "relative",
                borderRadius: "28px",
                overflow: "hidden",
                height: "380px",
                background: hasImage ? "#111" : undefined,
                backgroundImage: hasImage ? undefined : FALLBACK_GRADIENT,
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                cursor: booking.serviceId ? "pointer" : "default",
                animation: "cardAppear 0.45s ease-out both",
                animationDelay: `${(index ?? 0) * 0.06}s`,
            }}
        >
            {hasImage ? (
                <>
                    {previewLooksLikeVideo(booking.serviceImageUrl) ? (
                        <video
                            src={booking.serviceImageUrl}
                            muted
                            playsInline
                            preload="metadata"
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            aria-hidden
                        />
                    ) : (
                        <img
                            src={booking.serviceImageUrl}
                            alt={booking.serviceName}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                                e.target.style.display = "none";
                            }}
                        />
                    )}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backdropFilter: "blur(18px)",
                            WebkitBackdropFilter: "blur(18px)",
                            maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)",
                            WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)",
                            pointerEvents: "none",
                        }}
                    />
                </>
            ) : null}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.6) 38%, rgba(5,10,5,0.1) 62%, transparent 78%)",
                    pointerEvents: "none",
                }}
            />

            <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 2 }}>
                <span style={tagStyle}>{status.label}</span>
            </div>

            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    zIndex: 2,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3, flex: 1 }}>
                        {booking.serviceName}
                    </h3>
                    <div style={pricePillStyle}>{formatAmount(booking.amount)}</div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.5 }}>
                    {formatDateTimeFR(booking.bookingDate)}
                </p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={tagStyle}>{bookingType}</span>
                    <span style={tagStyle}>
                        Expert : {booking.employeeName || "En attente d'assignation"}
                    </span>
                    {paymentLabel ? <span style={tagStyle}>{paymentLabel}</span> : null}
                    {refundPending ? <span style={tagStyle}>Remboursement demandé</span> : null}
                </div>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: "0.45rem", marginTop: "0.15rem" }}>
                    {showCancel ? (
                        <button
                            type="button"
                            disabled={isCancelling}
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancel(booking);
                            }}
                            style={{
                                flex: "1 1 auto",
                                padding: "9px 14px",
                                borderRadius: "999px",
                                border: "1px solid rgba(252,165,165,0.45)",
                                background: "rgba(220,38,38,0.28)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                color: "#fecaca",
                                cursor: isCancelling ? "wait" : "pointer",
                                fontFamily: "inherit",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {isCancelling ? "Annulation…" : "Annuler la réservation"}
                        </button>
                    ) : null}
                    {booking.serviceId ? (
                        <button
                            type="button"
                            onClick={() => onOpenService(booking.serviceId)}
                            style={{
                                flex: "1 1 auto",
                                padding: "9px 14px",
                                borderRadius: "999px",
                                border: "1px solid rgba(255,255,255,0.25)",
                                background: "rgba(255,255,255,0.12)",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                color: "white",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            Voir la prestation
                        </button>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

export default function MyBookingsView({ bookings, loading, errorMessage, onReload }) {
    const router = useRouter();
    const [cancelBooking, setCancelBooking] = useState(null);
    const [cancellingIds, setCancellingIds] = useState(() => new Set());
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    const showToast = useCallback((msg, ok = true) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ msg, ok });
        toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    }, []);

    useEffect(() => () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }, []);

    const openService = (serviceId) => {
        if (!serviceId) return;
        router.push(`/prestations/catalogue/${serviceId}`);
    };

    const handleConfirmCancel = async (booking, opts = {}) => {
        const past =
            booking.bookingType === "booking" &&
            Number(booking.amount) > 0 &&
            booking.paymentStatus === "paid" &&
            isBookingPast(booking);
        const reason = (opts.refundReason || "").trim();
        if (past && !reason) {
            showToast("Veuillez indiquer le motif de votre demande de remboursement.", false);
            return;
        }

        setCancellingIds((prev) => new Set(prev).add(booking.id));
        try {
            const headers = past
                ? buildAuthHeaders({ "Content-Type": "application/json" })
                : buildAuthHeaders();
            const body = past ? JSON.stringify({ reason }) : undefined;
            const res = await fetch(apiUrl(`/bookings/${booking.id}/cancel`), { method: "POST", headers, body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Erreur d'annulation");

            if (data.refundRequested) {
                showToast("Demande de remboursement enregistrée. Nous reviendrons vers vous.");
            } else if (data.refunded) {
                showToast(`Annulation confirmée et remboursement de ${data.refundAmount}€ initié.`);
            } else if (data.refunded === false) {
                showToast("Annulation confirmée. Non remboursable (moins de 24 h avant le rendez-vous).", false);
            } else {
                showToast("Réservation annulée.");
            }
            if (onReload) onReload();
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setCancellingIds((prev) => {
                const next = new Set(prev);
                next.delete(booking.id);
                return next;
            });
            setCancelBooking(null);
        }
    };

    return (
        <>
            {toast ? (
                <div
                    role="status"
                    style={{
                        position: "fixed",
                        bottom: "1.5rem",
                        right: "1.5rem",
                        zIndex: 9999,
                        padding: "0.85rem 1.2rem",
                        borderRadius: "12px",
                        background: toast.ok ? "var(--forest-deep)" : "#8B2020",
                        color: "white",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        maxWidth: "min(420px, calc(100vw - 2rem))",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    }}
                >
                    {toast.msg}
                </div>
            ) : null}
            <BookingCancelModal
                booking={cancelBooking}
                open={!!cancelBooking}
                onClose={() => setCancelBooking(null)}
                onConfirm={handleConfirmCancel}
                isLoading={cancelBooking ? cancellingIds.has(cancelBooking.id) : false}
            />
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Prestations</span>
                    <h1>Mes Réservations</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0 }}>
                        Suivez l&apos;état de vos demandes de prestations et vos rendez-vous.
                    </p>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>
                        Actualiser
                    </button>
                </div>
                {errorMessage ? (
                    <p style={{ marginTop: "1rem", color: "#B24A4A", fontSize: "0.85rem", fontWeight: 600 }}>{errorMessage}</p>
                ) : null}
            </div>

            {loading ? (
                <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))" }}>
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                borderRadius: "28px",
                                height: "380px",
                                background: "var(--surface-hover)",
                                animation: `skeletonPulse 1.4s ease-in-out ${i * 0.1}s infinite`,
                            }}
                        />
                    ))}
                </div>
            ) : null}

            {!loading && bookings.length === 0 ? (
                <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "4rem",
                            height: "4rem",
                            marginBottom: "1rem",
                            borderRadius: "50%",
                            background: "rgba(35, 59, 61, 0.06)",
                            color: "var(--forest-deep)",
                        }}
                        aria-hidden
                    >
                        <CalendarDays size={32} strokeWidth={1.75} />
                    </div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Aucune réservation pour le moment</h3>
                    <p style={{ color: "var(--text-muted)", margin: 0 }}>
                        Explorez notre catalogue pour trouver la prestation qui vous convient.
                    </p>
                </div>
            ) : null}

            {!loading && bookings.length > 0 ? (
                <>
                    <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.86rem" }}>
                        {bookings.length} réservation{bookings.length > 1 ? "s" : ""}
                    </p>
                    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))" }}>
                        {bookings.map((b, index) => (
                            <BookingCard
                                key={b.id}
                                booking={b}
                                index={index}
                                onOpenService={openService}
                                onCancel={setCancelBooking}
                                isCancelling={cancellingIds.has(b.id)}
                            />
                        ))}
                    </div>
                </>
            ) : null}

            <style jsx global>{`
                @keyframes cardAppear {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes skeletonPulse {
                    0%,
                    100% {
                        opacity: 0.5;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
            `}</style>
        </>
    );
}
