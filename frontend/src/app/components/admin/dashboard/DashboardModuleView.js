"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { DISTINCT, FLUX_DISTINCT, LEVEL_COLORS } from "../../../lib/constants";
import { Icon, SearchIcon } from "../Icon";

function ProVueGlobaleHome({ title }) {
    const tiles = [
        {
            href: "/annonces/disponible",
            label: "Annonces disponibles",
            desc: "Parcourir et réserver des objets.",
            icon: "M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6 M12 12V2 M12 2l4 4 M12 2L8 6",
        },
        {
            href: "/projets/mes-projets",
            label: "Mes projets",
            desc: "Créer et suivre vos projets d’upcycling.",
            icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        },
        {
            href: "/forum/sujets",
            label: "Forum",
            desc: "Échanger avec la communauté.",
            icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        },
        {
            href: "/mon-compte",
            label: "Mon compte",
            desc: "Profil, entreprise et préférences.",
            icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
        },
    ];

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Espace professionnel</span>
                    <h1>{title}</h1>
                    <p style={{ marginTop: "0.5rem", color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "42rem" }}>
                        Accédez rapidement aux modules principaux de votre activité sur UpcycleConnect.
                    </p>
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "1rem",
                    marginTop: "1.5rem",
                }}
            >
                {tiles.map((tile) => (
                    <Link
                        key={tile.href}
                        href={tile.href}
                        className="panel"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                            padding: "1.25rem",
                            textDecoration: "none",
                            color: "inherit",
                            borderRadius: "12px",
                            transition: "box-shadow 0.15s ease, transform 0.15s ease",
                        }}
                    >
                        <span className="sidebar-icon" style={{ alignSelf: "flex-start" }}>
                            <Icon path={tile.icon} />
                        </span>
                        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{tile.label}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.45 }}>{tile.desc}</div>
                    </Link>
                ))}
            </div>
        </>
    );
}

const AlertRow = ({ title, desc, count, level, action }) => (
    <div className="alert-row">
        <div className="alert-level-dot" style={{ background: LEVEL_COLORS[level] || "#ccc" }}></div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>{title}</span>
                {count !== null && <span className="alert-count-text">{count}</span>}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{desc}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
            <button className="action-cta alert-action-btn">{action}</button>
        </div>
    </div>
);

export default function DashboardModuleView({ subpage, title }) {
    const showGlobalKpis = subpage === "vue-generale" || subpage === "kpis-stats";
    const showGlobalRealtime = subpage === "vue-generale" || subpage === "activite-temps-reel";
    const showGlobalAlerts = subpage === "vue-generale" || subpage === "alertes";

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionRole, setSessionRole] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function loadRole() {
            try {
                const res = await fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setSessionRole(data.user?.role ?? null);
                }
            } catch {
                if (!cancelled) setSessionRole(null);
            }
        }
        loadRole();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (sessionRole === null) {
            return;
        }
        if (sessionRole === "professionnel") {
            setLoading(false);
            return;
        }
        if (!showGlobalKpis && !showGlobalRealtime && !showGlobalAlerts) {
            setLoading(false);
            return;
        }
        async function fetchStats() {
            try {
                const res = await fetch(apiUrl("/admin/dashboard/stats"), {
                    headers: buildAuthHeaders(),
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Error fetching stats", err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [sessionRole, showGlobalKpis, showGlobalRealtime, showGlobalAlerts]);

    if (sessionRole === null && subpage === "vue-generale") {
        return <div style={{ padding: "1.5rem" }}>Chargement...</div>;
    }

    if (sessionRole === "professionnel" && subpage === "vue-generale") {
        return <ProVueGlobaleHome title={title} />;
    }

    const safe = (val) => stats ? (stats[val] || 0) : 0;

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Tableau de bord de gestion</span>
                    <h1>{title}</h1>
                </div>
            </div>

            {showGlobalKpis ? (
                <>
                    <div className="db-section-label">KPIs & Statistiques</div>
                    {loading ? <div style={{ padding: "1rem" }}>Chargement...</div> : (
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <span className="kpi-title">Utilisateurs actifs totaux</span>
                            <div className="kpi-value">{safe("totalUsers")}</div>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Particuliers inscrits</span>
                            <div className="kpi-value">{safe("particuliers")}</div>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Artisans / Pros actifs</span>
                            <div className="kpi-value">{safe("pros")}</div>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Salariés / Animateurs actifs</span>
                            <div className="kpi-value">{safe("salaries")}</div>
                        </div>
                        <div className="kpi-card kpi-card-warn">
                            <span className="kpi-title">Annonces en attente de validation</span>
                            <div className="kpi-value">{safe("pendingItems")}</div>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Objets dispo dans les conteneurs</span>
                            <div className="kpi-value">{safe("itemsInContainers")}</div>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Annonces de Don</span>
                            <div className="kpi-value">{safe("donItems")}</div>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Annonces de Vente</span>
                            <div className="kpi-value">{safe("venteItems")}</div>
                        </div>
                        <div className="kpi-card kpi-card-accent">
                            <span className="kpi-title">Projets d'upcycling publiés</span>
                            <div className="kpi-value">{safe("upcyclingProjects")}</div>
                        </div>
                    </div>
                    )}

                    <div className="stats-row">
                        <div className="panel stats-panel">
                            <div className="section-header">
                                <span className="section-title">Répartition des activités</span>
                                <span className="db-badge">Ce mois</span>
                            </div>
                            <div className="stat-list">
                                <div className="stat-row"><span className="stat-label">Annonces de don</span><span className="stat-value">{safe("donItems")}</span><div className="stat-bar"><div className="stat-bar-fill" style={{ width: "68%", background: DISTINCT.blue }}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Annonces de vente</span><span className="stat-value">{safe("venteItems")}</span><div className="stat-bar"><div className="stat-bar-fill" style={{ width: "59%", background: DISTINCT.orange }}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Réservations formations</span><span className="stat-value">0</span><div className="stat-bar"><div className="stat-bar-fill" style={{ width: "0%", background: DISTINCT.emerald }}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Événements à venir</span><span className="stat-value">0</span><div className="stat-bar"><div className="stat-bar-fill" style={{ width: "0%", background: DISTINCT.violet }}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Projets d'upcycling suivis</span><span className="stat-value">{safe("upcyclingProjects")}</span><div className="stat-bar"><div className="stat-bar-fill" style={{ width: "43%", background: DISTINCT.cyan }}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Taux de validation annonces</span><span className="stat-value stat-highlight">-- %</span><div className="stat-bar"><div className="stat-bar-fill" style={{ width: "0%", background: DISTINCT.magenta }}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Remplissage moyen conteneurs</span><span className="stat-value stat-warn">-- %</span><div className="stat-bar"><div className="stat-bar-fill" style={{ width: "0%", background: DISTINCT.red }}></div></div></div>
                            </div>
                        </div>

                        <div className="panel stats-panel">
                            <div className="section-header">
                                <span className="section-title">Finance rapide</span>
                                <span className="db-badge">Ce mois</span>
                            </div>
                            <div className="finance-grid">
                                <div className="finance-block"><span className="finance-label">Abonnements</span><span className="finance-amount">0 €</span></div>
                                <div className="finance-block"><span className="finance-label">Commissions</span><span className="finance-amount">0 €</span></div>
                                <div className="finance-block"><span className="finance-label">Ateliers / Formations</span><span className="finance-amount">0 €</span></div>
                                <div className="finance-block"><span className="finance-label">Publicités / Partenariats</span><span className="finance-amount">0 €</span></div>
                            </div>
                            <div className="finance-total">
                                <span>Total mensuel</span>
                                <span className="finance-total-amount">0 €</span>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}

            {showGlobalRealtime ? (
                <>
                    <div className="db-section-label" style={{ marginTop: "2rem" }}>Activité Temps Réel</div>

                    <div className="realtime-grid">
                        <div className="gradient-panel realtime-flux">
                            <div className="section-header" style={{ marginBottom: "1.25rem" }}>
                                <span className="section-title" style={{ color: "var(--text-main)" }}>Flux d'activité en direct</span>
                                <span className="live-dot"><span className="live-pulse"></span>Live</span>
                            </div>
                            <div className="search-bar" style={{ marginBottom: "1.25rem" }}>
                                <SearchIcon />
                                <input type="text" placeholder="Rechercher une action, un acteur, une annonce..." />
                            </div>
                            <div className="flux-list">
                                <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucun événement récent.</div>
                            </div>
                        </div>

                        <div className="realtime-right">
                            <div className="panel" style={{ marginBottom: "1.25rem" }}>
                                <div className="section-header">
                                    <span className="section-title">Résumé des opérations du jour</span>
                                    <span className="db-badge">Aujourd'hui</span>
                                </div>
                                <div className="ops-grid">
                                    {[
                                        { label: "Annonces déposées", val: "0", color: DISTINCT.blue },
                                        { label: "Annonces validées", val: "0", color: DISTINCT.emerald },
                                        { label: "Dépôts conteneurs traités", val: "0", color: DISTINCT.violet },
                                        { label: "Objets récupérés", val: "0", color: DISTINCT.orange },
                                        { label: "Inscriptions formations", val: "0", color: DISTINCT.cyan },
                                        { label: "Paiements confirmés", val: "0", color: DISTINCT.red },
                                        { label: "Nouveaux abonnements", val: "0", color: DISTINCT.magenta },
                                        { label: "Notifications push", val: "0", color: DISTINCT.teal },
                                    ].map((item, index) => (
                                        <div key={index} className="ops-cell">
                                            <span className="ops-val" style={{ color: item.color }}>{item.val}</span>
                                            <span className="ops-label">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="panel">
                                <div className="section-header">
                                    <span className="section-title">Événements système</span>
                                    <span className="db-badge">Récents</span>
                                </div>
                                <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucun événement système.</div>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}

            {showGlobalAlerts ? (
                <>
                    <div className="db-section-label" style={{ marginTop: "2rem" }}>Alertes & Priorités</div>

                    <div className="alerts-grid">
                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Validations en attente</span>
                            </div>
                            {safe("pendingItems") > 0 ? (
                                <AlertRow title="Annonces à modérer" desc={`${safe("pendingItems")} annonces en attente de relecture`} count={safe("pendingItems")} level="élevé" action="Voir" />
                            ) : (
                                <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucune validation en attente.</div>
                            )}
                        </div>

                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Alertes opérationnelles</span>
                            </div>
                            <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucune alerte opérationnelle.</div>
                        </div>

                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Modération communautaire</span>
                            </div>
                            <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucun signalement communautaire.</div>
                        </div>

                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Alertes administratives</span>
                            </div>
                            <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucune alerte administrative.</div>
                        </div>
                    </div>

                    <div className="db-section-label" style={{ marginTop: "2rem" }}>Synthèse opérationnelle</div>

                    <div className="bottom-grid">
                        <div className="panel">
                            <div className="section-header">
                                <span className="section-title">À traiter rapidement</span>
                            </div>
                            <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucune tâche à traiter.</div>
                        </div>

                        <div className="panel">
                            <div className="section-header">
                                <span className="section-title">Planning rapide</span>
                            </div>
                            <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucun événement planifié.</div>
                        </div>

                        <div className="panel">
                            <div className="section-header">
                                <span className="section-title">Top zones actives</span>
                            </div>
                            <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Données insuffisantes pour les zones.</div>
                        </div>

                        <div className="panel">
                            <div className="section-header">
                                <span className="section-title">Top artisans / partenaires</span>
                            </div>
                            <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Données insuffisantes pour les artisans.</div>
                        </div>
                    </div>
                </>
            ) : null}
        </>
    );
}
