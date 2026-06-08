"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";
import RefundPaymentDetailModal, { showRefundDetailsButton } from "./RefundPaymentDetailModal";

function statusLabel(status) {
    const s = String(status || "").toLowerCase();
    const map = {
        paid: "Payé",
        success: "Payé",
        succeeded: "Payé",
        gratuit: "Gratuit",
        pending: "En attente de paiement",
        processing: "Paiement en cours",
        refund_requested: "En attente de remboursement",
        refunded: "Remboursé",
        non_refundable: "Remboursement refusé / non remboursable",
        refund_failed: "Remboursement échoué",
        failed: "Échec",
        cancelled: "Annulé",
    };
    if (map[s]) return map[s];
    if (s) return s;
    return "—";
}

function statusStyle(status) {
    const s = String(status || "").toLowerCase();
    if (s === "refund_requested" || s === "pending" || s === "processing") {
        return { bg: "#fffbeb", color: "#b45309", border: "#fcd34d" };
    }
    if (s === "paid" || s === "success" || s === "succeeded" || s === "gratuit") {
        return { bg: "#ecfdf5", color: "#059669", border: "#6ee7b7" };
    }
    if (s === "refunded") {
        return { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" };
    }
    if (s === "non_refundable" || s === "refund_failed" || s === "failed" || s === "cancelled") {
        return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
    }
    return { bg: "#f4f4f5", color: "#52525b", border: "#d4d4d8" };
}

export default function MyPaymentsView() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refundDetailPayment, setRefundDetailPayment] = useState(null);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(apiUrl("/finances/my-payments"), {
                headers: buildAuthHeaders(),
                cache: "no-store",
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible de charger vos paiements");
            setPayments(data.items || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const formatAmount = (amount) =>
        new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(amount) || 0);

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div style={{ padding: "0" }}>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Finances</span>
                    <h1>Mes paiements & transactions</h1>
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: "42rem" }}>
                        Historique de vos paiements (événements, annonces, prestations) et des statuts associés (remboursements, annulations, etc.).
                    </p>
                </div>
            </div>

            <div className="panel">
                {loading ? (
                    <div style={{ padding: "4rem", textAlign: "center" }}>
                        <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement de vos transactions…</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: "3rem", textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
                        <h3 style={{ marginBottom: "0.5rem" }}>Erreur</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
                        <button type="button" className="action-cta task-action-btn" onClick={fetchPayments}>
                            Réessayer
                        </button>
                    </div>
                ) : payments.length === 0 ? (
                    <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "1rem", margin: 0 }}>
                            Aucune transaction enregistrée pour le moment.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto", margin: "0 -1.5rem" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                            <thead>
                                <tr style={{ textAlign: "left", background: "var(--surface-sunken)" }}>
                                    <th style={thStyle}>Transaction</th>
                                    <th style={thStyle}>Contrepartie</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Montant</th>
                                    <th style={thStyle}>Statut</th>
                                    <th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p, i) => {
                                    const st = statusStyle(p.status);
                                    return (
                                        <tr
                                            key={`${p.source}-${p.sourceId}-${i}`}
                                            className="table-row-hover"
                                            style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }}
                                        >
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: "700", color: "var(--text-main)", marginBottom: "0.2rem" }}>{p.entityName}</div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                                                    <span>{formatDate(p.date)}</span>
                                                    {p.transactionRef ? (
                                                        <>
                                                            <span style={{ opacity: 0.3 }}>•</span>
                                                            <span style={{ fontFamily: "monospace", opacity: 0.85 }} title={p.transactionRef}>
                                                                Réf. {p.transactionRef.slice(0, 24)}
                                                                {p.transactionRef.length > 24 ? "…" : ""}
                                                            </span>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: "600" }}>{p.userName || "—"}</div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span
                                                    style={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: "700",
                                                        padding: "0.2rem 0.6rem",
                                                        borderRadius: "6px",
                                                        background: "rgba(0,0,0,0.05)",
                                                        width: "fit-content",
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    {p.source}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{ fontWeight: "800", fontSize: "1rem", color: "var(--primary-color)" }}>{formatAmount(p.amount)}</span>
                                            </td>
                                            <td style={tdStyle}>
                                                <span
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        padding: "0.35rem 0.8rem",
                                                        borderRadius: "999px",
                                                        fontSize: "0.75rem",
                                                        fontWeight: "700",
                                                        background: st.bg,
                                                        color: st.color,
                                                        border: `1px solid ${st.border}`,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            width: "6px",
                                                            height: "6px",
                                                            borderRadius: "50%",
                                                            background: "currentColor",
                                                            marginRight: "6px",
                                                            opacity: 0.85,
                                                        }}
                                                    />
                                                    {statusLabel(p.status)}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, verticalAlign: "middle" }}>
                                                {showRefundDetailsButton(p) ? (
                                                    <button
                                                        type="button"
                                                        className="action-cta task-action-btn"
                                                        style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem" }}
                                                        onClick={() => setRefundDetailPayment(p)}
                                                    >
                                                        Voir le remboursement
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <RefundPaymentDetailModal open={!!refundDetailPayment} payment={refundDetailPayment} onClose={() => setRefundDetailPayment(null)} />

            <style jsx>{`
                .table-row-hover:hover {
                    background: var(--surface-hover) !important;
                }
                .loading-spinner {
                    width: 30px;
                    height: 30px;
                    border: 3px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}

const thStyle = {
    padding: "1rem 1.5rem",
    fontWeight: "600",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};

const tdStyle = { padding: "1.2rem 1.5rem" };
