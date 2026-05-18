"use client";

import AdminModal from "../admin/AdminModal";
import { labelStyle } from "../../lib/styles";

function isRefundablePaymentSource(source) {
    const src = String(source || "").toLowerCase();
    return src.includes("événement") || src.includes("réservation service") || src.includes("reservation service");
}

/** Événement ou réservation prestation : afficher le détail remboursement / demande / refus. */
export function showRefundDetailsButton(p) {
    if (!isRefundablePaymentSource(p.source)) return false;
    const s = String(p.status || "").toLowerCase();
    if (["refunded", "refund_failed", "non_refundable", "refund_requested"].includes(s)) return true;
    if (Number(p.refundAmount) > 0) return true;
    if (String(p.stripeRefundId || "").trim() !== "") return true;
    if (String(p.refundError || "").trim() !== "") return true;
    return false;
}

/** @deprecated Utiliser showRefundDetailsButton */
export const showEventRefundDetailsButton = showRefundDetailsButton;

function statusHuman(status) {
    const s = String(status || "").toLowerCase();
    const map = {
        paid: "Payé",
        succeeded: "Payé",
        refund_requested: "Remboursement demandé",
        refunded: "Remboursé",
        non_refundable: "Non remboursable (refus)",
        refund_failed: "Remboursement échoué",
        pending: "En attente",
        gratuit: "Gratuit",
    };
    return map[s] || status || "—";
}

function Row({ label, children }) {
    return (
        <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ ...labelStyle, margin: 0 }}>{label}</span>
            <div style={{ fontSize: "0.92rem", color: "var(--text-main)", lineHeight: 1.45 }}>{children}</div>
        </div>
    );
}

export default function RefundPaymentDetailModal({ open, onClose, payment }) {
    if (!payment) return null;

    const formatAmount = (amount) =>
        new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(amount) || 0);

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const refAmt = Number(payment.refundAmount) || 0;
    const stripeRef = String(payment.stripeRefundId || "").trim();
    const err = String(payment.refundError || "").trim();
    const st = String(payment.status || "").toLowerCase();

    return (
        <AdminModal open={open} title="Détails du remboursement" onClose={onClose}>
            <div style={{ display: "grid", gap: "1rem", maxWidth: "32rem" }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>{payment.entityName}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{payment.source}</div>
                </div>

                <Row label="Statut">{statusHuman(payment.status)}</Row>
                <Row label="Date de la transaction">{formatDate(payment.date)}</Row>
                <Row
                    label={
                        isRefundablePaymentSource(payment.source) && String(payment.source || "").toLowerCase().includes("réservation")
                            ? "Montant de la réservation (paiement initial)"
                            : "Montant du billet (paiement initial)"
                    }
                >
                    {formatAmount(payment.amount)}
                </Row>

                <Row label="Montant remboursé (effectif)">
                    {refAmt > 0 ? (
                        <strong>{formatAmount(refAmt)}</strong>
                    ) : st === "refund_requested" ? (
                        <span style={{ color: "var(--text-muted)" }}>En attente de traitement par l&apos;équipe.</span>
                    ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                </Row>

                {stripeRef ? (
                    <Row label="Identifiant remboursement Stripe">
                        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", wordBreak: "break-all" }}>{stripeRef}</span>
                    </Row>
                ) : null}

                {payment.transactionRef ? (
                    <Row label="Référence paiement (session / PaymentIntent)">
                        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", wordBreak: "break-all" }}>{payment.transactionRef}</span>
                    </Row>
                ) : null}

                {err ? (
                    <Row label="Message (refus, erreur Stripe, etc.)">
                        <span style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem" }}>{err}</span>
                    </Row>
                ) : null}

                <button type="button" className="action-cta" style={{ marginTop: "0.25rem", background: "#e8ecee", color: "var(--text-main)" }} onClick={onClose}>
                    Fermer
                </button>
            </div>
        </AdminModal>
    );
}
