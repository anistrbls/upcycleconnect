"use client";

import { useEffect, useState, useCallback } from "react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";
import { Check, Sparkles, AlertCircle, Calendar, ShieldCheck, XCircle, CreditCard, ArrowRight } from "lucide-react";

const normalizeBillingCycle = (value) => {
    return value === "year" || value === "annual" ? "year" : "month";
};

const getPlanMonthlyPrice = (plan) => {
    const value = Number(plan?.priceEuro ?? 0);
    return Number.isFinite(value) ? value : 0;
};

export default function MySubscriptionView() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast] = useState(null);
    const [billingCycle, setBillingCycle] = useState("month");
    const [downgradeModal, setDowngradeModal] = useState({
        open: false,
        blocker: null,
        selectedIds: [],
        archiving: false,
    });
    const [plans, setPlans] = useState([
        {
            key: "decouverte",
            name: "Découverte",
            priceEuro: 0,
            price: "0 €",
            period: "/ mois",
            color: "#4F6163",
            bgHeader: "#EAF0F1",
            features: [
                "Offre gratuite par défaut pour les professionnels",
                "Accès aux annonces publiques",
                "Réservation/récupération standard",
                "Historique simple des récupérations",
                "Justificatifs individuels",
                "Gestion simple des projets",
                "Accès aux conseils",
                "Accès aux événements publics",
                "Accès au forum",
                "Notifications standards",
                "Maximum 3 projets actif"
            ],
            ctaLabel: "Votre plan actuel",
        },
        {
            key: "pro_essentiel",
            name: "Pro Essentiel",
            priceEuro: 15,
            price: "15 €",
            period: "/ mois",
            color: "#2E5C60",
            bgHeader: "#D6EEF0",
            features: [
                "Tout ce qui est inclus dans Découverte",
                "Maximum 10 projets actifs",
                "Jusqu’à 5 alertes personnalisées",
                "Alertes sur matériaux recherchés",
                "Filtres avancés sur les annonces",
                "Dashboard professionnel simple",
                "Statistiques basiques",
                "Export simple de l’historique",
                "Notifications ciblées",
                "Suivi et gestion amélioré des projets"
            ],
            ctaLabel: "Choisir Pro Essentiel",
        },
        {
            key: "premium_atelier",
            name: "Premium Atelier",
            priceEuro: 30,
            price: "30 €",
            period: "/ mois",
            color: "#3E4A1A",
            bgHeader: "#E5FFBC",
            features: [
                "Tout ce qui est inclus dans Pro Essentiel",
                "Projets actifs illimités",
                "Jusqu’à 20 alertes personnalisées",
                "Accès prioritaire limité aux annonces marquées premium",
                "Dashboard professionnel avancé",
                "Analyse d’impact écologique détaillée",
                "Rapports PDF mensuels",
                "Export groupé des données",
                "Mise en avant du profil professionnel ou d’un projet",
                "Support prioritaire"
            ],
            ctaLabel: "Choisir Premium Atelier",
            badge: "Recommandé"
        }
    ]);

    const fetchPlans = useCallback(async () => {
        try {
            const res = await fetch(apiUrl("/pro/subscription-plans"), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.plans) {
                const enriched = data.plans.map(p => {
                    const priceEuro = Number(p.price_euro || 0);
                    let color = "#4F6163";
                    let bgHeader = "#EAF0F1";
                    let ctaLabel = `Choisir ${p.name}`;
                    let badge = "";

                    if (p.key === "pro_essentiel") {
                        color = "#2E5C60";
                        bgHeader = "#D6EEF0";
                    } else if (p.key === "premium_atelier") {
                        color = "#3E4A1A";
                        bgHeader = "#E5FFBC";
                        badge = "Recommandé";
                    }

                    return {
                        key: p.key,
                        name: p.name,
                        priceEuro,
                        price: `${priceEuro} €`,
                        period: "/ mois",
                        color,
                        bgHeader,
                        features: p.features || [],
                        ctaLabel,
                        badge
                    };
                });
                setPlans(enriched);
            }
        } catch (err) {
            console.error("Failed to load subscription plans from API:", err);
        }
    }, []);

    // Fetch user details
    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch(apiUrl("/auth/me"), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible de charger votre profil.");
            setUser(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Show toast message helper
    const showToast = useCallback((msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const closeDowngradeModal = useCallback(() => {
        setDowngradeModal({ open: false, blocker: null, selectedIds: [], archiving: false });
    }, []);

    // Handle stripe redirect and success confirmation
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const stripeStatus = queryParams.get("stripe");
        const sessionId = queryParams.get("session_id");

        if (stripeStatus === "success" && sessionId) {
            const confirmSubscription = async () => {
                setLoading(true);
                try {
                    const res = await fetch(apiUrl("/pro/stripe/confirm-subscription"), {
                        method: "POST",
                        headers: {
                            ...buildAuthHeaders(),
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ session_id: sessionId }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || "La confirmation de l'abonnement a échoué.");
                    showToast("Votre abonnement a été activé avec succès !", "success");
                    fetchUser();
                } catch (err) {
                    showToast(err.message, "error");
                    setLoading(false);
                }
            };
            confirmSubscription();
            
            // Clean url params
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        } else if (stripeStatus === "cancel") {
            showToast("Le processus de paiement a été annulé.", "error");
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        } else {
            fetchUser();
        }
        fetchPlans();
    }, [fetchUser, fetchPlans, showToast]);

    // Handle checkout session creation
    const handleSubscribe = async (planKey) => {
        setActionLoading(planKey);
        try {
            const res = await fetch(apiUrl("/pro/subscribe-session"), {
                method: "POST",
                headers: {
                    ...buildAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ plan: planKey, billing_cycle: billingCycle }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible d'initier la transaction Stripe.");
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                throw new Error("Stripe n'a pas renvoyé d'URL de redirection.");
            }
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setActionLoading(null);
        }
    };

    // Handle subscription cancellation
    const requestUnsubscribe = useCallback(async (requireConfirm = true) => {
        if (requireConfirm && !window.confirm("Êtes-vous sûr de vouloir résilier votre abonnement payant ? Vous garderez l'accès à votre offre jusqu'à la fin de la période en cours, puis le renouvellement sera annulé.")) {
            return;
        }
        setActionLoading("cancel");
        try {
            const res = await fetch(apiUrl("/pro/unsubscribe"), {
                method: "POST",
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 409 && data?.code === "SUBSCRIPTION_DOWNGRADE_BLOCKED") {
                    const blocker = Array.isArray(data.blockers)
                        ? data.blockers.find((b) => b?.code === "published_projects_limit")
                        : null;
                    if (blocker) {
                        setDowngradeModal({
                            open: true,
                            blocker,
                            selectedIds: [],
                            archiving: false,
                        });
                        return;
                    }
                }
                throw new Error(data.error || "Impossible de résilier l'abonnement.");
            }
            const endLabel = formatDate(data.current_period_end || data.currentPeriodEnd);
            showToast(`Résiliation programmée. Vous gardez l'accès jusqu'au ${endLabel}.`, "success");
            fetchUser();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setActionLoading(null);
        }
    }, [fetchUser, showToast]);

    const handleCancelSubscription = useCallback(async () => {
        await requestUnsubscribe(true);
    }, [requestUnsubscribe]);

    const toggleDowngradeProjectSelection = useCallback((projectId) => {
        setDowngradeModal((prev) => {
            const exists = prev.selectedIds.includes(projectId);
            return {
                ...prev,
                selectedIds: exists
                    ? prev.selectedIds.filter((id) => id !== projectId)
                    : [...prev.selectedIds, projectId],
            };
        });
    }, []);

    const archiveSelectedAndRetryDowngrade = useCallback(async () => {
        const selectedIds = downgradeModal.selectedIds;
        if (!selectedIds.length) {
            showToast("Sélectionnez au moins un projet à archiver.", "error");
            return;
        }

        setDowngradeModal((prev) => ({ ...prev, archiving: true }));
        try {
            for (const projectId of selectedIds) {
                const res = await fetch(apiUrl(`/pro/projects/${projectId}/archive`), {
                    method: "POST",
                    headers: buildAuthHeaders(),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data.error || "Impossible d'archiver un des projets sélectionnés.");
                }
            }
            closeDowngradeModal();
            showToast("Projets archivés. Nouvelle tentative de résiliation...", "success");
            await requestUnsubscribe(false);
        } catch (err) {
            showToast(err.message, "error");
            setDowngradeModal((prev) => ({ ...prev, archiving: false }));
        }
    }, [closeDowngradeModal, downgradeModal.selectedIds, requestUnsubscribe, showToast]);

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div style={{ padding: "4rem", textAlign: "center" }}>
                <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement de vos informations d'abonnement…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "3rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
                <h3 style={{ marginBottom: "0.5rem" }}>Erreur</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
                <button type="button" className="action-cta task-action-btn" onClick={fetchUser}>
                    Réessayer
                </button>
            </div>
        );
    }

    const currentPlan = user?.subscriptionType || "decouverte";
    const currentBillingCycle = normalizeBillingCycle(user?.subscriptionBillingCycle);
    const cancellationScheduled = Boolean(user?.subscriptionCancelAtPeriodEnd && currentPlan !== "decouverte");
    const cancellationEndLabel = formatDate(user?.subscriptionCurrentPeriodEnd);



    const getPlanName = (key) => {
        const plan = plans.find((p) => p.key === key);
        if (plan) return plan.name;
        return "Découverte";
    };

    return (
        <div style={{ padding: "0" }}>
            {/* Header section */}
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Finances</span>
                    <h1>Mon abonnement professionnel</h1>
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: "42rem" }}>
                        Gérez la formule de votre compte professionnel et découvrez nos offres adaptées aux artisans et ateliers de revalorisation.
                    </p>
                </div>
            </div>

            {/* Billing status banner */}
            <div className="panel" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
                <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                        Formule active
                    </span>
                    <h2 style={{ fontSize: "1.5rem", margin: "0.2rem 0", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {getPlanName(currentPlan)}
                        {currentPlan !== "decouverte" && <Sparkles size={20} color="var(--primary-color)" style={{ fill: "var(--primary-color)" }} />}
                    </h2>
                    {user?.subscriptionStart && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
                            <Calendar size={14} />
                            <span>Abonné depuis le {formatDate(user.subscriptionStart)}</span>
                        </div>
                    )}
                    {cancellationScheduled && (
                        <div style={{ marginTop: "0.6rem", color: "#b45309", fontSize: "0.86rem", fontWeight: 700 }}>
                            Résiliation programmée : accès conservé jusqu'au {cancellationEndLabel}.
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "700", color: currentPlan === "decouverte" ? "var(--text-muted)" : "var(--primary-color)", fontSize: "0.95rem" }}>
                            {cancellationScheduled ? "Résiliation programmée" : currentPlan === "decouverte" ? "Mode Gratuit" : "Abonnement Actif"}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {cancellationScheduled
                                ? `Accès jusqu'au ${cancellationEndLabel}`
                                : currentPlan === "decouverte"
                                ? "Aucune facturation"
                                : currentBillingCycle === "year"
                                    ? "Facturation annuelle"
                                    : "Facturation mensuelle"}
                        </div>
                    </div>

                    {currentPlan !== "decouverte" && (
                        <button
                            type="button"
                            className="action-btn"
                            disabled={actionLoading === "cancel" || cancellationScheduled}
                            onClick={handleCancelSubscription}
                            style={{
                                border: "1px solid var(--border-color)",
                                background: "transparent",
                                color: cancellationScheduled ? "var(--text-muted)" : "#ef4444",
                                borderRadius: "12px",
                                padding: "0.6rem 1rem",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                cursor: cancellationScheduled ? "not-allowed" : "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {actionLoading === "cancel" ? "Résiliation…" : cancellationScheduled ? "Résiliation programmée" : "Résilier"}
                        </button>
                    )}
                </div>
            </div>

            <div className="panel" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "2rem" }}>
                <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                        Mode de paiement
                    </span>
                    <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.86rem" }}>
                        Choisissez une facturation mensuelle ou un paiement annuel en une seule fois.
                    </p>
                </div>
                <div style={{ display: "inline-flex", background: "#111819", borderRadius: "999px", padding: "0.35rem", gap: "0.25rem" }}>
                    {[
                        { value: "month", label: "Mensuel" },
                        { value: "year", label: "Annuel" },
                    ].map((option) => {
                        const active = billingCycle === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setBillingCycle(option.value)}
                                style={{
                                    border: "none",
                                    borderRadius: "999px",
                                    background: active ? "#fff" : "transparent",
                                    color: active ? "var(--text-main)" : "rgba(255,255,255,0.72)",
                                    padding: "0.62rem 1.05rem",
                                    fontSize: "0.86rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    minWidth: "6rem",
                                    transition: "all 0.18s ease",
                                }}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Plans Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem", marginBottom: "2rem" }}>
                {plans.map((p) => {
                    const isActive = currentPlan === p.key;
                    const displayCycle = isActive && p.key !== "decouverte" ? currentBillingCycle : billingCycle;
                    const monthlyPrice = getPlanMonthlyPrice(p);
                    const displayedPrice = p.key === "decouverte" ? 0 : monthlyPrice * (displayCycle === "year" ? 12 : 1);
                    const displayedPeriod = p.key === "decouverte" ? "" : displayCycle === "year" ? "/ an" : "/ mois";

                    return (
                        <div
                            key={p.key}
                            className="panel"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                border: isActive ? `2px solid ${p.color}` : "1px solid var(--border-color)",
                                position: "relative",
                                padding: "0",
                                overflow: "hidden",
                                transform: isActive ? "scale(1.02)" : "none",
                                boxShadow: isActive ? "0 10px 25px rgba(0,0,0,0.08)" : "0 4px 12px rgba(0,0,0,0.02)",
                                transition: "all 0.2s"
                            }}
                        >
                            {/* Recommend Badge */}
                            {p.badge && (
                                <div style={{
                                    position: "absolute",
                                    top: "1rem",
                                    right: "1rem",
                                    background: p.color,
                                    color: "white",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "999px",
                                    fontSize: "0.7rem",
                                    fontWeight: "700",
                                    textTransform: "uppercase"
                                }}>
                                    {p.badge}
                                </div>
                            )}

                            {/* Plan Header */}
                            <div style={{ padding: "2rem 1.5rem", background: p.bgHeader, borderBottom: "1px solid var(--border-color)" }}>
                                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: p.color, marginBottom: "0.5rem" }}>
                                    {p.name}
                                </h3>
                                <div style={{ display: "flex", alignItems: "baseline" }}>
                                    <span style={{ fontSize: "2.25rem", fontWeight: "800", color: "var(--text-main)" }}>{displayedPrice} €</span>
                                    {displayedPeriod && <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "0.3rem" }}>{displayedPeriod}</span>}
                                </div>
                                {p.key !== "decouverte" && displayCycle === "year" && (
                                    <p style={{ margin: "0.45rem 0 0", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
                                        Équivalent au prix mensuel, facturé en une seule fois.
                                    </p>
                                )}
                            </div>

                            {/* Plan Features */}
                            <div style={{ padding: "2rem 1.5rem", flex: 1 }}>
                                <ul style={{ listStyle: "none", padding: "0", margin: "0", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {p.features.map((f, i) => (
                                        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.88rem", color: "var(--text-main)" }}>
                                            <Check size={16} color={p.color} style={{ marginTop: "0.15rem", flexShrink: 0 }} />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Plan CTA */}
                            <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
                                {isActive ? (
                                    <div
                                        style={{
                                            width: "100%",
                                            textAlign: "center",
                                            background: "rgba(0,0,0,0.03)",
                                            color: "var(--text-muted)",
                                            borderRadius: "12px",
                                            padding: "0.75rem",
                                            fontSize: "0.9rem",
                                            fontWeight: "700",
                                            border: "1px dashed var(--border-color)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "0.5rem"
                                        }}
                                    >
                                        <ShieldCheck size={18} color="var(--primary-color)" />
                                        Votre offre actuelle
                                    </div>
                                ) : p.key === "decouverte" ? (
                                    <div
                                        style={{
                                            width: "100%",
                                            textAlign: "center",
                                            background: "rgba(0,0,0,0.03)",
                                            color: "var(--text-muted)",
                                            borderRadius: "12px",
                                            padding: "0.75rem",
                                            fontSize: "0.9rem",
                                            fontWeight: "600",
                                            border: "1px solid var(--border-color)"
                                        }}
                                    >
                                        Inclus par défaut
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={actionLoading !== null}
                                        onClick={() => handleSubscribe(p.key)}
                                        style={{
                                            width: "100%",
                                            background: p.color,
                                            color: "white",
                                            border: "none",
                                            borderRadius: "12px",
                                            padding: "0.75rem",
                                            fontSize: "0.9rem",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "0.5rem",
                                            boxShadow: `0 4px 12px ${p.color}25`,
                                            transition: "all 0.2s"
                                        }}
                                        className="subscribe-btn"
                                    >
                                        {actionLoading === p.key ? (
                                            <div className="btn-spinner" />
                                        ) : (
                                            <>
                                                <CreditCard size={18} />
                                                {p.ctaLabel}
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {downgradeModal.open && downgradeModal.blocker && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(16, 24, 40, 0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1rem",
                        zIndex: 10000,
                    }}
                >
                    <div
                        style={{
                            width: "min(760px, 100%)",
                            maxHeight: "90vh",
                            overflow: "auto",
                            background: "#fff",
                            borderRadius: "16px",
                            border: "1px solid var(--border-color)",
                            boxShadow: "0 24px 60px rgba(16, 24, 40, 0.25)",
                            padding: "1.25rem",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <AlertCircle size={18} color="#b45309" />
                                    Downgrade bloqué
                                </h3>
                                <p style={{ margin: "0.45rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                                    Vous avez actuellement {downgradeModal.blocker.currentPublishedCount} projets publiés ou en attente de validation pour une limite de {downgradeModal.blocker.limit} en offre Découverte.
                                    Archivez au moins {downgradeModal.blocker.excess} projet(s), puis relancez la résiliation.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDowngradeModal}
                                disabled={downgradeModal.archiving}
                                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)" }}
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div style={{ marginTop: "1rem", border: "1px solid var(--border-color)", borderRadius: "12px", overflow: "hidden" }}>
                            {(downgradeModal.blocker.projects || []).map((project) => {
                                const checked = downgradeModal.selectedIds.includes(project.id);
                                return (
                                    <label
                                        key={project.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "1rem",
                                            padding: "0.75rem 0.9rem",
                                            borderBottom: "1px solid var(--border-color)",
                                            background: checked ? "#f2f8f9" : "#fff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", minWidth: 0 }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={downgradeModal.archiving}
                                                onChange={() => toggleDowngradeProjectSelection(project.id)}
                                            />
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.title || `Projet #${project.id}`}</div>
                                                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                                                    <span>Dernière mise à jour: {formatDate(project.updatedAt)}</span>
                                                    {project.moderationStatus === "pending" ? (
                                                        <span style={{ background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74", borderRadius: "999px", padding: "0.05rem 0.45rem", fontSize: "0.74rem", fontWeight: 700 }}>
                                                            En attente
                                                        </span>
                                                    ) : (
                                                        <span style={{ background: "#ecfeff", color: "#0f766e", border: "1px solid #5eead4", borderRadius: "999px", padding: "0.05rem 0.45rem", fontSize: "0.74rem", fontWeight: 700 }}>
                                                            Publié
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", flexShrink: 0 }}>ID: {project.id}</span>
                                    </label>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                {downgradeModal.selectedIds.length} projet(s) sélectionné(s)
                            </span>
                            <div style={{ display: "flex", gap: "0.6rem" }}>
                                <button
                                    type="button"
                                    onClick={closeDowngradeModal}
                                    disabled={downgradeModal.archiving}
                                    style={{
                                        border: "1px solid var(--border-color)",
                                        background: "#fff",
                                        color: "var(--text-main)",
                                        borderRadius: "10px",
                                        padding: "0.6rem 0.9rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Plus tard
                                </button>
                                <button
                                    type="button"
                                    onClick={archiveSelectedAndRetryDowngrade}
                                    disabled={downgradeModal.archiving}
                                    style={{
                                        border: "none",
                                        background: "#2E5C60",
                                        color: "#fff",
                                        borderRadius: "10px",
                                        padding: "0.6rem 0.95rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    {downgradeModal.archiving ? "Archivage..." : "Archiver la sélection puis résilier"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast feedback */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        position: "fixed",
                        bottom: "2rem",
                        right: "2rem",
                        background: "var(--black, #151a1b)",
                        color: "white",
                        padding: "1rem 1.5rem",
                        borderRadius: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        zIndex: 9999,
                        maxWidth: "min(420px, calc(100vw - 2.5rem))",
                        animation: "toastSlide 0.3s ease-out"
                    }}
                >
                    <div style={{ 
                        background: toast.type === "success" ? "var(--green-leaf, #bbf7d0)" : "#fee2e2", 
                        borderRadius: "50%", 
                        padding: "2px", 
                        display: "flex", 
                        flexShrink: 0 
                    }}>
                        {toast.type === "success" ? (
                            <Check size={16} color="var(--black, #151a1b)" />
                        ) : (
                            <XCircle size={16} color="#ef4444" />
                        )}
                    </div>
                    <span style={{ fontWeight: 500, fontSize: "0.95rem", lineHeight: 1.35 }}>{toast.msg}</span>
                </div>
            )}

            <style jsx>{`
                .loading-spinner {
                    width: 30px;
                    height: 30px;
                    border: 3px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .btn-spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                .subscribe-btn:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                .subscribe-btn:active {
                    transform: translateY(0);
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes toastSlide {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
