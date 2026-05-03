"use client";

import { useEffect, useState } from "react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { DISTINCT, FLUX_DISTINCT, LEVEL_COLORS } from "../../../lib/constants";
import { Icon, SearchIcon } from "../Icon";

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

    useEffect(() => {
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
    }, [showGlobalKpis, showGlobalRealtime, showGlobalAlerts]);

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
