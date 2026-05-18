"use client";

import { useEffect, useState } from "react";
import AdminModal from "../../admin/AdminModal";

export function isBookingPast(booking) {
    if (!booking?.bookingDate) return false;
    const start = new Date(booking.bookingDate);
    const mins = Number(booking.durationMinutes) || 60;
    const end = new Date(start.getTime() + mins * 60 * 1000);
    return !Number.isNaN(end.getTime()) && end < new Date();
}

export function canCancelBooking(booking) {
    if (!booking) return false;
    const status = booking.status;
    if (status === "cancelled" || status === "completed") return false;
    return status === "pending" || status === "confirmed";
}

export default function BookingCancelModal({ booking, open, onClose, onConfirm, isLoading }) {
    const [refundReason, setRefundReason] = useState("");

    useEffect(() => {
        if (open && booking?.id) setRefundReason("");
    }, [open, booking?.id]);

    if (!booking) return null;

    const isPaid = Number(booking.amount) > 0 && booking.paymentStatus === "paid";
    const isBookingSlot = (booking.bookingType || "booking") === "booking";
    const start = new Date(booking.bookingDate);
    const diffHours = (start - new Date()) / (1000 * 60 * 60);
    const isRefundable = isPaid && isBookingSlot && diffHours >= 24;
    const isPast = isBookingPast(booking);
    const needsRefundExplanation = isPast && isPaid && isBookingSlot;
    const modalTitle = needsRefundExplanation ? "Demande de remboursement" : "Annuler ma réservation";

    return (
        <AdminModal open={open} title={modalTitle} onClose={onClose}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {needsRefundExplanation ? (
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-main)" }}>
                        Vous souhaitez demander un remboursement pour la prestation <strong>{booking.serviceName}</strong>, dont le créneau est passé.
                    </p>
                ) : (
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-main)" }}>
                        Êtes-vous sûr de vouloir annuler votre réservation pour <strong>{booking.serviceName}</strong> ?
                    </p>
                )}
                {isPaid && isBookingSlot && (
                    <div
                        style={{
                            background: needsRefundExplanation ? "rgba(220,38,38,0.1)" : isRefundable ? "rgba(34,197,94,0.1)" : "rgba(220,38,38,0.1)",
                            padding: "1rem",
                            borderRadius: "12px",
                            border: needsRefundExplanation
                                ? "1px solid rgba(220,38,38,0.35)"
                                : isRefundable
                                  ? "1px solid rgba(34,197,94,0.3)"
                                  : "1px solid rgba(220,38,38,0.3)",
                        }}
                    >
                        <h4
                            style={{
                                margin: "0 0 0.4rem 0",
                                color: needsRefundExplanation ? "#991B1B" : isRefundable ? "#166534" : "#991B1B",
                                fontSize: "0.95rem",
                            }}
                        >
                            {needsRefundExplanation ? "Remboursement (créneau passé)" : "Condition de remboursement"}
                        </h4>
                        <p
                            style={{
                                margin: 0,
                                fontSize: "0.85rem",
                                color: needsRefundExplanation ? "#991B1B" : isRefundable ? "#166534" : "#991B1B",
                                lineHeight: 1.5,
                            }}
                        >
                            {needsRefundExplanation
                                ? "Votre demande sera examinée conformément aux conditions prévues."
                                : isRefundable
                                  ? "Le rendez-vous est dans plus de 24 h. Vous serez intégralement remboursé sur votre moyen de paiement."
                                  : "Le rendez-vous est dans moins de 24 h. Conformément à nos conditions, aucun remboursement n'est possible."}
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
                            {isBookingSlot
                                ? "Cette réservation est gratuite ou en attente de paiement. Elle sera annulée sans frais."
                                : "Votre demande sera annulée."}
                        </p>
                    </div>
                )}
                <div style={{ display: "flex", gap: "0.65rem", paddingTop: "0.5rem" }}>
                    <button
                        type="button"
                        disabled={isLoading || (needsRefundExplanation && !refundReason.trim())}
                        onClick={() => onConfirm(booking, { refundReason: refundReason.trim() })}
                        className="action-cta"
                        style={{ flex: 1, background: "#DC2626", color: "white", border: "none", fontSize: "0.9rem", fontFamily: "inherit" }}
                    >
                        {isLoading ? "…" : needsRefundExplanation ? "Confirmer la demande" : "Confirmer l'annulation"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-cta"
                        style={{ background: "#E8ECEE", color: "var(--text-main)", fontSize: "0.9rem", fontFamily: "inherit" }}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </AdminModal>
    );
}
