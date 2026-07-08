"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import RefundPaymentDetailModal, { showRefundDetailsButton } from "../../finances/RefundPaymentDetailModal";
import InvoicePreviewModal from "../../finances/InvoicePreviewModal";

export default function PaymentsAdminView() {
    const [payments, setPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterSource, setFilterSource] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refundDetailPayment, setRefundDetailPayment] = useState(null);
    const [invoicePayment, setInvoicePayment] = useState(null);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/finances/payments"), {
                headers: buildAuthHeaders(),
            });
            if (!res.ok) throw new Error("Erreur lors de la récupération des paiements");
            const data = await res.json();
            setPayments(data.items || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const formatAmount = (amount) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
    };

    const statusLabel = (p) => {
        if (p.status === "refund_requested") return "Remboursement demandé";
        if (p.status === "succeeded" || p.status === "paid" || p.status === "success") return "Payé";
        if (p.status === "refunded") return "Remboursé";
        if (p.status === "non_refundable") return "Non remboursable";
        if (p.status === "refund_failed") return "Remboursement échoué";
        return p.status || "—";
    };

    const statusStyle = (p) => {
        if (p.status === "refund_requested") {
            return { bg: "#fffbeb", color: "#b45309", border: "#fcd34d" };
        }
        if (p.status === "paid" || p.status === "succeeded" || p.status === "success") {
            return { bg: "#ecfdf5", color: "#059669", border: "#6ee7b7" };
        }
        if (p.status === "refunded") {
            return { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" };
        }
        return { bg: "#fff1f2", color: "#e11d48", border: "#fda4af" };
    };

    const showRefundLink = (p) => {
        if (p.status !== "refund_requested") return false;
        const src = String(p.source || "").toLowerCase();
        return src.includes("événement") || src.includes("réservation service") || src.includes("reservation service");
    };
    
    const canShowInvoice = (p) => {
        const s = String(p?.status || "").toLowerCase();
        return s === "paid" || s === "success" || s === "succeeded" || s === "gratuit" || s === "refunded" || s === "refund_requested" || s === "non_refundable" || s === "refund_failed";
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Date invalide";
        return d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const filteredPayments = payments.filter(p => {
        if (filterSource !== "all" && p.source !== filterSource) return false;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            if (
                !(p.userName || "").toLowerCase().includes(q) &&
                !(p.entityName || "").toLowerCase().includes(q) &&
                !(p.transactionRef || "").toLowerCase().includes(q)
            ) {
                return false;
            }
        }
        return true;
    });

    return (
        <div style={{ padding: "0" }}>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Administration</span>
                    <h1>Historique des paiements</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1.5rem", padding: "1.25rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <input
                    type="text"
                    placeholder="Rechercher (nom, référence, etc.)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: "1 1 250px", padding: "0.75rem", borderRadius: "10px", border: "1px solid var(--border)", outline: "none", fontSize: "0.95rem", background: "var(--surface-sunken)" }}
                />
                <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    style={{ flex: "0 1 250px", padding: "0.75rem", borderRadius: "10px", border: "1px solid var(--border)", outline: "none", fontSize: "0.95rem", background: "var(--surface)", cursor: "pointer" }}
                >
                    <option value="all">Toutes les sources</option>
                    <option value="Inscription événement">Ateliers / Formations</option>
                    <option value="Vente annonce">Ventes d'annonces</option>
                    <option value="Réservation service">Services</option>
                </select>
            </div>

            <div className="panel">
                {loading ? (
                    <div style={{ padding: "4rem", textAlign: "center" }}>
                        <div className="loading-spinner" style={{ margin: "0 auto 1rem" }}></div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement des transactions sécurisées...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: "3rem", textAlign: "center" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
                        <h3 style={{ marginBottom: "0.5rem" }}>Erreur de chargement</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
                        <button className="action-cta task-action-btn" onClick={fetchPayments}>Réessayer</button>
                    </div>
                ) : filteredPayments.length === 0 ? (
                    <div style={{ padding: "5rem 2rem", textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1.5rem", opacity: 0.3 }}>💳</div>
                        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
                            Aucune transaction trouvée.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto", margin: "0 -1.5rem" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                            <thead>
                                <tr style={{ textAlign: "left", background: "var(--surface-sunken)" }}>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Transaction</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Utilisateur</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Type / Source</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Montant</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map((p, i) => {
                                    const st = statusStyle(p);
                                    return (
                                    <tr key={`${p.source}-${p.sourceId}-${i}`} className="table-row-hover" style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }}>
                                        <td style={{ padding: "1.2rem 1.5rem" }}>
                                            <div style={{ fontWeight: "700", color: "var(--text-main)", marginBottom: "0.2rem" }} data-i18n-user-content="true">{p.entityName}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <span>{formatDate(p.date)}</span>
                                                {p.transactionRef && (
                                                    <>
                                                        <span style={{ opacity: 0.3 }}>•</span>
                                                        <span style={{ fontFamily: "monospace", opacity: 0.8 }} title="Référence Stripe">Ref. Stripe: <span data-i18n-user-content="true">{p.transactionRef}</span></span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: "1.2rem 1.5rem" }}>
                                            <div style={{ fontWeight: "600" }} data-i18n-user-content="true">{p.userName}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID #USR-{p.userId}</div>
                                        </td>
                                        <td style={{ padding: "1.2rem 1.5rem" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                                <span style={{ 
                                                    fontSize: "0.7rem", 
                                                    fontWeight: "700", 
                                                    padding: "0.2rem 0.6rem", 
                                                    borderRadius: "6px", 
                                                    background: "rgba(0,0,0,0.05)",
                                                    width: "fit-content"
                                                }}>
                                                    {p.source}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "1.2rem 1.5rem" }}>
                                            <span style={{ fontWeight: "800", fontSize: "1rem", color: "var(--primary-color)" }}>
                                                {formatAmount(p.amount)}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1.2rem 1.5rem" }}>
                                            <span style={{ 
                                                display: "inline-flex",
                                                alignItems: "center",
                                                padding: "0.35rem 0.8rem",
                                                borderRadius: "999px",
                                                fontSize: "0.75rem",
                                                fontWeight: "700",
                                                background: st.bg,
                                                color: st.color,
                                                border: `1px solid ${st.border}`,
                                            }}>
                                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor", marginRight: "6px", opacity: 0.85 }}></span>
                                                {statusLabel(p)}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1.2rem 1.5rem", verticalAlign: "middle" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-start" }}>
                                                {canShowInvoice(p) && (
                                                    <button
                                                        type="button"
                                                        className="action-cta task-action-btn"
                                                        style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                                        onClick={() => setInvoicePayment(p)}
                                                    >
                                                        <FileText size={13} />
                                                        Facture
                                                    </button>
                                                )}
                                                {showRefundLink(p) ? (
                                                    <Link
                                                        href="/operations/validations?tab=remboursements"
                                                        className="action-cta task-action-btn"
                                                        style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem", textDecoration: "none", display: "inline-flex" }}
                                                    >
                                                        Voir la demande
                                                    </Link>
                                                ) : null}
                                                {showRefundDetailsButton(p) ? (
                                                    <button
                                                        type="button"
                                                        className="action-cta task-action-btn"
                                                        style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem" }}
                                                        onClick={() => setRefundDetailPayment(p)}
                                                    >
                                                        Voir le remboursement
                                                    </button>
                                                ) : null}
                                                {!canShowInvoice(p) && !showRefundLink(p) && !showRefundDetailsButton(p) ? (
                                                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>—</span>
                                                ) : null}
                                            </div>
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
            <InvoicePreviewModal open={!!invoicePayment} payment={invoicePayment} onClose={() => setInvoicePayment(null)} />

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
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
