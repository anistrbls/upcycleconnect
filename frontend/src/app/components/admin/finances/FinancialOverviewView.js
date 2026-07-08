"use client";

import { useEffect, useState } from "react";
import { DollarSign, Users, CreditCard, TrendingUp, ArrowUpRight, Percent } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { listUsers } from "../../../lib/userService";

export default function FinancialOverviewView() {
    const [payments, setPayments] = useState([]);
    const [users, setUsers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch payments
            const paymentsRes = await fetch(apiUrl("/admin/finances/payments"), {
                headers: buildAuthHeaders(),
            });
            if (!paymentsRes.ok) throw new Error("Erreur lors de la récupération des transactions");
            const paymentsData = await paymentsRes.json();
            
            // Fetch plans
            const plansRes = await fetch(apiUrl("/pro/subscription-plans"), {
                headers: buildAuthHeaders(),
            });
            const plansData = await plansRes.json().catch(() => ({}));

            // Fetch pro users
            const proUsers = await listUsers({ role: "professionnel" });

            setPayments(paymentsData.items || []);
            setPlans(plansData.plans || []);
            setUsers(proUsers || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatAmount = (amount) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "Date invalide";
        return d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Computations
    const successfulPayments = payments.filter(
        (p) => p.status === "paid" || p.status === "succeeded" || p.status === "success"
    );

    const totalRevenue = successfulPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalTransactions = successfulPayments.length;
    const averageBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Refunds details
    const refundedPayments = payments.filter((p) => p.status === "refunded");
    const requestedRefunds = payments.filter((p) => p.status === "refund_requested");
    const totalRefunded = refundedPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalRefundRequested = requestedRefunds.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Subscription MRR calculations
    const totalPros = users.length;
    const decouverteCount = users.filter((u) => u.subscriptionType === "decouverte" || u.subscriptionType === "gratuit" || !u.subscriptionType).length;
    const proCount = users.filter((u) => u.subscriptionType === "pro_essentiel").length;
    const premiumCount = users.filter((u) => u.subscriptionType === "premium_atelier").length;
    const paidCount = proCount + premiumCount;
    const conversionRate = totalPros > 0 ? (paidCount / totalPros) * 100 : 0;

    const proPrice = plans.find((p) => p.key === "pro_essentiel")?.price_euro ?? 15;
    const premiumPrice = plans.find((p) => p.key === "premium_atelier")?.price_euro ?? 30;
    const estimatedMRR = (proCount * proPrice) + (premiumCount * premiumPrice);

    // Revenue by Source
    const sourceBreakdown = successfulPayments.reduce((acc, curr) => {
        const src = curr.source || "Autre";
        acc[src] = (acc[src] || 0) + (curr.amount || 0);
        return acc;
    }, {});

    const sourceColors = {
        "Abonnement": { bg: "#E5FFBC", text: "#3E4A1A", progress: "var(--primary-color, #a5d6a7)" },
        "Événement": { bg: "#D6EEF0", text: "#2E5C60", progress: "#2e5c60" },
        "Réservation service": { bg: "#eff6ff", text: "#1e40af", progress: "#3b82f6" },
        "Autre": { bg: "#f1f5f9", text: "#475569", progress: "#64748b" }
    };

    const getSourceMeta = (src) => {
        if (src.toLowerCase().includes("abonnement")) return sourceColors["Abonnement"];
        if (src.toLowerCase().includes("événement") || src.toLowerCase().includes("evenement")) return sourceColors["Événement"];
        if (src.toLowerCase().includes("service") || src.toLowerCase().includes("réservation")) return sourceColors["Réservation service"];
        return sourceColors["Autre"];
    };

    return (
        <div style={{ padding: "0" }}>
            {/* Header */}
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Administration</span>
                    <h1>Vue d&apos;ensemble financière</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
                        Indicateurs clés de performance, répartition des revenus et état général de la facturation.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="panel" style={{ padding: "4rem", textAlign: "center" }}>
                    <div className="loading-spinner" style={{ margin: "0 auto 1rem" }}></div>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Calcul des statistiques financières...</p>
                </div>
            ) : error ? (
                <div className="panel" style={{ padding: "3rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
                    <h3 style={{ marginBottom: "0.5rem" }}>Erreur de chargement</h3>
                    <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
                    <button className="action-cta task-action-btn" onClick={fetchData}>Réessayer</button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", minWidth: 0, width: "100%" }}>
                    
                    {/* KPI Cards Grid */}
                    <div className="kpi-grid">
                        <div className="kpi-card glass-premium">
                            <div className="kpi-header">
                                <span className="kpi-title">Revenu Total Encaissé</span>
                                <div className="kpi-icon revenue"><DollarSign size={20} /></div>
                            </div>
                            <div className="kpi-value">{formatAmount(totalRevenue)}</div>
                            <div className="kpi-footer">Sur {totalTransactions} transactions payées</div>
                        </div>

                        <div className="kpi-card glass-premium">
                            <div className="kpi-header">
                                <span className="kpi-title">MRR Estimé (Mensuel)</span>
                                <div className="kpi-icon mrr"><TrendingUp size={20} /></div>
                            </div>
                            <div className="kpi-value">{formatAmount(estimatedMRR)}</div>
                            <div className="kpi-footer">{paidCount} professionnels actifs payants</div>
                        </div>

                        <div className="kpi-card glass-premium">
                            <div className="kpi-header">
                                <span className="kpi-title">Panier Moyen</span>
                                <div className="kpi-icon basket"><CreditCard size={20} /></div>
                            </div>
                            <div className="kpi-value">{formatAmount(averageBasket)}</div>
                            <div className="kpi-footer">Par transaction réussie</div>
                        </div>

                        <div className="kpi-card glass-premium">
                            <div className="kpi-header">
                                <span className="kpi-title">Taux de Conversion Pro</span>
                                <div className="kpi-icon conversion"><Percent size={20} /></div>
                            </div>
                            <div className="kpi-value">{conversionRate.toFixed(1)} %</div>
                            <div className="kpi-footer">{paidCount} sur {totalPros} comptes Pro</div>
                        </div>
                    </div>

                    {/* Secondary Metrics / Breakdown Grid */}
                    <div className="analytics-section">
                        {/* Revenue Breakdown */}
                        <div className="panel chart-panel">
                            <h3>Répartition des revenus</h3>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                                Source de provenance des fonds encaissés.
                            </p>
                            
                            <div className="sources-list">
                                {Object.entries(sourceBreakdown).length === 0 ? (
                                    <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                                        Aucune donnée de répartition disponible.
                                    </div>
                                ) : (
                                    Object.entries(sourceBreakdown)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([source, amount]) => {
                                            const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                                            const meta = getSourceMeta(source);
                                            return (
                                                <div key={source} className="source-item">
                                                    <div className="source-info">
                                                        <span className="source-name" style={{ color: "var(--text-main)", fontWeight: "600" }}>{source}</span>
                                                        <span className="source-amounts">
                                                            <strong style={{ color: "var(--text-main)" }}>{formatAmount(amount)}</strong>
                                                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>({pct.toFixed(1)}%)</span>
                                                        </span>
                                                    </div>
                                                    <div className="progress-bar-bg">
                                                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: meta.progress }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>

                        {/* Subscription & Account Status Info */}
                        <div className="panel status-panel">
                            <h3>Détails des Abonnements</h3>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                                Profil de l&apos;ensemble des professionnels abonnés.
                            </p>
                            
                            <div className="sub-breakdown-list">
                                <div className="sub-breakdown-row">
                                    <span className="badge-wrapper">
                                        <span style={{ display: "inline-flex", width: "10px", height: "10px", borderRadius: "50%", background: "#f1f5f9", marginRight: "8px", border: "1px solid #cbd5e1" }}></span>
                                        Découverte (Gratuit)
                                    </span>
                                    <strong>{decouverteCount} comptes</strong>
                                </div>
                                <div className="sub-breakdown-row">
                                    <span className="badge-wrapper">
                                        <span style={{ display: "inline-flex", width: "10px", height: "10px", borderRadius: "50%", background: "linear-gradient(135deg, #059669 0%, #047857 100%)", marginRight: "8px" }}></span>
                                        Pro Essentiel ({proPrice}€/m)
                                    </span>
                                    <strong>{proCount} comptes</strong>
                                </div>
                                <div className="sub-breakdown-row">
                                    <span className="badge-wrapper">
                                        <span style={{ display: "inline-flex", width: "10px", height: "10px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", marginRight: "8px" }}></span>
                                        Premium Atelier ({premiumPrice}€/m)
                                    </span>
                                    <strong>{premiumCount} comptes</strong>
                                </div>
                            </div>

                            <div className="refund-summary-box">
                                <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: "700" }}>Flux de Remboursements</h4>
                                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "1rem" }}>
                                    <div className="refund-metric">
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Remboursé</span>
                                        <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#2563eb", marginTop: "2px" }}>{formatAmount(totalRefunded)}</div>
                                    </div>
                                    <div className="refund-metric">
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>En attente</span>
                                        <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#b45309", marginTop: "2px" }}>{formatAmount(totalRefundRequested)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions Panel */}
                    <div className="panel" style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                            <h3 style={{ margin: 0 }}>Transactions récentes</h3>
                            <button 
                                onClick={() => window.location.hash = "#/finances/paiements"} 
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--primary-color)",
                                    fontWeight: "600",
                                    fontSize: "0.85rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px"
                                }}
                            >
                                Voir tout l&apos;historique <ArrowUpRight size={14} />
                            </button>
                        </div>

                        {payments.length === 0 ? (
                            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                Aucune transaction récente.
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto", margin: "0", paddingBottom: "1rem", maxWidth: "100%" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", minWidth: "max-content" }}>
                                    <thead>
                                        <tr style={{ textAlign: "left", background: "var(--surface-sunken)" }}>
                                            <th style={{ padding: "0.8rem 1.5rem", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Date & Client</th>
                                            <th style={{ padding: "0.8rem 1.5rem", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Source</th>
                                            <th style={{ padding: "0.8rem 1.5rem", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Montant</th>
                                            <th style={{ padding: "0.8rem 1.5rem", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.slice(0, 5).map((p, idx) => {
                                            const isSuccess = p.status === "paid" || p.status === "succeeded" || p.status === "success";
                                            const isRefunded = p.status === "refunded";
                                            const isPending = p.status === "refund_requested";
                                            
                                            let badgeBg = "#fff1f2", badgeColor = "#e11d48";
                                            if (isSuccess) { badgeBg = "#ecfdf5"; badgeColor = "#059669"; }
                                            else if (isRefunded) { badgeBg = "#eff6ff"; badgeColor = "#2563eb"; }
                                            else if (isPending) { badgeBg = "#fffbeb"; badgeColor = "#b45309"; }

                                            return (
                                                <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                                    <td style={{ padding: "1rem 1.5rem" }}>
                                                        <div style={{ fontWeight: "700", color: "var(--text-main)" }}>{p.entityName}</div>
                                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.userName} • {formatDate(p.date)}</div>
                                                    </td>
                                                    <td style={{ padding: "1rem 1.5rem" }}>
                                                        <span style={{ fontSize: "0.7rem", fontWeight: "600", padding: "2px 6px", background: "rgba(0,0,0,0.04)", borderRadius: "4px" }}>
                                                            {p.source}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "1rem 1.5rem", fontWeight: "700" }}>
                                                        {formatAmount(p.amount)}
                                                    </td>
                                                    <td style={{ padding: "1rem 1.5rem" }}>
                                                        <span style={{
                                                            padding: "3px 8px",
                                                            borderRadius: "999px",
                                                            fontSize: "0.7rem",
                                                            fontWeight: "700",
                                                            background: badgeBg,
                                                            color: badgeColor
                                                        }}>
                                                            {isSuccess ? "Payé" : isRefunded ? "Remboursé" : isPending ? "Remboursement dem." : p.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1.25rem;
                }
                .kpi-card {
                    padding: 1.5rem;
                    border-radius: 24px;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.015);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                @media (max-width: 768px) {
                    .kpi-grid {
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                        width: 100% !important;
                        gap: 1rem !important;
                    }
                    .kpi-card {
                        flex: 1 1 auto !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 120px !important;
                    }
                }
                .kpi-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.03);
                }
                .glass-premium {
                    background: #ffffff;
                }
                .kpi-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                .kpi-title {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .kpi-icon {
                    padding: 7px;
                    border-radius: 12px;
                }
                .kpi-icon.revenue { background: #e8f5e9; color: #2e7d32; }
                .kpi-icon.mrr { background: #e8f5e9; color: #2e7d32; }
                .kpi-icon.basket { background: #e3f2fd; color: #1565c0; }
                .kpi-icon.conversion { background: #fef3c7; color: #b45309; }
                
                .kpi-value {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: var(--text-main);
                    letter-spacing: -0.02em;
                }
                .kpi-footer {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-top: 0.4rem;
                }

                .analytics-section {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr);
                    gap: 1.5rem;
                }
                @media (min-width: 800px) {
                    .analytics-section {
                        grid-template-columns: 3fr 2fr;
                    }
                }

                /* Source Breakdown items */
                .sources-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .source-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                }
                .source-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.88rem;
                }
                .progress-bar-bg {
                    height: 8px;
                    background: #f1f5f9;
                    border-radius: 999px;
                    overflow: hidden;
                    width: 100%;
                }
                .progress-bar-fill {
                    height: 100%;
                    border-radius: 999px;
                    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* Sub breakdowns */
                .sub-breakdown-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.85rem;
                    margin-bottom: 1.5rem;
                }
                .sub-breakdown-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.85rem;
                    padding: 0.4rem 0;
                    border-bottom: 1px dashed var(--border-color);
                }
                .badge-wrapper {
                    display: flex;
                    align-items: center;
                    color: var(--text-muted);
                }
                
                .refund-summary-box {
                    background: var(--surface-hover, #f8fafc);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 1rem;
                    margin-top: 1rem;
                }

                .loading-spinner {
                    width: 32px;
                    height: 32px;
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
