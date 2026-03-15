"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const Icon = ({ path, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d={path} />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
)

const Check = "M20 6 9 17l-5-5";
const Refresh = "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8";
const Alert = "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01";
const Process = "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6";
const Trash = "M3 6h18M19 6l-2 14H7L5 6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2";
const Shield = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";

const SidebarHome = "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";
const SidebarGrid = "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z";
const SidebarUsers = "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75";
const SidebarBox = "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12";
const SidebarSettings = "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.731.73a2 2 0 0 1-2-.18v-.18a2 2 0 0 0-2 2l-.22.38a2 2 0 0 0 .73 2.731.73a2 2 0 0 1 0 2l-1.73 1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.731.73a2 2 0 0 1 2 01.73a2 2 0 0 1 .18 2v.18a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.731.73a2 2 0 0 1 2 .18v.18a2 2 0 0 0 2-2l.22-.38a2 2 0 0 0-.73-2.731.73 0 0 1 0-2l1.73-1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.731.73 0 0 1-2 01.73 0 0 1-.18-2V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z";

const getApiBaseUrl = () => {
    const fallback = "/api";
    const rawValue = (process.env.NEXT_PUBLIC_API_URL || "").trim();
    const cleanedValue = rawValue.replace(/^['\"]|['\"]$/g, "").replace(/\/+$/, "");

    if (!cleanedValue) {
        return fallback;
    }

    if (/^https?:\/\//i.test(cleanedValue) || cleanedValue.startsWith("/")) {
        return cleanedValue;
    }

    return fallback;
};

const API_BASE_URL = getApiBaseUrl();
const apiUrl = (path) => {
    const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    if (normalizedBase.endsWith("/api")) {
        return `${normalizedBase}${normalizedPath}`;
    }

    return `${normalizedBase}/api${normalizedPath}`;
};
const TOKEN_KEY = "uc_admin_token";

const DISTINCT = {
    blue: "#3B5B8A",
    orange: "#A56A2A",
    emerald: "#2E7D6E",
    red: "#B24A4A",
    violet: "#6A5AA6",
    cyan: "#2F7D93",
    magenta: "#8F4B78",
    teal: "#356F73",
};

const FLUX_DISTINCT = {
    sky: "#9CB7D8",
    mint: "#9BC8B8",
    coral: "#D5A8A1",
    pink: "#CFA2B8",
    lilac: "#B9AFD6",
    peach: "#D2B08E",
    aqua: "#9DC2C4",
    blue: "#A6BCD9",
};

const LEVEL_COLORS = {
    critique: "var(--state-critical)",
    élevé: DISTINCT.orange,
    moyen: DISTINCT.blue,
    faible: DISTINCT.violet,
};

const NAV_MODULES = [
    {
        key: "vue-globale",
        label: "Vue globale",
        shortLabel: "Vue",
        icon: SidebarGrid,
        subNav: [
            { key: "vue-generale", label: "Vue générale", shortLabel: "Générale" },
            { key: "kpis-stats", label: "KPIs & statistiques", shortLabel: "KPIs" },
            { key: "activite-temps-reel", label: "Activité temps réel", shortLabel: "Temps réel" },
            { key: "alertes", label: "Alertes", shortLabel: "Alertes" },
        ],
    },
    {
        key: "utilisateurs",
        label: "Utilisateurs",
        shortLabel: "Users",
        icon: SidebarUsers,
        subNav: [
            { key: "tous-utilisateurs", label: "Tous les utilisateurs", shortLabel: "Tous" },
            { key: "particuliers", label: "Particuliers", shortLabel: "Particuliers" },
            { key: "prestataires", label: "Prestataires / Artisans", shortLabel: "Prestataires" },
            { key: "admins", label: "Admins", shortLabel: "Admins" },
            { key: "validations", label: "Validations", shortLabel: "Validations" },
        ],
    },
    {
        key: "offres-prestations",
        label: "Offres & prestations",
        shortLabel: "Offres",
        icon: SidebarBox,
        subNav: [
            { key: "vue-ensemble", label: "Vue d'ensemble", shortLabel: "Vue" },
            { key: "prestations", label: "Prestations", shortLabel: "Prestations" },
            { key: "categories-prestations", label: "Catégories de prestations", shortLabel: "Catégories" },
            { key: "reservations", label: "Réservations", shortLabel: "Réservations" },
            { key: "tarification", label: "Tarification", shortLabel: "Tarifs" },
        ],
    },
    {
        key: "evenements",
        label: "Événements",
        shortLabel: "Événements",
        icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
        subNav: [
            { key: "tous-evenements", label: "Tous les événements", shortLabel: "Tous" },
            { key: "categories-evenements", label: "Catégories", shortLabel: "Catégories" },
            { key: "inscriptions", label: "Inscriptions", shortLabel: "Inscriptions" },
            { key: "intervenants", label: "Intervenants", shortLabel: "Intervenants" },
            { key: "planning", label: "Planning", shortLabel: "Planning" },
        ],
    },
    {
        key: "finances",
        label: "Finances",
        shortLabel: "Finances",
        icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
        subNav: [
            { key: "vue-financiere", label: "Vue financière", shortLabel: "Vue" },
            { key: "abonnements", label: "Abonnements", shortLabel: "Abonnements" },
            { key: "commissions", label: "Commissions", shortLabel: "Commissions" },
            { key: "paiements", label: "Paiements", shortLabel: "Paiements" },
            { key: "factures", label: "Factures", shortLabel: "Factures" },
        ],
    },
    {
        key: "operations",
        label: "Opérations",
        shortLabel: "Ops",
        icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
        subNav: [
            { key: "conteneurs", label: "Conteneurs", shortLabel: "Conteneurs" },
            { key: "validations-ops", label: "Validations", shortLabel: "Validations" },
            { key: "moderations", label: "Modérations", shortLabel: "Modérations" },
            { key: "notifications", label: "Notifications", shortLabel: "Notif." },
            { key: "documents", label: "Documents", shortLabel: "Docs" },
        ],
    },
    {
        key: "parametres",
        label: "Paramètres",
        shortLabel: "Paramètres",
        icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
        subNav: [
            { key: "general", label: "Général", shortLabel: "Général" },
            { key: "roles-permissions", label: "Rôles & permissions", shortLabel: "Rôles" },
            { key: "configuration", label: "Configuration", shortLabel: "Config" },
            { key: "integrations", label: "Intégrations", shortLabel: "Intégrations" },
            { key: "journal-systeme", label: "Journal système", shortLabel: "Journal" },
        ],
    },
];

const ModulePlaceholder = ({ moduleLabel, subLabel }) => (
    <>
        <div className="header-section">
            <div className="title-area">
                <span className="activities-label">Module principal</span>
                <h1>{moduleLabel}</h1>
            </div>
        </div>

        <div className="panel" style={{ maxWidth: "920px" }}>
            <div className="section-header">
                <span className="section-title">{subLabel}</span>
                <span className="db-badge">Structure prête</span>
            </div>
            <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Cette section est prête pour intégrer les écrans métier. La sidebar reste la navigation principale,
                et la navbar du haut pilote les sous-pages contextuelles du module actif.
            </p>
        </div>
    </>
);

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

export default function Home() {
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [activeModuleKey, setActiveModuleKey] = useState("vue-globale");
    const [activeSubKey, setActiveSubKey] = useState("vue-generale");

    const activeModule = NAV_MODULES.find((module) => module.key === activeModuleKey) || NAV_MODULES[0];
    const activeSub = activeModule.subNav.find((subItem) => subItem.key === activeSubKey) || activeModule.subNav[0];
    const isGlobalModule = activeModule.key === "vue-globale";
    const showGlobalAll = isGlobalModule && activeSubKey === "vue-generale";
    const showGlobalKpis = isGlobalModule && (activeSubKey === "vue-generale" || activeSubKey === "kpis-stats");
    const showGlobalRealtime = isGlobalModule && (activeSubKey === "vue-generale" || activeSubKey === "activite-temps-reel");
    const showGlobalAlerts = isGlobalModule && (activeSubKey === "vue-generale" || activeSubKey === "alertes");

    useEffect(() => {
        const verifyToken = async () => {
            const token = window.localStorage.getItem(TOKEN_KEY);
            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const response = await fetch(apiUrl("/auth/me"), {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("unauthorized");
                }

                setIsCheckingAuth(false);
            } catch {
                window.localStorage.removeItem(TOKEN_KEY);
                router.replace("/login");
            }
        };

        verifyToken();
    }, [router]);

    const handleLogout = () => {
        window.localStorage.removeItem(TOKEN_KEY);
        router.replace("/login");
    };

    const handleModuleChange = (moduleKey) => {
        const nextModule = NAV_MODULES.find((module) => module.key === moduleKey);
        if (!nextModule) {
            return;
        }

        setActiveModuleKey(moduleKey);
        setActiveSubKey(nextModule.subNav[0].key);
    };

    if (isCheckingAuth) {
        return (
            <div className="auth-loading-screen">
                <div className="auth-loading-card">Vérification de session...</div>
            </div>
        );
    }

    return (
        <div className="app-wrapper">
            <header className="topbar">
                <div className="topbar-left">
                    <div className="brand-dot">
                        <span style={{ backgroundColor: "var(--gradient-start)" }}></span><span style={{ backgroundColor: "var(--gradient-mid)" }}></span><span style={{ backgroundColor: "var(--gradient-mid)" }}></span><span style={{ backgroundColor: "var(--gradient-end)" }}></span>
                    </div>
                    <span style={{ marginLeft: "0.5rem" }}>UpcycleConnect</span>
                    <span className="slash">|</span>
                    <span style={{ color: "var(--text-muted)" }}>{activeModule.label}</span>
                </div>

                <div className="topbar-center">
                    {activeModule.subNav.map((subItem) => (
                        <button
                            key={subItem.key}
                            className={`action-btn ${activeSub.key === subItem.key ? "primary" : ""}`}
                            onClick={() => setActiveSubKey(subItem.key)}
                            type="button"
                        >
                            <span className="action-label-long">{subItem.label}</span>
                            <span className="action-label-short">{subItem.shortLabel || subItem.label}</span>
                        </button>
                    ))}
                </div>

                <div className="topbar-right">
                    <button className="top-icon" onClick={handleLogout} title="Se déconnecter" aria-label="Se déconnecter"><Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></button>
                </div>
            </header>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                <aside className="sidebar">
                    <nav className="sidebar-nav" aria-label="Navigation principale backoffice">
                        {NAV_MODULES.map((module) => {
                            const isActive = activeModule.key === module.key;

                            return (
                                <button
                                    key={module.key}
                                    className={`sidebar-item ${isActive ? "active" : ""}`}
                                    onClick={() => handleModuleChange(module.key)}
                                    type="button"
                                >
                                    <span className={`sidebar-icon ${isActive ? "active" : ""}`}>
                                        <Icon path={module.icon} />
                                    </span>
                                    <span className="sidebar-label">{module.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                <main className="main-content">
                    {activeModule.key === "vue-globale" ? (
                    <>

                    <div className="header-section">
                        <div className="title-area">
                            <span className="activities-label">Tableau de bord de gestion</span>
                            <h1>{activeSub.label}</h1>
                        </div>
                    </div>

                    {showGlobalKpis ? (
                    <>
                    {/* SECTION 1 — KPIs & STATS */}
                    <div className="db-section-label">KPIs & Statistiques</div>

                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <span className="kpi-title">Utilisateurs actifs totaux</span>
                            <div className="kpi-value">4 382</div>
                            <span className="kpi-trend kpi-up">↑ +3,2 % ce mois</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Particuliers inscrits</span>
                            <div className="kpi-value">3 714</div>
                            <span className="kpi-trend kpi-up">↑ +41 nouveaux</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Artisans / Pros premium actifs</span>
                            <div className="kpi-value">318</div>
                            <span className="kpi-trend kpi-up">↑ +12 ce mois</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Salariés / Animateurs actifs</span>
                            <div className="kpi-value">27</div>
                            <span className="kpi-trend kpi-neutral">= stable</span>
                        </div>
                        <div className="kpi-card kpi-card-warn">
                            <span className="kpi-title">Annonces en attente de validation</span>
                            <div className="kpi-value">58</div>
                            <span className="kpi-trend kpi-down">↑ +14 depuis hier</span>
                        </div>
                        <div className="kpi-card kpi-card-warn">
                            <span className="kpi-title">Demandes de dépôt conteneur</span>
                            <div className="kpi-value">42</div>
                            <span className="kpi-trend kpi-down">↑ +7 depuis hier</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Objets dispo dans les conteneurs</span>
                            <div className="kpi-value">1 247</div>
                            <span className="kpi-trend kpi-up">↑ +83 aujourd'hui</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Formations / Ateliers cette semaine</span>
                            <div className="kpi-value">15</div>
                            <span className="kpi-trend kpi-neutral">3 à confirmer</span>
                        </div>
                        <div className="kpi-card kpi-card-accent">
                            <span className="kpi-title">Revenus du mois</span>
                            <div className="kpi-value">14 820 <span className="kpi-unit">€</span></div>
                            <span className="kpi-trend kpi-up">↑ +18 % vs mois préc.</span>
                        </div>
                        <div className="kpi-card kpi-card-accent">
                            <span className="kpi-title">Commissions sur ventes</span>
                            <div className="kpi-value">2 340 <span className="kpi-unit">€</span></div>
                            <span className="kpi-trend kpi-up">↑ +9 % vs mois préc.</span>
                        </div>
                        <div className="kpi-card kpi-card-accent">
                            <span className="kpi-title">Nouveaux abonnements premium</span>
                            <div className="kpi-value">34</div>
                            <span className="kpi-trend kpi-up">↑ +6 vs mois préc.</span>
                        </div>
                        <div className="kpi-card">
                            <span className="kpi-title">Notifications envoyées aujourd'hui</span>
                            <div className="kpi-value">412</div>
                            <span className="kpi-trend kpi-neutral">tauxouv. 68 %</span>
                        </div>
                    </div>

                    <div className="stats-row">
                        <div className="panel stats-panel">
                            <div className="section-header">
                                <span className="section-title">Répartition des activités</span>
                                <span className="db-badge">Ce mois</span>
                            </div>
                            <div className="stat-list">
                                <div className="stat-row"><span className="stat-label">Annonces de don</span><span className="stat-value">214</span><div className="stat-bar"><div className="stat-bar-fill" style={{width:"68%", background: DISTINCT.blue}}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Annonces de vente</span><span className="stat-value">187</span><div className="stat-bar"><div className="stat-bar-fill" style={{width:"59%", background: DISTINCT.orange}}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Réservations formations</span><span className="stat-value">93</span><div className="stat-bar"><div className="stat-bar-fill" style={{width:"29%", background: DISTINCT.emerald}}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Événements à venir</span><span className="stat-value">8</span><div className="stat-bar"><div className="stat-bar-fill" style={{width:"10%", background: DISTINCT.violet}}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Projets d'upcycling suivis</span><span className="stat-value">136</span><div className="stat-bar"><div className="stat-bar-fill" style={{width:"43%", background: DISTINCT.cyan}}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Taux de validation annonces</span><span className="stat-value stat-highlight">81 %</span><div className="stat-bar"><div className="stat-bar-fill" style={{width:"81%", background: DISTINCT.magenta}}></div></div></div>
                                <div className="stat-row"><span className="stat-label">Remplissage moyen conteneurs</span><span className="stat-value stat-warn">73 %</span><div className="stat-bar"><div className="stat-bar-fill" style={{width:"73%", background: DISTINCT.red}}></div></div></div>
                            </div>
                        </div>

                        {/* Finance rapide */}
                        <div className="panel stats-panel">
                            <div className="section-header">
                                <span className="section-title">Finance rapide</span>
                                <span className="db-badge">Mars 2026</span>
                            </div>
                            <div className="finance-grid">
                                <div className="finance-block">
                                    <span className="finance-label">Abonnements</span>
                                    <span className="finance-amount">8 640 €</span>
                                    <span className="finance-var kpi-up">↑ +12 %</span>
                                </div>
                                <div className="finance-block">
                                    <span className="finance-label">Commissions</span>
                                    <span className="finance-amount">2 340 €</span>
                                    <span className="finance-var kpi-up">↑ +9 %</span>
                                </div>
                                <div className="finance-block">
                                    <span className="finance-label">Ateliers / Formations</span>
                                    <span className="finance-amount">2 180 €</span>
                                    <span className="finance-var kpi-up">↑ +22 %</span>
                                </div>
                                <div className="finance-block">
                                    <span className="finance-label">Publicités / Partenariats</span>
                                    <span className="finance-amount">1 660 €</span>
                                    <span className="finance-var kpi-neutral">= stable</span>
                                </div>
                            </div>
                            <div className="finance-total">
                                <span>Total mensuel</span>
                                <span className="finance-total-amount">14 820 €</span>
                            </div>
                            <div style={{fontSize:"0.78rem", color:"var(--text-muted)", marginTop:"0.5rem"}}>
                                Vs mois précédent (12 540 €) — <strong style={{color:"var(--forest-deep)"}}>↑ +18,2 %</strong>
                            </div>
                        </div>
                    </div>
                    </>
                    ) : null}

                    {showGlobalRealtime ? (
                    <>
                    {/* SECTION 2 — ACTIVITÉ TEMPS RÉEL */}
                    <div className="db-section-label" style={{marginTop:"2rem"}}>Activité Temps Réel</div>

                    <div className="realtime-grid">
                        {/* A — Flux d'activité */}
                        <div className="gradient-panel realtime-flux">
                            <div className="section-header" style={{marginBottom:"1.25rem"}}>
                                <span className="section-title" style={{color:"var(--text-main)"}}>Flux d'activité en direct</span>
                                <span className="live-dot"><span className="live-pulse"></span>Live</span>
                            </div>
                            <div className="search-bar" style={{marginBottom:"1.25rem"}}>
                                <SearchIcon />
                                <input type="text" placeholder="Rechercher une action, un acteur, une annonce..." />
                            </div>
                            <div className="flux-list">
                                {[
                                    {img:47, name:"Système", time:"Il y a 2 min", color:FLUX_DISTINCT.sky, badge:"Conteneur", text:"Code d'ouverture généré pour la Box Ivry — conteneur #8432. Notification OneSignal envoyée à M. Karim Driss."},
                                    {img:12, name:"Ateliers Bois & Co", time:"Il y a 5 min", color:FLUX_DISTINCT.mint, badge:"Paiement", text:"Paiement Stripe confirmé — abonnement Premium Pro renouvelé pour 12 mois. Facture #FAC-2026-0314 générée."},
                                    {img:33, name:"Juliette (Animatrice)", time:"Il y a 8 min", color:FLUX_DISTINCT.coral, badge:"Formation", text:"Nouveau planning soumis : 'Couture Zéro Déchet — Niveau 2'. En attente de validation admin."},
                                    {img:22, name:"Margot D. (Particulier)", time:"Il y a 12 min", color:FLUX_DISTINCT.pink, badge:"Annonce", text:"Nouvelle annonce de don déposée : 'Lot de 6 chaises bistrot vintage — Paris 11e'. En attente de modération."},
                                    {img:58, name:"Admin — Système auto", time:"Il y a 18 min", color:FLUX_DISTINCT.lilac, badge:"Validation", text:"Annonce #ANN-2026-2187 validée automatiquement (score IA : 94/100). Mise en ligne immédiate."},
                                    {img:3, name:"Fabien G. (Artisan)", time:"Il y a 25 min", color:FLUX_DISTINCT.peach, badge:"Projet", text:"Nouveau projet d'upcycling publié : 'Bibliothèque à partir de palettes récupérées à Montreuil'."},
                                    {img:9, name:"Système de modération", time:"Il y a 31 min", color:FLUX_DISTINCT.aqua, badge:"Forum", text:"Message signalé sur le forum Brocantes par 2 membres. Contenu mis en attente de relecture."},
                                    {img:55, name:"Leila M. (Particulière)", time:"Il y a 40 min", color:FLUX_DISTINCT.blue, badge:"Inscription", text:"Inscription confirmée à la formation 'Upcycling Textile Avancé' du 18/03/2026 — Bourg-la-Reine."},
                                ].map((e, i) => (
                                    <div key={i} className="flux-item">
                                        <img src={`https://i.pravatar.cc/150?img=${e.img}`} alt="" className="tm-avatar" />
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.2rem"}}>
                                                <span style={{fontWeight:600, fontSize:"0.82rem"}}>{e.name}</span>
                                                <span style={{background: e.color + "1A", color:"var(--text-main)", border: "1px solid " + e.color + "3D", fontSize:"0.68rem", padding:"1px 7px", borderRadius:"20px", fontWeight:600}}>{e.badge}</span>
                                                <span style={{marginLeft:"auto", fontSize:"0.7rem", color:"rgba(35,59,61,0.62)", whiteSpace:"nowrap"}}>{e.time}</span>
                                            </div>
                                            <div style={{fontSize:"0.82rem", color:"rgba(35,59,61,0.88)", lineHeight:1.4}}>{e.text}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* B+C colonnes droite */}
                        <div className="realtime-right">
                            {/* B — Résumé du jour */}
                            <div className="panel" style={{marginBottom:"1.25rem"}}>
                                <div className="section-header">
                                    <span className="section-title">Résumé des opérations du jour</span>
                                    <span className="db-badge">Aujourd'hui</span>
                                </div>
                                <div className="ops-grid">
                                    {[
                                        {label:"Annonces déposées",     val:"24", color:DISTINCT.blue},
                                        {label:"Annonces validées",      val:"19", color:DISTINCT.emerald},
                                        {label:"Dépôts conteneurs traités", val:"11", color:DISTINCT.violet},
                                        {label:"Objets récupérés",       val:"34", color:DISTINCT.orange},
                                        {label:"Inscriptions formations",val:"8",  color:DISTINCT.cyan},
                                        {label:"Paiements confirmés",    val:"16", color:DISTINCT.red},
                                        {label:"Nouveaux abonnements",   val:"5",  color:DISTINCT.magenta},
                                        {label:"Notifications push",     val:"412",color:DISTINCT.teal},
                                    ].map((o,i) => (
                                        <div key={i} className="ops-cell">
                                            <span className="ops-val" style={{color: o.color}}>{o.val}</span>
                                            <span className="ops-label">{o.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* C — Événements système */}
                            <div className="panel">
                                <div className="section-header">
                                    <span className="section-title">Événements système</span>
                                    <span className="db-badge">Récents</span>
                                </div>
                                {[
                                    {icon:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6", color:DISTINCT.blue, text:"Contrat artisan #CTR-0089 généré automatiquement", time:"09:14"},
                                    {icon:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6", color:DISTINCT.orange, text:"PDF facture #FAC-2026-0314 exporté avec succès", time:"09:11"},
                                    {icon:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", color:DISTINCT.emerald, text:"Planning atelier 'Bois & Récup' modifié — salle changée", time:"08:55"},
                                    {icon:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0-3.42 0z M12 9v4 M12 17h.01", color:DISTINCT.red, text:"Erreur sync API paiement Stripe — timeout (corrigé)", time:"08:42"},
                                    {icon:"M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z M10 20a2 2 0 0 0 4 0", color:DISTINCT.violet, text:"Rappel automatique envoyé : 3 abonnements expirent dans 7j", time:"08:30"},
                                    {icon:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", color:DISTINCT.cyan, text:"Contenu forum signalé — modération en attente", time:"08:17"},
                                ].map((ev,i) => (
                                    <div key={i} className="sys-event">
                                        <div className="sys-icon" style={{background: ev.color + "22", color: ev.color}}>
                                            <Icon path={ev.icon} />
                                        </div>
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontSize:"0.82rem", fontWeight:500, lineHeight:1.3}}>{ev.text}</div>
                                        </div>
                                        <span style={{fontSize:"0.72rem", color:"var(--text-muted)", whiteSpace:"nowrap"}}>{ev.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    </>
                    ) : null}

                    {showGlobalAlerts ? (
                    <>
                    {/* SECTION 3 — ALERTES */}
                    <div className="db-section-label" style={{marginTop:"2rem"}}>Alertes & Priorités</div>

                    <div className="alerts-grid">
                        {/* A — Alertes de validation */}
                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Validations en attente</span>
                            </div>
                            {[
                                {title:"Annonces à modérer", desc:"58 annonces en attente de relecture", count:58, level:"élevé", action:"Voir"},
                                {title:"Dépôts conteneurs", desc:"42 demandes de dépôt non traitées", count:42, level:"élevé", action:"Voir"},
                                {title:"Formations à valider", desc:"3 nouveaux plannings soumis", count:3, level:"moyen", action:"Voir"},
                                {title:"Contenus / Conseils", desc:"6 conseils salariés non relus", count:6, level:"faible", action:"Voir"},
                                {title:"Projets upcycling", desc:"4 projets à vérifier avant mise en avant", count:4, level:"moyen", action:"Voir"},
                            ].map((a,i) => <AlertRow key={i} {...a} />)}
                        </div>

                        {/* B — Alertes opérationnelles */}
                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Alertes opérationnelles</span>
                            </div>
                            {[
                                {title:"Conteneur presque plein", desc:"Box Paris 10 — 91 % de remplissage", count:1, level:"critique", action:"Voir"},
                                {title:"Conteneur indisponible", desc:"Box Bourg-la-Reine — maintenance signalée", count:1, level:"critique", action:"Voir"},
                                {title:"Objet non récupéré", desc:"3 réservations expirées sans retrait", count:3, level:"élevé", action:"Voir"},
                                {title:"Code expiré", desc:"5 codes d'ouverture non utilisés", count:5, level:"moyen", action:"Voir"},
                                {title:"Paiement en échec", desc:"2 tentatives Stripe échouées", count:2, level:"élevé", action:"Voir"},
                                {title:"Abonnement proche expiration", desc:"7 pros expirent dans moins de 7 jours", count:7, level:"moyen", action:"Voir"},
                                {title:"Atelier bientôt complet", desc:"Couture Zéro Déchet — 1 place restante", count:1, level:"faible", action:"Voir"},
                            ].map((a,i) => <AlertRow key={i} {...a} />)}
                        </div>

                        {/* C — Modération */}
                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Modération communautaire</span>
                            </div>
                            {[
                                {title:"Forum signalé", desc:"2 messages bloqués par le filtre IA", count:2, level:"élevé", action:"Voir"},
                                {title:"Commentaire suspect", desc:"1 profil avec comportement répété détecté", count:1, level:"moyen", action:"Voir"},
                                {title:"Conseil non relu", desc:"4 conseils publiés sans relecture", count:4, level:"faible", action:"Voir"},
                                {title:"Projet sans documents", desc:"2 projets publiés sans justificatifs", count:2, level:"moyen", action:"Voir"},
                            ].map((a,i) => <AlertRow key={i} {...a} />)}
                        </div>

                        {/* D — Alertes administratives */}
                        <div className="panel alert-panel">
                            <div className="section-header">
                                <span className="section-title">Alertes administratives</span>
                            </div>
                            {[
                                {title:"Facture impayée", desc:"1 facture pro en souffrance depuis 14j", count:1, level:"critique", action:"Voir"},
                                {title:"Contrat à renouveler", desc:"3 contrats artisans expirent ce mois", count:3, level:"élevé", action:"Voir"},
                                {title:"Document manquant", desc:"5 comptes pros sans pièce justificative", count:5, level:"moyen", action:"Voir"},
                                {title:"Pièce justificative expirée", desc:"2 pro — attestation Kbis périmée", count:2, level:"élevé", action:"Voir"},
                                {title:"Utilisateur pro à vérifier", desc:"1 artisan avec statut non confirmé", count:1, level:"moyen", action:"Voir"},
                                {title:"Hausse d'activité", desc:"Pics de dépôts détectés sur Paris 11e", count:null, level:"faible", action:"Voir"},
                            ].map((a,i) => <AlertRow key={i} {...a} />)}
                        </div>
                    </div>

                    {/*BLOCS COMPLÉMENTAIRES*/}
                    <div className="db-section-label" style={{marginTop:"2rem"}}>Synthèse opérationnelle</div>

                    <div className="bottom-grid">
                        {/* À traiter rapidement */}
                        <div className="panel">
                            <div className="section-header">
                                <span className="section-title">À traiter rapidement</span>
                                <span className="alert-badge alert-badge-warn task-actions-badge">15 actions</span>
                            </div>
                            {[
                                {icon:"M22 3H2l8 9.46V19l4 2v-8.54L22 3z", label:"5 annonces à valider", action:"Voir", color:DISTINCT.blue},
                                {icon:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8", label:"3 conteneurs à contrôler", action:"Voir", color:DISTINCT.orange},
                                {icon:"M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", label:"2 formations à confirmer", action:"Voir", color:DISTINCT.emerald},
                                {icon:"M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", label:"4 factures à vérifier", action:"Voir", color:DISTINCT.violet},
                                {icon:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0-3.42 0z M12 9v4 M12 17h.01", label:"1 contenu signalé à modérer", action:"Voir", color:DISTINCT.red},
                            ].map((t,i) => (
                                <div key={i} className="task-row">
                                    <div className="sys-icon" style={{background: t.color + "22", color: t.color, minWidth:32}}><Icon path={t.icon} /></div>
                                    <span style={{flex:1, fontSize:"0.85rem"}}>{t.label}</span>
                                    <button className="action-cta task-action-btn">{t.action}</button>
                                </div>
                            ))}
                        </div>

                        {/* Planning rapide */}
                        <div className="panel">
                            <div className="section-header">
                                <span className="section-title">Planning rapide</span>
                                <span className="db-badge">Cette semaine</span>
                            </div>
                            {[
                                {icon:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", color:DISTINCT.cyan, label:"Atelier Couture Zéro Déchet", sub:"Lun 14/03 — 14h00 — Bourg-la-Reine"},
                                {icon:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z", color:DISTINCT.blue, label:"Formation Upcycling Textile Niv.2", sub:"Mar 15/03 — 10h00 — Paris 10e"},
                                {icon:"M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2", color:DISTINCT.emerald, label:"Portes Ouvertes Ateliers", sub:"Jeu 17/03 — 18h30 — Ivry"},
                                {icon:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color:DISTINCT.magenta, label:"Réunion équipe salariés", sub:"Ven 18/03 — 09h00 — Montreuil"},
                                {icon:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", color:DISTINCT.orange, label:"Salariés mobilisés aujourd'hui", sub:"Juliette · Thomas · Amina · Romain (×4)"},
                            ].map((p,i) => (
                                <div key={i} className="task-row">
                                    <div className="sys-icon" style={{background: p.color + "22", color: p.color, minWidth:32}}><Icon path={p.icon} /></div>
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:"0.85rem", fontWeight:500}}>{p.label}</div>
                                        <div style={{fontSize:"0.75rem", color:"var(--text-muted)"}}>{p.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Top zones / sites */}
                        <div className="panel">
                            <div className="section-header">
                                <span className="section-title">Top zones actives</span>
                                <span className="db-badge">Ce mois</span>
                            </div>
                            {[
                                {zone:"Paris 10e",       depots:87, recup:74, ateliers:5, score:95},
                                {zone:"Ivry",            depots:63, recup:58, ateliers:4, score:80},
                                {zone:"Montreuil",       depots:54, recup:49, ateliers:3, score:71},
                                {zone:"Bourg-la-Reine",  depots:41, recup:37, ateliers:3, score:60},
                                {zone:"Paris 11e",       depots:38, recup:31, ateliers:2, score:52},
                            ].map((z,i) => (
                                <div key={i} className="zone-row">
                                    <span className="zone-rank">{i+1}</span>
                                    <div style={{flex:1}}>
                                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:"3px"}}>
                                            <span style={{fontSize:"0.85rem", fontWeight:600}}>{z.zone}</span>
                                            <span style={{fontSize:"0.75rem", color:"var(--text-muted)"}}>{z.depots} dép · {z.recup} récup · {z.ateliers} atr</span>
                                        </div>
                                        <div className="stat-bar"><div className="stat-bar-fill" style={{width: z.score+"%", background:"#B6A59F"}}></div></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Top artisans actifs */}
                        <div className="panel">
                            <div className="section-header">
                                <span className="section-title">Top artisans / partenaires</span>
                                <span className="db-badge">Ce mois</span>
                            </div>
                            {[
                                {img:12, name:"Ateliers Bois & Co",    role:"Premium Pro", recup:23, projets:4, ca:"1 840 €"},
                                {img:15, name:"Recyclerie du Canal",   role:"Premium Pro", recup:19, projets:3, ca:"1 290 €"},
                                {img:18, name:"Métal & Créations",     role:"Premium Pro", recup:14, projets:5, ca:"980 €"},
                                {img:21, name:"Couture Rebelle",       role:"Premium Pro", recup:11, projets:2, ca:"760 €"},
                                {img:24, name:"Habitat Durable 94",    role:"Premium Pro", recup:9,  projets:3, ca:"640 €"},
                            ].map((a,i) => (
                                <div key={i} className="artisan-row">
                                    <img src={`https://i.pravatar.cc/150?img=${a.img}`} alt="" className="p-avatar" />
                                    <div style={{flex:1}}>
                                        <div style={{fontSize:"0.85rem", fontWeight:600}}>{a.name}</div>
                                        <div style={{fontSize:"0.73rem", color:"var(--text-muted)"}}>{a.recup} récup · {a.projets} projets</div>
                                    </div>
                                    <span className="finance-amount" style={{fontSize:"0.85rem"}}>{a.ca}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    </>
                    ) : null}

                    </>

                    ) : (
                        <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />
                    )}

                </main>
            </div>
        </div>
    );
}
