"use client";

import { DISTINCT } from "../../lib/constants";
import { formatDateTimeFR } from "../../lib/formatters";

const KpiCard = ({ title, value, trend, accent }) => (
    <div className={`kpi-card${accent ? " kpi-card-accent" : ""}`}>
        <span className="kpi-title">{title}</span>
        <div className="kpi-value">{value}</div>
        {trend && <span className={`kpi-trend ${trend.up ? "kpi-up" : trend.warn ? "kpi-down" : "kpi-neutral"}`}>{trend.label}</span>}
    </div>
);

import { useRouter } from "next/navigation";

const EventRow = ({ event }) => {
    const router = useRouter();
    const start = new Date(event.dateDebut);
    const dateStr = Number.isNaN(start.getTime()) ? "-" : start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = Number.isNaN(start.getTime()) ? "" : start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    return (
        <div 
            onClick={() => router.push(`/salarie-formations/mes-evenements?id=${event.id}`)}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0", borderBottom: "1px solid #EAF0F1", cursor: "pointer", transition: "background 0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
            <div style={{ background: "#E5FFBC", borderRadius: "12px", padding: "0.4rem 0.7rem", minWidth: "72px", textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>{dateStr.split(" ")[1]?.toUpperCase()}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1 }}>{dateStr.split(" ")[0]}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{timeStr} — {event.lieu || "Lieu non précisé"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", alignItems: "flex-end", flexShrink: 0 }}>
                <span className="db-badge" style={{
                    background: event.status === "valide" ? "#E5FFBC" : event.status === "annule" ? "#FDE8E8" : "#EAF4FF",
                    color: event.status === "annule" ? "#B24A4A" : "inherit",
                    textTransform: "capitalize",
                }}>{event.status}</span>
                {event.validationStatus === "pending" && (
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A", fontSize: "0.7rem" }}>En attente</span>
                )}
                {event.validationStatus === "rejected" && (
                    <span className="db-badge" style={{ background: "#FDE8E8", color: "#B24A4A", fontSize: "0.7rem" }}>Refusé</span>
                )}
            </div>
        </div>
    );
};

const PendingRow = ({ item }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0", borderBottom: "1px solid #EAF0F1" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: DISTINCT.orange, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.subtitle}</div>
        </div>
        <span className="db-badge" style={{ background: "#FFF3E0", color: DISTINCT.orange, flexShrink: 0 }}>En attente</span>
    </div>
);

export default function SalarieDashboard({ subpage, events = [], contents = [] }) {
    const now = new Date();
    const upcomingEvents = events
        .filter(e => new Date(e.dateDebut) >= now)
        .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))
        .slice(0, 5);

    const pendingContents = contents.filter(c => c.status === "en_attente");

    const showResume = subpage === "resume";
    const showEvents = subpage === "prochains-evenements" || subpage === "resume";
    const showPending = subpage === "en-attente" || subpage === "resume";

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Espace salarié</span>
                    <h1>Tableau de bord</h1>
                </div>
            </div>

            {showResume && (
                <>
                    <div className="db-section-label">Vue d'ensemble</div>
                    <div className="kpi-grid">
                        <KpiCard title="Événements à venir" value={upcomingEvents.length} trend={{ label: "Ce mois", up: true }} />
                        <KpiCard title="Contenus publiés" value={contents.filter(c => c.status === "publie").length} trend={{ label: "Actifs", up: true }} />
                        <KpiCard title="En attente de validation" value={pendingContents.length} trend={{ label: pendingContents.length > 0 ? "À traiter" : "Tout est à jour", warn: pendingContents.length > 0 }} accent={pendingContents.length > 0} />
                        <KpiCard title="Formations planifiées" value={events.filter(e => e.type === "formation" && new Date(e.dateDebut) >= now).length} trend={{ label: "À venir" }} />
                    </div>
                </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: showResume ? "1fr 1fr" : "1fr", gap: "1rem", marginTop: "0.5rem" }}>
                {showEvents && (
                    <div className="panel">
                        <div className="section-header" style={{ marginBottom: "0.5rem" }}>
                            <span className="section-title">Prochains événements</span>
                            <span className="db-badge">{upcomingEvents.length}</span>
                        </div>
                        {upcomingEvents.length === 0
                            ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Aucun événement à venir.</p>
                            : upcomingEvents.map(e => <EventRow key={e.id} event={e} />)
                        }
                    </div>
                )}

                {showPending && (
                    <div className="panel">
                        <div className="section-header" style={{ marginBottom: "0.5rem" }}>
                            <span className="section-title">En attente de validation</span>
                            <span className="db-badge">{pendingContents.length}</span>
                        </div>
                        {pendingContents.length === 0
                            ? <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Aucun élément en attente.</p>
                            : pendingContents.map((item, i) => <PendingRow key={i} item={{ title: item.title, subtitle: item.type === "conseil" ? "Conseil" : "Actualité" }} />)
                        }
                    </div>
                )}
            </div>
        </>
    );
}
