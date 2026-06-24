"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// targetType: "sidebar" → carte à droite de la sidebar
//             "topbar"  → carte sous le bouton du topbar
//             null      → carte centrée
const TUTORIAL_STEPS = [
    // ── Bienvenue ────────────────────────────────────────────────────
    {
        id: "welcome",
        title: "Bienvenue sur UpcycleConnect !",
        description:
            "Vous êtes dans votre espace particulier. Ce tutoriel va vous guider à travers toutes les fonctionnalités disponibles. Vous pouvez naviguer librement sans effectuer d'action — on vous montre juste où tout se trouve !",
        target: null,
        targetType: null,
        navigateTo: null,
    },

    // ── Vue globale ──────────────────────────────────────────────────
    {
        id: "vue-globale-sidebar",
        title: "Votre tableau de bord",
        description:
            "Cet icône de la barre latérale vous amène à votre tableau de bord personnel. Vous y retrouvez un résumé de votre activité : dernières annonces, prochains événements et reservations en cours.",
        target: "vue-globale",
        targetType: "sidebar",
        navigateTo: "/vue-globale/vue-generale",
    },

    // ── Annonces ─────────────────────────────────────────────────────
    {
        id: "annonces-sidebar",
        title: "Vos annonces",
        description:
            "Le module Annonces vous permet de déposer des objets à donner ou vendre, de consulter vos annonces actives et de gérer vos brouillons. Commençons par découvrir chaque onglet.",
        target: "annonces",
        targetType: "sidebar",
        navigateTo: "/annonces/mes-annonces",
    },
    {
        id: "annonces-deposer",
        title: "Déposer une annonce",
        description:
            "Cliquez ici pour proposer un objet à la communauté. Remplissez le formulaire : titre, description, photos, type (don ou vente) et votre ville. L'annonce sera relue par notre équipe avant publication.",
        target: "deposer",
        targetType: "topbar",
        navigateTo: "/annonces/deposer",
    },
    {
        id: "annonces-mes-annonces",
        title: "Mes annonces actives",
        description:
            "Retrouvez ici toutes vos annonces publiées et validées par l'équipe. Pour chaque annonce acceptée, un code QR vous est envoyé pour déposer l'objet dans le conteneur UpcycleConnect le plus proche.",
        target: "mes-annonces",
        targetType: "topbar",
        navigateTo: "/annonces/mes-annonces",
    },
    {
        id: "annonces-brouillons",
        title: "Vos brouillons",
        description:
            "Vous avez commencé à remplir une annonce mais n'avez pas encore soumis ? Elle est sauvegardée ici. Reprenez-la quand vous voulez pour la finaliser et l'envoyer à la validation.",
        target: "brouillons",
        targetType: "topbar",
        navigateTo: "/annonces/brouillons",
    },

    // ── Prestations ──────────────────────────────────────────────────
    {
        id: "prestations-sidebar",
        title: "Les prestations",
        description:
            "UpcycleConnect propose des services que vous pouvez réserver directement en ligne : ateliers de réparation, conseils personnalisés, formations pratiques. Explorons les deux onglets.",
        target: "prestations",
        targetType: "sidebar",
        navigateTo: "/prestations/catalogue",
    },
    {
        id: "prestations-catalogue",
        title: "Catalogue des services",
        description:
            "Parcourez l'ensemble des prestations disponibles. Chaque fiche indique la durée, le prix, le lieu et les créneaux disponibles. Cliquez sur une prestation pour réserver directement.",
        target: "catalogue",
        targetType: "topbar",
        navigateTo: "/prestations/catalogue",
    },
    {
        id: "prestations-reservations",
        title: "Mes réservations",
        description:
            "Toutes vos réservations passées et à venir sont listées ici, avec leur statut (confirmée, en attente, annulée). Vous pouvez aussi annuler une réservation depuis cette vue.",
        target: "mes-reservations",
        targetType: "topbar",
        navigateTo: "/prestations/mes-reservations",
    },

    // ── Événements ───────────────────────────────────────────────────
    {
        id: "evenements-sidebar",
        title: "Les événements",
        description:
            "UpcycleConnect organise régulièrement des ateliers, conférences et formations sur l'upcycling. Ce module regroupe toutes les activités auxquelles vous pouvez participer.",
        target: "evenements",
        targetType: "sidebar",
        navigateTo: "/evenements/activites",
    },
    {
        id: "evenements-activites",
        title: "Toutes les activités",
        description:
            "Découvrez la liste complète des événements à venir : ateliers DIY, formations certifiantes, conférences... Filtrez par type ou par date et inscrivez-vous en un clic.",
        target: "activites",
        targetType: "topbar",
        navigateTo: "/evenements/activites",
    },
    {
        id: "evenements-inscriptions",
        title: "Mes inscriptions",
        description:
            "Retrouvez ici tous les événements auxquels vous vous êtes inscrit(e). Vous pouvez consulter le détail, télécharger votre confirmation ou demander un remboursement si nécessaire.",
        target: "mes-inscriptions",
        targetType: "topbar",
        navigateTo: "/evenements/mes-inscriptions",
    },
    {
        id: "evenements-agenda",
        title: "Votre agenda personnel",
        description:
            "Vue calendrier de tous vos événements à venir. Pratique pour visualiser votre planning d'un seul regard et ne manquer aucune activité UpcycleConnect.",
        target: "agenda",
        targetType: "topbar",
        navigateTo: "/evenements/agenda",
    },

    // ── Conseils ─────────────────────────────────────────────────────
    {
        id: "conseils-sidebar",
        title: "L'espace Conseils",
        description:
            "Nos salariés publient régulièrement des tutoriels, guides pratiques et astuces pour vous aider à donner une seconde vie à vos objets. Tout le contenu est disponible ici.",
        target: "conseils",
        targetType: "sidebar",
        navigateTo: "/conseils/tous-conseils",
    },
    {
        id: "conseils-tous",
        title: "Tous les conseils",
        description:
            "Parcourez l'ensemble du catalogue : filtrez par catégorie (réparation, décoration, DIY...), par niveau de difficulté ou par durée estimée. Vous pouvez liker et commenter chaque conseil.",
        target: "tous-conseils",
        targetType: "topbar",
        navigateTo: "/conseils/tous-conseils",
    },
    {
        id: "conseils-favoris",
        title: "Mes favoris",
        description:
            "Retrouvez en un clin d'œil tous les conseils que vous avez mis en favoris. Idéal pour constituer votre bibliothèque personnelle de tutoriels à consulter quand vous en avez besoin.",
        target: "favoris",
        targetType: "topbar",
        navigateTo: "/conseils/favoris",
    },

    // ── Projets ──────────────────────────────────────────────────────
    {
        id: "projets-sidebar",
        title: "Les projets upcycle",
        description:
            "Les professionnels et artisans publient leurs projets de transformation ici. Trouvez l'inspiration, likez les créations qui vous plaisent et suivez vos artisans préférés.",
        target: "projets",
        targetType: "sidebar",
        navigateTo: "/projets/postes",
    },
    {
        id: "projets-postes",
        title: "Projets publiés",
        description:
            "Tous les projets validés par la communauté. Chaque fiche présente les matériaux utilisés, les photos avant/après et l'artisan à l'origine du projet. Cliquez sur ❤️ pour liker.",
        target: "postes",
        targetType: "topbar",
        navigateTo: "/projets/postes",
    },
    {
        id: "projets-participes",
        title: "My Upcycle",
        description:
            "Vos projets participés et sauvegardés. Quand vous mettez un projet en favori, il apparaît ici pour le retrouver facilement et suivre son avancement.",
        target: "participes",
        targetType: "topbar",
        navigateTo: "/projets/participes",
    },

    // ── Forum ────────────────────────────────────────────────────────
    {
        id: "forum-sidebar",
        title: "Le forum communautaire",
        description:
            "Échangez avec toute la communauté UpcycleConnect ! Posez vos questions, partagez vos expériences de réparation ou de transformation, et aidez les autres membres.",
        target: "forum",
        targetType: "sidebar",
        navigateTo: "/forum/sujets",
    },

    // ── Finances ─────────────────────────────────────────────────────
    {
        id: "finances-sidebar",
        title: "Mes paiements",
        description:
            "Retrouvez l'historique complet de vos transactions : inscriptions payantes, achats d'objets et remboursements. Chaque ligne indique le montant, la date et le statut du paiement.",
        target: "finances",
        targetType: "sidebar",
        navigateTo: "/finances/paiements",
    },

    // ── Mon compte ───────────────────────────────────────────────────
    {
        id: "mon-compte-sidebar",
        title: "Mon compte",
        description:
            "Gérez votre profil personnel : nom, adresse, photo, mot de passe. Vérifiez aussi vos préférences de notification pour rester informé(e) des nouvelles annonces et événements.",
        target: "mon-compte",
        targetType: "sidebar",
        navigateTo: "/mon-compte",
    },

    // ── Fin ──────────────────────────────────────────────────────────
    {
        id: "done",
        title: "Vous êtes prêt(e) !",
        description:
            "Vous connaissez maintenant toutes les fonctionnalités de votre espace UpcycleConnect. N'hésitez pas à explorer chaque section à votre rythme. Bonne découverte !",
        target: null,
        targetType: null,
        navigateTo: null,
    },
];

const STORAGE_KEY_PREFIX = "uc_tutorial_done_";
const CARD_WIDTH = 340;
const SIDEBAR_WIDTH = 60;
const SPOTLIGHT_PAD = 8;
const CARD_HEIGHT_EST = 270;

function getTutorialStorageKey(userId, userEmail) {
    const normalizedEmail = String(userEmail || "").trim().toLowerCase();
    if (normalizedEmail) return `${STORAGE_KEY_PREFIX}${normalizedEmail}`;
    if (userId) return `${STORAGE_KEY_PREFIX}${userId}`;
    return "";
}

export default function TutorialOverlay({ userId, userEmail }) {
    const [visible, setVisible] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [spotlightRect, setSpotlightRect] = useState(null);
    const [cardPos, setCardPos] = useState(null);
    const [navigating, setNavigating] = useState(false);

    const pathname = usePathname();
    const router = useRouter();
    const timerRef = useRef(null);
    const prevPathRef = useRef(null);
    const storageKey = getTutorialStorageKey(userId, userEmail);

    // Afficher uniquement à la première visite
    useEffect(() => {
        if (!storageKey) return;
        const done = localStorage.getItem(storageKey);
        if (!done) {
            const t = setTimeout(() => setVisible(true), 500);
            return () => clearTimeout(t);
        }
    }, [storageKey]);

    const currentStep = TUTORIAL_STEPS[stepIndex];

    // Calcule la position du spotlight et de la carte
    const computeSpotlight = useCallback((step) => {
        if (!step.target) {
            setSpotlightRect(null);
            setCardPos(null);
            setNavigating(false);
            return;
        }

        const selector =
            step.targetType === "sidebar"
                ? `[data-tutorial-id="${step.target}"]`
                : `[data-tutorial-subnav-id="${step.target}"]`;

        const el = document.querySelector(selector);
        if (!el) {
            setSpotlightRect(null);
            setCardPos(null);
            setNavigating(false);
            return;
        }

        const rect = el.getBoundingClientRect();
        setSpotlightRect({
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
        });

        if (step.targetType === "sidebar") {
            // Carte à droite de la sidebar, alignée verticalement sur l'élément
            const midY = rect.top + rect.height / 2;
            const top = Math.max(
                16,
                Math.min(window.innerHeight - CARD_HEIGHT_EST - 16, midY - CARD_HEIGHT_EST / 2)
            );
            setCardPos({ top, left: SIDEBAR_WIDTH + 18 });
        } else {
            // Carte sous le bouton du topbar, centrée horizontalement dessus
            const top = rect.bottom + 12;
            const rawLeft = rect.left + rect.width / 2 - CARD_WIDTH / 2;
            const left = Math.max(16, Math.min(window.innerWidth - CARD_WIDTH - 16, rawLeft));
            setCardPos({ top, left });
        }

        setNavigating(false);
    }, []);

    // Réagit aux changements d'étape ou de pathname
    useEffect(() => {
        if (!visible) return;

        const step = TUTORIAL_STEPS[stepIndex];

        // Navigation nécessaire ?
        if (step.navigateTo && pathname !== step.navigateTo) {
            setNavigating(true);
            setSpotlightRect(null);
            setCardPos(null);
            // Évite les navigations en boucle
            if (prevPathRef.current !== step.navigateTo) {
                prevPathRef.current = step.navigateTo;
                router.push(step.navigateTo);
            }
            return;
        }

        // On est sur la bonne page — petit délai pour laisser le DOM se peindre
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => computeSpotlight(step), 180);
        return () => clearTimeout(timerRef.current);
    }, [visible, stepIndex, pathname, router, computeSpotlight]);

    const goNext = () => {
        prevPathRef.current = null;
        if (stepIndex < TUTORIAL_STEPS.length - 1) setStepIndex((i) => i + 1);
        else finish();
    };

    const goPrev = () => {
        prevPathRef.current = null;
        if (stepIndex > 0) setStepIndex((i) => i - 1);
    };

    const finish = () => {
        if (storageKey) localStorage.setItem(storageKey, "1");
        setVisible(false);
    };

    if (!visible) return null;

    const isFirst = stepIndex === 0;
    const isLast = stepIndex === TUTORIAL_STEPS.length - 1;
    const isCentered = !currentStep.target;
    const isTopbar = currentStep.targetType === "topbar";

    const cardStyle =
        isCentered || !cardPos
            ? undefined
            : { position: "fixed", top: cardPos.top, left: cardPos.left, width: CARD_WIDTH };

    const progress = Math.round(((stepIndex + 1) / TUTORIAL_STEPS.length) * 100);

    return (
        <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-label="Tutoriel UpcycleConnect">
            {/* Spotlight */}
            {spotlightRect && !navigating && (
                <div
                    className="tutorial-spotlight"
                    aria-hidden="true"
                    style={{
                        top: spotlightRect.top,
                        left: spotlightRect.left,
                        width: spotlightRect.width,
                        height: spotlightRect.height,
                    }}
                />
            )}

            {/* État de chargement pendant la navigation */}
            {navigating && (
                <div className="tutorial-card tutorial-card--centered" aria-live="polite">
                    <div className="tutorial-card-accent" />
                    <div className="tutorial-loading">
                        <div className="tutorial-spinner" />
                        <span className="tutorial-loading-text">Chargement…</span>
                    </div>
                </div>
            )}

            {/* Carte principale */}
            {!navigating && (
                <div
                    className={`tutorial-card${isCentered ? " tutorial-card--centered" : " tutorial-card--anchored"}`}
                    style={cardStyle}
                >
                    {/* Barre d'accent gradient en haut */}
                    <div className="tutorial-card-accent" />

                    {/* Flèche pointant vers l'élément ciblé */}
                    {!isCentered && (
                        <div
                            className={`tutorial-card-arrow tutorial-card-arrow--${isTopbar ? "top" : "left"}`}
                            aria-hidden="true"
                        />
                    )}

                    <div className="tutorial-card-body">
                        {/* Marque brand pour les étapes centrées */}
                        {isCentered && (
                            <div className="tutorial-brand-dots" aria-hidden="true">
                                <span style={{ background: "var(--gradient-start)" }} />
                                <span style={{ background: "var(--gradient-mid)" }} />
                                <span style={{ background: "var(--gradient-mid)" }} />
                                <span style={{ background: "var(--gradient-end)" }} />
                            </div>
                        )}

                        {/* En-tête */}
                        <div className="tutorial-card-header">
                            <span className="tutorial-step-badge">
                                Étape {stepIndex + 1} / {TUTORIAL_STEPS.length}
                            </span>
                            <button
                                className="tutorial-close-btn"
                                onClick={finish}
                                aria-label="Fermer le tutoriel"
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                </svg>
                            </button>
                        </div>

                        <h3 className="tutorial-title">{currentStep.title}</h3>
                        <p className="tutorial-description">{currentStep.description}</p>

                        {/* Barre de progression */}
                        <div className="tutorial-progress-bar" aria-hidden="true">
                            <div className="tutorial-progress-fill" style={{ width: `${progress}%` }} />
                        </div>

                        {/* Pastilles d'étapes */}
                        <div className="tutorial-dots" role="tablist" aria-label="Étapes du tutoriel">
                            {TUTORIAL_STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    role="tab"
                                    aria-selected={i === stepIndex}
                                    className={`tutorial-dot${i === stepIndex ? " active" : i < stepIndex ? " done" : ""}`}
                                />
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="tutorial-footer">
                            {!isLast && (
                                <button className="tutorial-btn tutorial-btn--skip" onClick={finish}>
                                    Passer le tutoriel
                                </button>
                            )}
                            <div className="tutorial-footer-right">
                                {!isFirst && (
                                    <button className="tutorial-btn tutorial-btn--ghost" onClick={goPrev}>
                                        Précédent
                                    </button>
                                )}
                                <button
                                    className="tutorial-btn tutorial-btn--primary"
                                    onClick={goNext}
                                    autoFocus
                                >
                                    {isLast ? "Commencer" : "Suivant"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
