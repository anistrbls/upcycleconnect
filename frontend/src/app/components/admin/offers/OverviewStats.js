"use client";

import { formatDateFR } from "../../../lib/formatters";

// Carte KPI simple (chiffre + label)
function KpiCard({ label, value, accent }) {
    return (
        <div style={{
            background: accent ?? "#F1F6F6",
            borderRadius: "18px",
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
        }}>
            <span style={{ fontSize: "1.9rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1 }}>
                {value ?? 0}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                {label}
            </span>
        </div>
    );
}

// Badge statut coloré
function StatusBadge({ status }) {
    const map = {
        actif:     { bg: "#E5FFBC", color: "#233B3D" },
        inactif:   { bg: "#EAF0F1", color: "#4F6163" },
        brouillon: { bg: "#F3F0FF", color: "#4A3F7A" },
        pending:   { bg: "#FFF5D6", color: "#7A5E00" },
        confirmed: { bg: "#E5FFBC", color: "#233B3D" },
        cancelled: { bg: "#FFE8E8", color: "#8B2020" },
        completed: { bg: "#EAF0F1", color: "#4F6163" },
    };
    const style = map[status] ?? { bg: "#E5E7EB", color: "#374151" };
    return (
        <span style={{
            background: style.bg,
            color: style.color,
            borderRadius: "999px",
            padding: "0.18rem 0.6rem",
            fontSize: "0.73rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
        }}>
            {status}
        </span>
    );
}

// Composant principal
export default function OverviewStats({ data, loading, error, onReload }) {
    if (loading) {
        return <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement des statistiques…</p>;
    }

    if (error) {
        return (
            <div className="panel">
                <p style={{ color: "#a23b3b", fontSize: "0.9rem" }}>{error}</p>
                <button className="action-cta" type="button" onClick={onReload} style={{ marginTop: "0.75rem" }}>
                    Réessayer
                </button>
            </div>
        );
    }

    const d = data ?? {};

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Offres &amp; prestations</span>
                    <h1>Vue d&apos;ensemble</h1>
                </div>
                <button className="action-cta" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <KpiCard label="Prestations total" value={d.servicesTotal} />
                <KpiCard label="Prestations actives" value={d.servicesActive} accent="#E5FFBC" />
                <KpiCard label="Prestations inactives" value={d.servicesInactive} />
                <KpiCard label="Catégories" value={d.categoriesTotal} />
                <KpiCard label="Réservations total" value={d.bookingsTotal} />
                <KpiCard label="Réservations en attente" value={d.bookingsPending} accent="#FFF5D6" />
                <KpiCard label="Réservations confirmées" value={d.bookingsConfirmed} accent="#E5FFBC" />
            </div>

            {/* Deux colonnes : réservations récentes + prestations récentes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>

                {/* Réservations récentes */}
                <div className="panel">
                    <div className="section-header" style={{ marginBottom: "1rem" }}>
                        <span className="section-title">Réservations récentes</span>
                    </div>
                    {(d.recentBookings ?? []).length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucune réservation.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                            {d.recentBookings.map((b) => (
                                <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: "0.88rem" }}>{b.userName}</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{b.serviceName}</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                                        <StatusBadge status={b.status} />
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                            {b.amount != null ? `${Number(b.amount).toFixed(2)} €` : "-"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Prestations récentes */}
                <div className="panel">
                    <div className="section-header" style={{ marginBottom: "1rem" }}>
                        <span className="section-title">Prestations récentes</span>
                    </div>
                    {(d.recentServices ?? []).length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucune prestation.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                            {d.recentServices.map((s) => (
                                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: "0.88rem" }}>{s.name}</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{s.categoryName || "-"}</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                                        <StatusBadge status={s.status} />
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                            {s.price != null ? `${Number(s.price).toFixed(2)} €` : "-"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </>
    );
}
