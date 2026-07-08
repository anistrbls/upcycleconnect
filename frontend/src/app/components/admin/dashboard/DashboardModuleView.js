"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { DISTINCT, FLUX_DISTINCT, LEVEL_COLORS } from "../../../lib/constants";
import { Icon, SearchIcon } from "../Icon";
import { Gift, Tag, Calendar, CalendarDays, Hammer, CheckCircle, Trash2 } from "lucide-react";

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
            desc: "Créer et suivre vos projets d'upcycling.",
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

    const [stats, setStats] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchStats() {
            try {
                const res = await fetch(apiUrl("/user/dashboard/stats"), { headers: buildAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setStats(data);
                }
            } catch (err) { }
        }
        fetchStats();
        return () => { cancelled = true; };
    }, []);

    const safe = (val) => stats ? (stats[val] || 0) : 0;

    if (stats && stats.subscriptionType === "premium_atelier") {
        return <PremiumAtelierDashboard title={title} stats={stats} />;
    }

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

            {stats && (
                <>
                    <div className="db-section-label">Mes statistiques</div>
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <span className="kpi-title">Objets traités</span>
                            <div className="kpi-value">{safe("objetsTraites")}</div>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Réservations gérées</span>
                            <div className="kpi-value">{safe("reservationsGerees")}</div>
                        </div>
                        <div className="kpi-card kpi-card-accent">
                            <span className="kpi-title">Abonnement(s) actif(s)</span>
                            <div className="kpi-value">{safe("totalAbonnements")}</div>
                        </div>
                    </div>

                    {stats.depenses && (
                        <>
                            <div className="db-section-label">Finance</div>
                            <div className="stats-row">
                                <div className="panel stats-panel">
                                    <div className="section-header">
                                        <span className="section-title">Mes dépenses</span>
                                        <span className="db-badge">Ce mois</span>
                                    </div>
                                    <div className="finance-grid">
                                        <div className="finance-block">
                                            <span className="finance-label">Abonnement</span>
                                            <span className="finance-amount">{(stats.depenses.abonnement || 0).toFixed(2)} €</span>
                                        </div>
                                        <div className="finance-block">
                                            <span className="finance-label">Ateliers / Formations</span>
                                            <span className="finance-amount">{(stats.depenses.ateliers || 0).toFixed(2)} €</span>
                                        </div>
                                        <div className="finance-block">
                                            <span className="finance-label">Événements</span>
                                            <span className="finance-amount">{(stats.depenses.evenements || 0).toFixed(2)} €</span>
                                        </div>
                                    </div>
                                    <div className="finance-total">
                                        <span>Total dépensé ce mois</span>
                                        <span className="finance-total-amount">{(stats.depenses.total || 0).toFixed(2)} €</span>
                                    </div>
                                </div>

                                <div className="panel stats-panel">
                                    <div className="section-header">
                                        <span className="section-title">Mon profil Pro</span>
                                    </div>
                                    <div className="finance-grid" style={{ marginTop: "1rem", gap: "1rem" }}>
                                        <div className="finance-block" style={{ background: "rgba(0,0,0,0.02)" }}>
                                            <span className="finance-label">Abonnement actuel</span>
                                            <span className="finance-amount" style={{ fontSize: "1.1rem", color: "var(--forest-deep)", marginTop: "0.2rem" }}>
                                                {stats.subscriptionType === 'premium_atelier' ? 'Premium Atelier' : (stats.subscriptionType === 'pro_essentiel' ? 'Pro Essentiel' : 'Découverte')}
                                            </span>
                                        </div>
                                        <div className="finance-block" style={{ background: "rgba(0,0,0,0.02)" }}>
                                            <span className="finance-label">Note acheteur</span>
                                            <span className="finance-amount" style={{ fontSize: "1.1rem", color: "var(--forest-deep)", marginTop: "0.2rem" }}>
                                                {stats.sellerRatingAvg ? `${stats.sellerRatingAvg.toFixed(1)} / 5` : 'N/A'} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>({stats.sellerRatingCount || 0} avis)</span>
                                            </span>
                                        </div>
                                        <div className="finance-block" style={{ background: "rgba(0,0,0,0.02)" }}>
                                            <span className="finance-label">Score UC Connect</span>
                                            <span className="finance-amount" style={{ fontSize: "1.1rem", color: "var(--forest-deep)", marginTop: "0.2rem" }}>
                                                {stats.userScore ? `${stats.userScore.toFixed(0)} pts` : '0 pts'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginBottom: "2rem" }}></div>
                        </>
                    )}
                </>
            )}

            <div className="db-section-label">Accès rapides</div>
            <div className="kpi-grid">
                {tiles.map((tile) => (
                    <Link
                        key={tile.href}
                        href={tile.href}
                        className="panel"
                        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem", textDecoration: "none", color: "inherit" }}
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

// ─── Premium Atelier: SVG helpers ────────────────────────────────────────────

function SvgLineChart({ data, color = "#15803d" }) {
    const W = 580; const H = 128;
    const PAD = { top: 22, right: 12, bottom: 28, left: 12 };
    const iW = W - PAD.left - PAD.right;
    const iH = H - PAD.top - PAD.bottom;

    if (!data || data.length === 0) {
        return (
            <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: "0.8rem" }}>
                Aucune récupération enregistrée sur les 8 dernières semaines
            </div>
        );
    }

    const maxVal = Math.max(...data.map((d) => d.count), 1);
    const n = data.length;
    const xPos = (i) => PAD.left + (n === 1 ? iW / 2 : (i / (n - 1)) * iW);
    const yPos = (v) => PAD.top + iH - (v / maxVal) * iH;
    const pts = data.map((d, i) => `${xPos(i)},${yPos(d.count)}`).join(" ");
    const area = [
        `M ${xPos(0)},${PAD.top + iH}`,
        ...data.map((d, i) => `L ${xPos(i)},${yPos(d.count)}`),
        `L ${xPos(n - 1)},${PAD.top + iH}`,
        "Z",
    ].join(" ");

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, overflow: "visible" }}>
            <defs>
                <linearGradient id="prem-lg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
                {[0.25, 0.5, 0.75, 1].map((p) => (
                <line key={p} x1={PAD.left} y1={PAD.top + iH * (1 - p)} x2={W - PAD.right} y2={PAD.top + iH * (1 - p)}
                    stroke="rgba(35,59,61,0.12)" strokeWidth="1" />
            ))}
            <path d={area} fill="url(#prem-lg)" />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {data.map((d, i) => (
                <g key={i}>
                    <circle cx={xPos(i)} cy={yPos(d.count)} r="4" fill={color} stroke="rgba(35,59,61,0.38)" strokeWidth="1.5" />
                    {d.count > 0 && (
                        <text x={xPos(i)} y={yPos(d.count) - 9} textAnchor="middle" fontSize="10" fill={color} fontWeight="700">{d.count}</text>
                    )}
                    <text x={xPos(i)} y={H - 3} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{d.weekLabel}</text>
                </g>
            ))}
        </svg>
    );
}

function HorizontalBars({ data, color = "#15803d" }) {
    if (!data || data.length === 0)
        return <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", padding: "0.4rem 0" }}>Aucun matériau récupéré</div>;
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ minWidth: "100px", fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.material}>{d.material}</span>
                    <div style={{ flex: 1, height: "9px", background: "rgba(35,59,61,0.10)", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ width: `${(d.count / max) * 100}%`, height: "100%", background: color, borderRadius: "999px", opacity: 0.85 }} />
                    </div>
                    <span style={{ minWidth: "22px", fontSize: "0.78rem", color, fontWeight: 800, textAlign: "right" }}>{d.count}</span>
                </div>
            ))}
        </div>
    );
}

function PremiumAtelierDashboard({ title, stats }) {
    const totalKg = ((stats.totalWeightGrams || 0) / 1000).toFixed(1);
    const co2Saved = ((stats.totalWeightGrams || 0) / 1000 * 2.5).toFixed(1);
    const thisMonth = stats.thisMonthRecoveries || 0;
    const total = stats.objetsTraites || 0;
    const activeProjects = stats.activeProjects || 0;
    const score = stats.userScore ? Math.round(stats.userScore) : 0;
    const watchlist = stats.watchlistCount || 0;
    const rbt = stats.recoveryByType || { don: 0, vente: 0 };
    const typeTotal = rbt.don + rbt.vente;
    const donPct = typeTotal > 0 ? Math.round((rbt.don / typeTotal) * 100) : 0;
    const ventePct = typeTotal > 0 ? 100 - donPct : 0;
    const dep = stats.depenses || {};

    const C = {
        green: "#15803d", cyan: "#0e7490", purple: "#7c3aed", yellow: "#ca8a04", pink: "#be185d",
    };

    const kpis = [
        { label: "Récupérations ce mois", value: thisMonth, className: "kpi-card" },
        { label: "Total récupérés", value: total, className: "kpi-card" },
        { label: "Projets publiés", value: activeProjects, className: "kpi-card" },
        { label: "Score UC Connect", value: `${score} pts`, className: "kpi-card kpi-card-accent" },
        { label: "Poids récupéré", value: `${totalKg} kg`, className: "kpi-card" },
        { label: "Watchlist", value: watchlist, className: "kpi-card kpi-card-warn" },
    ];

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Espace professionnel</span>
                    <h1>{title}</h1>
                    <p style={{ marginTop: "0.5rem", color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "42rem" }}>
                        Tableau de bord Premium Atelier avec vos indicateurs avancés et vos données en temps réel.
                    </p>
                </div>
            </div>

            <div className="db-section-label">Mes statistiques</div>
            <div className="kpi-grid">
                {kpis.map((k, i) => (
                    <div key={i} className={k.className}>
                        <span className="kpi-title">{k.label}</span>
                        <div className="kpi-value">{k.value}</div>
                    </div>
                ))}
            </div>

            <div className="db-section-label">Analytique avancée</div>
            <div className="stats-row">
                <div className="panel stats-panel">
                    <div className="section-header">
                        <span className="section-title">Récupérations / semaine</span>
                        <span className="db-badge">8 semaines</span>
                    </div>
                    <SvgLineChart data={stats.weeklyRecoveries || []} />
                </div>
                <div className="panel stats-panel">
                    <div className="section-header">
                        <span className="section-title">Top matériaux récupérés</span>
                        <span className="db-badge">Volume</span>
                    </div>
                    <HorizontalBars data={stats.materialBreakdown || []} />
                </div>
            </div>

            <div className="db-section-label">Impact et finance</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.4rem" }}>
                <div className="panel stats-panel">
                    <div className="section-header">
                        <span className="section-title">Impact écologique estimé</span>
                    </div>
                    <div className="finance-grid" style={{ gridTemplateColumns: "1fr" }}>
                        <div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Matière détournée</div>
                            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.green }}>{totalKg} kg</div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>CO₂ évité</div>
                            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.cyan }}>{co2Saved} kg</div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>~2.5 kg CO₂ par kg recyclé</div>
                        </div>
                    </div>
                </div>

                <div className="panel stats-panel">
                    <div className="section-header">
                        <span className="section-title">Répartition don / vente</span>
                    </div>
                    {typeTotal > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <div style={{ height: "11px", background: "var(--surface-sunken)", borderRadius: "999px", overflow: "hidden", display: "flex", border: "1px solid var(--border-color)" }}>
                                <div style={{ width: `${donPct}%`, background: C.green, transition: "width .6s ease" }} />
                                <div style={{ width: `${ventePct}%`, background: C.pink, transition: "width .6s ease" }} />
                            </div>
                            <div style={{ display: "flex", gap: "1rem" }}>
                                {[{ label: "Don", pct: donPct, color: C.green, val: rbt.don }, { label: "Vente", pct: ventePct, color: C.pink, val: rbt.vente }].map((x) => (
                                    <div key={x.label} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: x.color }} />
                                        <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{x.label} <strong style={{ color: x.color }}>{x.pct}%</strong></span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{typeTotal} objets au total</div>
                        </div>
                    ) : (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Aucune donnée disponible</div>
                    )}
                </div>

                <div className="panel stats-panel">
                    <div className="section-header">
                        <span className="section-title">Dépenses ce mois</span>
                        <span className="db-badge">Ce mois</span>
                    </div>
                    <div className="finance-grid" style={{ gridTemplateColumns: "1fr", gap: "0.7rem" }}>
                        {[
                            { label: "Abonnement", val: dep.abonnement || 0, color: C.purple },
                            { label: "Ateliers", val: dep.ateliers || 0, color: C.cyan },
                            { label: "Événements", val: dep.evenements || 0, color: C.yellow },
                        ].map((it) => (
                            <div key={it.label} className="finance-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{it.label}</span>
                                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: it.color }}>{it.val.toFixed(2)} €</span>
                            </div>
                        ))}
                    </div>
                    <div className="finance-total" style={{ marginTop: "1rem" }}>
                        <span>Total dépensé ce mois</span>
                        <span className="finance-total-amount" style={{ color: C.green }}>{(dep.total || 0).toFixed(2)} €</span>
                    </div>
                </div>
            </div>

            {/* Quick links */}
            <div className="db-section-label">Accès rapides</div>
            <div className="kpi-grid">
                {[
                    { href: "/annonces/disponible", label: "Annonces disponibles", desc: "Parcourir et réserver des objets.", icon: "M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6 M12 12V2 M12 2l4 4 M12 2L8 6" },
                    { href: "/projets/mes-projets", label: "Mes projets", desc: "Créer et suivre vos projets.", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
                    { href: "/annonces/mes-recuperations", label: "Mes récupérations", desc: "Suivi de vos réservations.", icon: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM4 7l8-4 8 4" },
                    { href: "/forum/sujets", label: "Forum", desc: "Échanger avec la communauté.", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
                ].map((tile) => (
                    <Link key={tile.href} href={tile.href} className="panel" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem", textDecoration: "none", color: "inherit" }}>
                        <span className="sidebar-icon" style={{ alignSelf: "flex-start" }}><Icon path={tile.icon} /></span>
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

function ParticulierVueGlobaleHome({ title }) {
    const tiles = [
        {
            href: "/annonces/deposer",
            label: "Déposer une annonce",
            desc: "Donner ou vendre un objet.",
            icon: "M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6 M12 12V2 M12 2l4 4 M12 2L8 6",
        },
        {
            href: "/prestations/mes-reservations",
            label: "Mes réservations",
            desc: "Suivre vos ateliers et formations.",
            icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        },
        {
            href: "/evenements/activites",
            label: "Événements",
            desc: "Découvrir les activités à venir.",
            icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
        },
        {
            href: "/mon-compte",
            label: "Mon compte",
            desc: "Gérer votre profil et vos préférences.",
            icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
        },
    ];

    const [stats, setStats] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchStats() {
            try {
                const res = await fetch(apiUrl("/user/dashboard/stats"), { headers: buildAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setStats(data);
                }
            } catch (err) { }
        }
        fetchStats();
        return () => { cancelled = true; };
    }, []);

    const safe = (val) => stats ? (stats[val] || 0) : 0;

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Espace particulier</span>
                    <h1>{title}</h1>
                    <p style={{ marginTop: "0.5rem", color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "42rem" }}>
                        Bienvenue sur votre espace UpcycleConnect. Déposez vos objets, participez à des ateliers et rejoignez la communauté.
                    </p>
                </div>
            </div>

            {stats && (
                <>
                    <div className="db-section-label">Mes statistiques</div>
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <span className="kpi-title">Annonces déposées</span>
                            <div className="kpi-value">{safe("annoncesDeposees")}</div>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Annonces actives</span>
                            <div className="kpi-value">{safe("annoncesActives")}</div>
                        </div>
                        <div className="kpi-card kpi-card-warn">
                            <span className="kpi-title">Réservations en cours</span>
                            <div className="kpi-value">{safe("reservationsEnCours")}</div>
                        </div>
                        <div className="kpi-card kpi-card-accent">
                            <span className="kpi-title">Objets donnés / récupérés</span>
                            <div className="kpi-value">{safe("objetsDonnes")}</div>
                        </div>
                    </div>

                    {(stats.depenses || stats.revenus) && (
                        <>
                            <div className="db-section-label">Finance</div>
                            <div className="stats-row">
                                {stats.depenses && (
                                    <div className="panel stats-panel">
                                        <div className="section-header">
                                            <span className="section-title">Mes dépenses</span>
                                            <span className="db-badge">Ce mois</span>
                                        </div>
                                        <div className="finance-grid">
                                            <div className="finance-block">
                                                <span className="finance-label">Achats d'objets</span>
                                                <span className="finance-amount">{(stats.depenses.objets || 0).toFixed(2)} €</span>
                                            </div>
                                            <div className="finance-block">
                                                <span className="finance-label">Ateliers / Formations</span>
                                                <span className="finance-amount">{(stats.depenses.ateliers || 0).toFixed(2)} €</span>
                                            </div>
                                            <div className="finance-block">
                                                <span className="finance-label">Événements</span>
                                                <span className="finance-amount">{(stats.depenses.evenements || 0).toFixed(2)} €</span>
                                            </div>
                                        </div>
                                        <div className="finance-total">
                                            <span>Total dépensé ce mois</span>
                                            <span className="finance-total-amount">{(stats.depenses.total || 0).toFixed(2)} €</span>
                                        </div>
                                    </div>
                                )}
                                {stats.revenus && (
                                    <div className="panel stats-panel">
                                        <div className="section-header">
                                            <span className="section-title">Mes revenus</span>
                                            <span className="db-badge">Ce mois</span>
                                        </div>
                                        <div className="finance-grid">
                                            <div className="finance-block">
                                                <span className="finance-label">Ventes d'items</span>
                                                <span className="finance-amount">{(stats.revenus.ventes || 0).toFixed(2)} €</span>
                                            </div>
                                        </div>
                                        <div className="finance-total">
                                            <span>Total encaissé ce mois</span>
                                            <span className="finance-total-amount">{(stats.revenus.total || 0).toFixed(2)} €</span>
                                        </div>
                                    </div>
                                )}

                                <div className="panel stats-panel">
                                    <div className="section-header">
                                        <span className="section-title">Mon profil</span>
                                    </div>
                                    <div className="finance-grid" style={{ marginTop: "1rem", gap: "1rem", gridTemplateColumns: "1fr" }}>
                                        <div className="finance-block" style={{ background: "rgba(0,0,0,0.02)" }}>
                                            <span className="finance-label">Note vendeur</span>
                                            <span className="finance-amount" style={{ fontSize: "1.1rem", color: "var(--forest-deep)", marginTop: "0.2rem" }}>
                                                {stats.sellerRatingAvg ? `${stats.sellerRatingAvg.toFixed(1)} / 5` : 'N/A'} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>({stats.sellerRatingCount || 0} avis)</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginBottom: "2rem" }}></div>
                        </>
                    )}
                </>
            )}

            <div className="db-section-label">Accès rapides</div>
            <div className="kpi-grid">
                {tiles.map((tile) => (
                    <Link
                        key={tile.href}
                        href={tile.href}
                        className="panel"
                        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem", textDecoration: "none", color: "inherit" }}
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
        if (sessionRole === "professionnel" || sessionRole === "particulier") {
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

    if (sessionRole === "particulier" && subpage === "vue-generale") {
        return <ParticulierVueGlobaleHome title={title} />;
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
                            <div className="activity-grid">
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--surface-sunken)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", color: DISTINCT.blue }}><Gift size={18} /></div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>Annonces de don</span>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{safe("donItems")}</span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--surface-sunken)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(249, 115, 22, 0.1)", color: DISTINCT.orange }}><Tag size={18} /></div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>Annonces de vente</span>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{safe("venteItems")}</span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--surface-sunken)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(16, 185, 129, 0.1)", color: DISTINCT.emerald }}><Calendar size={18} /></div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>Résev. formations</span>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{safe("resFormations")}</span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--surface-sunken)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(139, 92, 246, 0.1)", color: DISTINCT.violet }}><CalendarDays size={18} /></div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>Événements à venir</span>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{safe("evtAvenir")}</span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--surface-sunken)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(6, 182, 212, 0.1)", color: DISTINCT.cyan }}><Hammer size={18} /></div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>Projets upcycling</span>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{safe("upcyclingProjects")}</span>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--surface-sunken)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(217, 70, 239, 0.1)", color: DISTINCT.magenta }}><CheckCircle size={18} /></div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>Validation annonces</span>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{stats?.tauxValidation?.toFixed(1) || "0.0"} %</span>
                                    </div>
                                </div>
                                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--surface-sunken)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                                    <div style={{ padding: "0.5rem", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", color: DISTINCT.red }}><Trash2 size={18} /></div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>Remplissage moyen conteneurs</span>
                                        <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>{stats?.containerRemplissage?.toFixed(1) || "0.0"} %</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="panel stats-panel">
                            <div className="section-header">
                                <span className="section-title">Finance rapide</span>
                                <span className="db-badge">Ce mois</span>
                            </div>
                            <div className="finance-grid">
                                <div className="finance-block"><span className="finance-label">Abonnements</span><span className="finance-amount">{stats?.finance?.abonnements?.toFixed(2) || "0.00"} €</span></div>
                                <div className="finance-block"><span className="finance-label">Commissions</span><span className="finance-amount">{stats?.finance?.commissions?.toFixed(2) || "0.00"} €</span></div>
                                <div className="finance-block"><span className="finance-label">Ateliers / Formations</span><span className="finance-amount">{stats?.finance?.ateliers?.toFixed(2) || "0.00"} €</span></div>
                                <div className="finance-block"><span className="finance-label">Service</span><span className="finance-amount">{stats?.finance?.service?.toFixed(2) || "0.00"} €</span></div>
                            </div>
                            <div className="finance-total">
                                <span>Total mensuel</span>
                                <span className="finance-total-amount">{stats?.finance?.total?.toFixed(2) || "0.00"} €</span>
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
                                {stats?.realtimeActivity?.length > 0 ? (
                                    stats.realtimeActivity.map((act) => (
                                        <div key={act.id + act.type} style={{ padding: "1rem", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                                    {act.type === "item_created" ? "Nouvelle annonce" : "Nouvel utilisateur"}
                                                </span>
                                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                    {new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                                {act.description}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucun événement récent.</div>
                                )}
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
                                        { label: "Annonces déposées", val: stats?.operationsToday?.annoncesDeposees || "0", color: DISTINCT.blue },
                                        { label: "Annonces validées", val: stats?.operationsToday?.annoncesValidees || "0", color: DISTINCT.emerald },
                                        { label: "Dépôts conteneurs traités", val: stats?.operationsToday?.depotsConteneurs || "0", color: DISTINCT.violet },
                                        { label: "Objets récupérés", val: stats?.operationsToday?.objetsRecuperes || "0", color: DISTINCT.orange },
                                        { label: "Inscriptions formations", val: stats?.operationsToday?.inscriptionsFormations || "0", color: DISTINCT.cyan },
                                        { label: "Paiements confirmés", val: stats?.operationsToday?.paiementsConfirmes || "0", color: DISTINCT.red },
                                        { label: "Nouveaux abonnements", val: stats?.operationsToday?.nouveauxAbonnements || "0", color: DISTINCT.magenta },
                                        { label: "Notifications push", val: stats?.operationsToday?.notificationsPush || "0", color: DISTINCT.teal },
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
                            {stats?.alerts?.alertesOperationnelles > 0 ? (
                                <AlertRow title="Conteneurs en panne" desc={`${stats.alerts.alertesOperationnelles} conteneurs nécessitent une maintenance`} count={stats.alerts.alertesOperationnelles} level="élevé" action="Voir" />
                            ) : (
                                <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucune alerte opérationnelle.</div>
                            )}
                        </div>

                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Modération communautaire</span>
                            </div>
                            {stats?.alerts?.moderationCommunautaire > 0 ? (
                                <AlertRow title="Signalements forum" desc={`${stats.alerts.moderationCommunautaire} signalements à traiter`} count={stats.alerts.moderationCommunautaire} level="moyen" action="Voir" />
                            ) : (
                                <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucun signalement communautaire.</div>
                            )}
                        </div>

                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Alertes administratives</span>
                            </div>
                            <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucune alerte administrative.</div>
                        </div>
                    </div>
                </>
            ) : null}
        </>
    );
}
