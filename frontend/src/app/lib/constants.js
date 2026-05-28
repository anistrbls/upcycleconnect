export const Check = "M20 6 9 17l-5-5";
export const Refresh = "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8";
export const Alert = "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01";
export const Process = "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6";
export const Trash = "M3 6h18M19 6l-2 14H7L5 6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2";
export const Shield = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";

export const DISTINCT = {
    blue: "#3B5B8A",
    orange: "#A56A2A",
    emerald: "#2E7D6E",
    red: "#B24A4A",
    violet: "#6A5AA6",
    cyan: "#2F7D93",
    magenta: "#8F4B78",
    teal: "#356F73",
};

export const FLUX_DISTINCT = {
    sky: "#9CB7D8",
    mint: "#9BC8B8",
    coral: "#D5A8A1",
    pink: "#CFA2B8",
    lilac: "#B9AFD6",
    peach: "#D2B08E",
    aqua: "#9DC2C4",
    blue: "#A6BCD9",
};

export const LEVEL_COLORS = {
    critique: "var(--state-critical)",
    élevé: DISTINCT.orange,
    moyen: DISTINCT.blue,
    faible: DISTINCT.violet,
};

export const EVENT_TYPES = ["atelier", "formation", "evenement", "conference"];
export const EVENT_STATUSES = ["brouillon", "planifie", "valide", "annule"];

export const NAV_MODULES = [
    {
        key: "vue-globale",
        label: "Vue globale",
        shortLabel: "Vue",
        icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
        subNav: [
            { key: "vue-generale", label: "Vue générale", shortLabel: "Générale" },
            { key: "kpis-stats", label: "KPIs & statistiques", shortLabel: "KPIs" },
            { key: "activite-temps-reel", label: "Activité temps réel", shortLabel: "Temps réel" },
            { key: "alertes", label: "Alertes", shortLabel: "Alertes" },
        ],
    },
    {
        key: "annonces",
        label: "Annonces",
        shortLabel: "Annonces",
        icon: "M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6 M12 12V2 M12 2l4 4 M12 2L8 6",
        subNav: [
            { key: "deposer", label: "Déposer une annonce", shortLabel: "Déposer" },
            { key: "mes-annonces", label: "Annonces", shortLabel: "Annonces" },
            { key: "brouillons", label: "Brouillons", shortLabel: "Brouillons" },
        ],
    },
    {
        key: "utilisateurs",
        label: "Utilisateurs",
        shortLabel: "Users",
        icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
        subNav: [
            { key: "tous-utilisateurs", label: "Tous les utilisateurs", shortLabel: "Tous" },
            { key: "planning-equipe", label: "Planning Équipe", shortLabel: "Planning" },
        ],
    },
    {
        key: "offres-prestations",
        label: "Offres & prestations",
        shortLabel: "Offres",
        icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
        subNav: [
            { key: "vue-ensemble", label: "Vue d'ensemble", shortLabel: "Vue" },
            { key: "ajouter", label: "Ajouter une prestation", shortLabel: "Ajouter", hideInTopbar: true },
            { key: "prestations", label: "Prestations", shortLabel: "Prestations" },
            { key: "reservations", label: "Réservations", shortLabel: "Réservations" },
        ],
    },
    {
        key: "evenements",
        label: "Événements",
        shortLabel: "Événements",
        icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
        subNav: [
            { key: "tous-evenements", label: "Tous les événements", shortLabel: "Tous" },
            { key: "planning", label: "Planning", shortLabel: "Planning" },
            { key: "moderation", label: "Modération", shortLabel: "Modération" },
        ],
    },
    {
        key: "conseils",
        label: "Conseils",
        shortLabel: "Conseils",
        icon: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
        subNav: [
            { key: "tous-conseils", label: "Tous les conseils", shortLabel: "Tous" },
            { key: "en-attente", label: "En attente", shortLabel: "En attente" },
        ],
    },
    {
        key: "forum",
        label: "Forum",
        shortLabel: "Forum",
        icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        subNav: [
            { key: "sujets", label: "Tous les sujets", shortLabel: "Sujets" },
            { key: "moderation", label: "Modération", shortLabel: "Modération" },
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
            { key: "validations", label: "Validation", shortLabel: "Validation" },
            { key: "documents", label: "Documents", shortLabel: "Docs" },
        ],
    },
    {
        key: "projets",
        label: "Projets upcycle",
        shortLabel: "Projets",
        icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        subNav: [
            { key: "actifs", label: "Projets actifs", shortLabel: "Actifs" },
            { key: "moderation", label: "Modération", shortLabel: "Modération" },
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
    {
        key: "mon-compte",
        label: "Mon compte",
        shortLabel: "Compte",
        icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
        subNav: [
            { key: "", label: "Mon profil", shortLabel: "Profil" },
        ],
    },
];

export const PRO_MODULES = [
    {
        key: "vue-globale",
        label: "Vue globale",
        shortLabel: "Vue",
        icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
        subNav: [
            { key: "vue-generale", label: "Vue générale", shortLabel: "Générale" },
        ],
    },
    {
        key: "annonces",
        label: "Annonces",
        shortLabel: "Annonces",
        icon: "M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6 M12 12V2 M12 2l4 4 M12 2L8 6",
        subNav: [
            { key: "disponible", label: "Annonces disponibles", shortLabel: "Disponibles" },
            { key: "mes-recuperations", label: "Mes récupérations", shortLabel: "Récupérations" },
        ],
    },
    {
        key: "projets",
        label: "Projets d'upcycling",
        shortLabel: "Projets",
        icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        subNav: [
            { key: "mes-projets", label: "Mes projets", shortLabel: "Mes projets" },
            { key: "nouveau", label: "Nouveau projet", shortLabel: "Nouveau" },
            { key: "postes", label: "Projets postés", shortLabel: "Postés" },
            { key: "participes", label: "My Upcycle", shortLabel: "Participés" },
            { key: "favoris", label: "Projets favoris", shortLabel: "Favoris" },
        ],
    },
    {
        key: "prestations",
        label: "Prestations",
        shortLabel: "Prestations",
        icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        subNav: [
            { key: "catalogue", label: "Catalogue", shortLabel: "Catalogue" },
            { key: "mes-reservations", label: "Mes réservations", shortLabel: "Réservations" },
        ],
    },
    {
        key: "evenements",
        label: "Événements",
        shortLabel: "Événements",
        icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
        subNav: [
            { key: "activites", label: "Activités", shortLabel: "Activités" },
            { key: "mes-inscriptions", label: "Mes inscriptions", shortLabel: "Inscriptions" },
            { key: "agenda", label: "Agenda", shortLabel: "Agenda" },
        ],
    },
    {
        key: "forum",
        label: "Forum",
        shortLabel: "Forum",
        icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        subNav: [
            { key: "sujets", label: "Forum", shortLabel: "Forum" },
        ],
    },
    {
        key: "finances",
        label: "Finances",
        shortLabel: "Finances",
        icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
        subNav: [{ key: "paiements", label: "Mes paiements", shortLabel: "Paiements" }],
    },
    {
        key: "mon-compte",
        label: "Mon compte",
        shortLabel: "Compte",
        icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
        subNav: [
            { key: "", label: "Mon profil", shortLabel: "Profil" },
        ],
    },
];

export const SALARIE_MODULES = [
    {
        key: "salarie-tableau-de-bord",
        label: "Tableau de bord",
        shortLabel: "Dashboard",
        icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
        subNav: [
            { key: "resume", label: "Résumé", shortLabel: "Résumé" },
            { key: "prochains-evenements", label: "Prochains événements", shortLabel: "Événements" },
            { key: "en-attente", label: "En attente", shortLabel: "En attente" },
        ],
    },
    {
        key: "salarie-formations",
        label: "Formations & événements",
        shortLabel: "Formations",
        icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
        subNav: [
            { key: "creer", label: "Création d'événements", shortLabel: "Création" },
            { key: "mes-evenements", label: "Mes événements", shortLabel: "Mes événements" },
            { key: "brouillons", label: "Brouillons", shortLabel: "Brouillons" },
        ],
    },
    {
        key: "salarie-planning",
        label: "Planning",
        shortLabel: "Planning",
        icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
        subNav: [
            { key: "agenda", label: "Agenda", shortLabel: "Agenda" },
        ],
    },
    {
        key: "prestations",
        label: "Prestations",
        shortLabel: "Prestations",
        icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        subNav: [
            { key: "catalogue", label: "Catalogue", shortLabel: "Catalogue" },
        ],
    },
    {
        key: "salarie-contenu",
        label: "Contenu",
        shortLabel: "Contenu",
        icon: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
        subNav: [
            { key: "conseils", label: "Conseils", shortLabel: "Conseils" },
            { key: "brouillons", label: "Brouillons", shortLabel: "Brouillons" },
        ],
    },
    {
        key: "salarie-moderation",
        label: "Modération",
        shortLabel: "Modération",
        icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
        subNav: [
            { key: "a-moderer", label: "À modérer", shortLabel: "À modérer" },
        ],
    },
    {
        key: "forum",
        label: "Forum",
        shortLabel: "Forum",
        icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        subNav: [
            { key: "sujets", label: "Tous les sujets", shortLabel: "Sujets" },
            { key: "moderation", label: "Signalements", shortLabel: "Signalements" },
        ],
    },
    {
        key: "mon-compte",
        label: "Mon compte",
        shortLabel: "Compte",
        icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
        subNav: [
            { key: "", label: "Mon profil", shortLabel: "Profil" },
        ],
    },
];

export const PARTICULIER_MODULES = [
    {
        key: "vue-globale",
        label: "Vue globale",
        shortLabel: "Vue",
        icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
        subNav: [
            { key: "vue-generale", label: "Vue générale", shortLabel: "Générale" },
        ],
    },
    {
        key: "annonces",
        label: "Annonces",
        shortLabel: "Annonces",
        icon: "M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6 M12 12V2 M12 2l4 4 M12 2L8 6",
        subNav: [
            { key: "deposer", label: "Déposer une annonce", shortLabel: "Déposer" },
            { key: "mes-annonces", label: "Mes annonces", shortLabel: "Mes" },
            { key: "brouillons", label: "Brouillons", shortLabel: "Brouillons" },
        ],
    },
    {
        key: "prestations",
        label: "Prestations",
        shortLabel: "Prestations",
        icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        subNav: [
            { key: "catalogue", label: "Catalogue", shortLabel: "Catalogue" },
            { key: "mes-reservations", label: "Mes réservations", shortLabel: "Réservations" },
        ],
    },
    {
        key: "evenements",
        label: "Événements",
        shortLabel: "Événements",
        icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
        subNav: [
            { key: "activites", label: "Activités", shortLabel: "Activités" },
            { key: "mes-inscriptions", label: "Mes inscriptions", shortLabel: "Inscriptions" },
            { key: "agenda", label: "Agenda", shortLabel: "Agenda" },
        ],
    },
    {
        key: "conseils",
        label: "Conseils",
        shortLabel: "Conseils",
        icon: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
        subNav: [
            { key: "tous-conseils", label: "Tous les conseils", shortLabel: "Conseils" },
            { key: "favoris", label: "Mes favoris", shortLabel: "Favoris" },
        ],
    },
    {
        key: "projets",
        label: "Projets upcycle",
        shortLabel: "Projets",
        icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        subNav: [
            { key: "postes", label: "Projets postés", shortLabel: "Postés" },
            { key: "participes", label: "My Upcycle", shortLabel: "Participés" },
            { key: "favoris", label: "Projets favoris", shortLabel: "Favoris" },
        ],
    },
    {
        key: "forum",
        label: "Forum",
        shortLabel: "Forum",
        icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        subNav: [
            { key: "sujets", label: "Forum", shortLabel: "Forum" },
        ],
    },
    {
        key: "finances",
        label: "Finances",
        shortLabel: "Finances",
        icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
        subNav: [{ key: "paiements", label: "Mes paiements", shortLabel: "Paiements" }],
    },
    {
        key: "mon-compte",
        label: "Mon compte",
        shortLabel: "Compte",
        icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
        subNav: [
            { key: "", label: "Mon profil", shortLabel: "Profil" },
        ],
    },
];

export const ALL_MODULES = [...NAV_MODULES, ...SALARIE_MODULES, ...PARTICULIER_MODULES];

export const getModuleByKey = (moduleKey) => ALL_MODULES.find((module) => module.key === moduleKey) || NAV_MODULES[0];

export const getSubNavItem = (moduleKey, subKey) => {
    const module = getModuleByKey(moduleKey);
    return module.subNav.find((item) => item.key === subKey) || module.subNav[0];
};

export const getDefaultSubRoute = (moduleKey) => {
    const module = getModuleByKey(moduleKey);
    return `/${module.key}/${module.subNav[0].key}`;
};
