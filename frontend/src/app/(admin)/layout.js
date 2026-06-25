"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../lib/api";
import { NAV_MODULES, PRO_MODULES, PARTICULIER_MODULES, SALARIE_MODULES } from "../lib/constants";
import { Icon } from "../components/admin/Icon";
import TutorialOverlay from "../components/shared/TutorialOverlay";
import LanguageSwitcher from "../components/i18n/LanguageSwitcher";

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [hasUnreadAlert, setHasUnreadAlert] = useState(false);

    const showNotificationsRef = useRef(showNotifications);
    useEffect(() => {
        showNotificationsRef.current = showNotifications;
    }, [showNotifications]);

    const unreadCount = notifications.filter(n => n.unread).length;

    const fetchNotifications = async (settingsChanged = false) => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            const response = await fetch(apiUrl("/notifications"), {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                const rawNotifications = data.notifications || [];
                
                // Get user settings from localStorage
                let appEnabled = true;
                let appModeration = true;
                let appBookingReceived = true;
                let appPointAssigned = true;
                let appMaterialDeposited = true;
                let appMaterialRecovered = true;
                let appRatingReceived = true;

                if (user?.id) {
                    const savedSettings = window.localStorage.getItem(`upcycle_settings_${user.id}`);
                    if (savedSettings) {
                        try {
                            const parsed = JSON.parse(savedSettings);
                            if (parsed.appEnabled !== undefined) appEnabled = parsed.appEnabled;
                            if (parsed.app_moderation !== undefined) appModeration = parsed.app_moderation;
                            if (parsed.app_booking_received !== undefined) appBookingReceived = parsed.app_booking_received;
                            if (parsed.app_point_assigned !== undefined) appPointAssigned = parsed.app_point_assigned;
                            if (parsed.app_material_deposited !== undefined) appMaterialDeposited = parsed.app_material_deposited;
                            if (parsed.app_material_recovered !== undefined) appMaterialRecovered = parsed.app_material_recovered;
                            if (parsed.app_rating_received !== undefined) appRatingReceived = parsed.app_rating_received;
                        } catch (e) {
                            console.error("Failed to parse settings in layout", e);
                        }
                    }
                }

                // Track notifications received while the corresponding toggles were disabled
                let allDisabledIds = [];
                if (user?.id) {
                    const disabledKey = `disabled_notifications_${user.id}`;
                    
                    // Identify notifications currently disabled
                    const disabledIdsInRaw = [];
                    rawNotifications.forEach(n => {
                        let isDisabled = !appEnabled;
                        if (!isDisabled) {
                            if (n.type === "material" || n.type === "tip") {
                                isDisabled = !appModeration;
                            } else if (n.type === "booking_received") {
                                isDisabled = !appBookingReceived;
                            } else if (n.type === "point_assigned") {
                                isDisabled = !appPointAssigned;
                            } else if (n.type === "material_deposited") {
                                isDisabled = !appMaterialDeposited;
                            } else if (n.type === "material_recovered") {
                                isDisabled = !appMaterialRecovered;
                            } else if (n.type === "rating_received") {
                                isDisabled = !appRatingReceived;
                            }
                        }
                        if (isDisabled) {
                            disabledIdsInRaw.push(n.id);
                        }
                    });

                    // Read previously stored disabled notification IDs
                    const storedDisabledStr = window.localStorage.getItem(disabledKey);
                    let storedDisabled = [];
                    if (storedDisabledStr) {
                        try {
                            storedDisabled = JSON.parse(storedDisabledStr);
                        } catch (e) {
                            console.error("Failed to parse stored disabled notifications", e);
                        }
                    }

                    // Keep storage clean: only retain IDs that still exist in rawNotifications
                    const rawIds = new Set(rawNotifications.map(n => n.id));
                    const updatedDisabled = Array.from(new Set([...storedDisabled, ...disabledIdsInRaw]))
                        .filter(id => rawIds.has(id));

                    window.localStorage.setItem(disabledKey, JSON.stringify(updatedDisabled));
                    allDisabledIds = updatedDisabled;
                }

                // Filter notifications based on settings and disabled history
                let newNotifications = [];
                if (appEnabled) {
                    newNotifications = rawNotifications.filter(n => {
                        // Filter out if it was received while its setting was disabled
                        if (allDisabledIds.includes(n.id)) {
                            return false;
                        }
                        if (n.type === "material" || n.type === "tip") {
                            return appModeration;
                        }
                        if (n.type === "booking_received") {
                            return appBookingReceived;
                        }
                        if (n.type === "point_assigned") {
                            return appPointAssigned;
                        }
                        if (n.type === "material_deposited") {
                            return appMaterialDeposited;
                        }
                        if (n.type === "material_recovered") {
                            return appMaterialRecovered;
                        }
                        if (n.type === "rating_received") {
                            return appRatingReceived;
                        }
                        return true;
                    });
                }
                
                setNotifications(newNotifications);

                if (user?.id) {
                    const maxSeenKey = `max_seen_notification_id_${user.id}`;
                    if (showNotificationsRef.current || settingsChanged) {
                        const newMaxId = rawNotifications.reduce((max, n) => n.id > max ? n.id : max, 0);
                        if (newMaxId > 0) {
                            window.localStorage.setItem(maxSeenKey, newMaxId.toString());
                        }
                        setHasUnreadAlert(false);
                    } else {
                        const storedMaxSeenStr = window.localStorage.getItem(maxSeenKey);
                        const currentMaxSeenId = storedMaxSeenStr ? parseInt(storedMaxSeenStr, 10) : 0;
                        const hasNewUnread = newNotifications.some(n => n.unread && n.id > currentMaxSeenId);
                        
                        if (hasNewUnread) {
                            setHasUnreadAlert(true);
                        } else if (newNotifications.filter(n => n.unread).length === 0) {
                            setHasUnreadAlert(false);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    const toggleNotifications = () => {
        setShowNotifications(prev => !prev);
    };

    const markAllAsRead = async () => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            const response = await fetch(apiUrl("/notifications/read-all"), {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
            }
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const toggleRead = async (id) => {
        const target = notifications.find(n => n.id === id);
        if (!target || !target.unread) return;

        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            const response = await fetch(apiUrl(`/notifications/${id}/read`), {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
            }
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const deleteNotification = async (id) => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            const response = await fetch(apiUrl(`/notifications/${id}`), {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (err) {
            console.error("Failed to delete notification:", err);
        }
    };

    const formatNotifDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return "À l'instant";
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours} h`;
        
        return d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        const handleSettingsChange = () => {
            fetchNotifications(true);
        };
        window.addEventListener("upcycle-settings-changed", handleSettingsChange);

        const interval = setInterval(fetchNotifications, 30000);
        return () => {
            window.removeEventListener("upcycle-settings-changed", handleSettingsChange);
            clearInterval(interval);
        };
    }, [user]);

    useEffect(() => {
        if (showNotifications) {
            setHasUnreadAlert(false);
            fetchNotifications();
        }
    }, [showNotifications]);
    const pathParts = pathname.split("/").filter(Boolean);
    let currentSubKey = pathParts[1] || "";
    if (pathParts[0] === "conseils" && ["detail", "modifier", "nouveau"].includes(currentSubKey)) {
        currentSubKey = "tous-conseils";
    }
    const isSalarie = user?.role === "salarie";
    const isAdmin = user?.role === "admin";
    const isPro = user?.role === "professionnel";
    const isParticulier = user?.role === "particulier";

    const getModulesForRole = (admin, salarie, pro, particulier) => {
        if (admin) return NAV_MODULES;
        if (salarie) return SALARIE_MODULES;
        if (pro) return PRO_MODULES;
        if (particulier) return PARTICULIER_MODULES;
        return NAV_MODULES;
    };

    const getDefaultSubRouteForRole = (moduleKey, admin, salarie, pro, particulier) => {
        const modules = getModulesForRole(admin, salarie, pro, particulier);
        const module = modules.find((m) => m.key === moduleKey) || modules[0] || NAV_MODULES[0];
        return `/${module.key}/${module.subNav[0].key}`;
    };

    const { activeModule } = useMemo(() => {
        const parts = pathname.split("/").filter(Boolean);
        const moduleKey = parts[0] || "vue-globale";

        const modules = getModulesForRole(isAdmin, isSalarie, isPro, isParticulier);
        const module = modules.find((m) => m.key === moduleKey) || modules[0] || NAV_MODULES[0];
        return { activeModule: module };
    }, [pathname, isAdmin, isSalarie, isPro, isParticulier]);

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

                const data = await response.json();
                setUser(data.user);
                setIsCheckingAuth(false);
            } catch {
                window.localStorage.removeItem(TOKEN_KEY);
                router.replace("/login");
            }
        };

        verifyToken();
    }, [router]);

    useEffect(() => {
        const currentModuleKey = pathname.split("/").filter(Boolean)[0] || "";
        if (isPro && currentModuleKey === "annonces") {
            const forbiddenForPro = new Set(["deposer", "mes-annonces", "brouillons", "moderation", "points-depot", "logistique"]);
            if (forbiddenForPro.has(currentSubKey)) {
                router.replace("/annonces/disponible");
            }
        }
        if (isPro && currentModuleKey === "projets") {
            const forbiddenForProProjects = new Set(["moderation", "actifs"]);
            if (forbiddenForProProjects.has(currentSubKey)) {
                router.replace("/projets/mes-projets");
            }
        }
    }, [isPro, pathname, currentSubKey, router]);

    useEffect(() => {
        const moduleKey = pathname.split("/").filter(Boolean)[0] || "";
        if (isSalarie && moduleKey === "prestations" && currentSubKey === "mes-reservations") {
            router.replace("/prestations/catalogue");
        }
    }, [isSalarie, pathname, currentSubKey, router]);

    const handleLogout = () => {
        window.localStorage.removeItem(TOKEN_KEY);
        router.replace("/login");
    };

    const handleModuleChange = (moduleKey) => {
        if (isAdmin && moduleKey === "annonces") {
            router.push("/annonces/mes-annonces");
            return;
        }
        if (isAdmin && moduleKey === "parametres") {
            router.push("/parametres/configuration");
            return;
        }
        if (isPro && moduleKey === "vue-globale") {
            router.push("/vue-globale/vue-generale");
            return;
        }
        if (isPro && moduleKey === "annonces") {
            router.push("/annonces/disponible");
            return;
        }
        if (isPro && moduleKey === "evenements") {
            router.push("/evenements/activites");
            return;
        }
        if (isParticulier && moduleKey === "evenements") {
            router.push("/evenements/activites");
            return;
        }
        if (isSalarie && moduleKey === "prestations") {
            router.push("/prestations/catalogue");
            return;
        }
        router.push(getDefaultSubRouteForRole(moduleKey, isAdmin, isSalarie, isPro, isParticulier));
    };

    const handleSubNavChange = (subKey) => {
        router.push(`/${activeModule.key}/${subKey}`);
    };

    if (isCheckingAuth) {
        return (
            <div className="auth-loading-screen">
                <div className="auth-loading-card">Vérification de session...</div>
            </div>
        );
    }
    const userRoleLabel = user?.role === "salarie" ? "Salarié" : user?.role === "particulier" ? "Particulier" : user?.role === "professionnel" ? "Professionnel" : user?.role;
    const adminAnnoncesSubNav = [
        { key: "mes-annonces", label: "Annonces actives", shortLabel: "Actives" },
        { key: "moderation", label: "Modération", shortLabel: "Modération" },
        { key: "points-depot", label: "Points de dépôt", shortLabel: "Dépôts" },
        { key: "logistique", label: "Suivi logistique", shortLabel: "Logistique" },
    ];
    const proAnnoncesSubNav = [
        { key: "disponible", label: "Annonces disponibles", shortLabel: "Disponibles" },
        { key: "mes-recuperations", label: "Mes récupérations", shortLabel: "Récupérations" },
    ];
    const particulierEvenementsSubNav = [
        { key: "activites", label: "Activités", shortLabel: "Activités" },
        { key: "mes-inscriptions", label: "Mes inscriptions", shortLabel: "Inscriptions" },
        { key: "agenda", label: "Agenda", shortLabel: "Agenda" },
    ];
    const visibleSubNav = (activeModule.key === "annonces"
        ? (isAdmin ? adminAnnoncesSubNav : (isPro ? proAnnoncesSubNav : activeModule.subNav))
        : (activeModule.key === "evenements" && (isParticulier || isPro))
        ? particulierEvenementsSubNav
        : activeModule.subNav
    ).filter((subItem) => !subItem.hideInTopbar);
    const userDisplayName = (() => {
        if (user?.firstname && user?.lastname) {
            return `${user.firstname} ${user.lastname}`;
        }
        if (user?.firstname) return user.firstname;

        const email = user?.email || "";
        const localPart = email.split("@")[0] || "";
        if (!localPart) return "";

        const capitalize = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";
        const separatorParts = localPart.split(/[._-]+/).filter(Boolean);

        if (separatorParts.length >= 2) {
            return separatorParts.map(capitalize).join(" ");
        }

        if (localPart.length >= 7) {
            const firstName = capitalize(localPart.slice(0, 3));
            const lastName = capitalize(localPart.slice(3));
            return `${firstName} ${lastName}`;
        }

        return capitalize(localPart);
    })();

    // Modules autorisés pour les utilisateurs non-admins
    const allowedModulesForUsers = isPro
        ? PRO_MODULES.map(m => m.key)
        : isParticulier
        ? PARTICULIER_MODULES.map(m => m.key)
        : isSalarie
        ? SALARIE_MODULES.map(m => m.key)
        : ["vue-globale", "annonces"];
    const isSalarieModule = isSalarie
        ? SALARIE_MODULES.some(m => m.key === activeModule.key)
        : activeModule.key.startsWith("salarie-");
    const isModuleAllowed = isAdmin || (isSalarie && isSalarieModule) || allowedModulesForUsers.includes(activeModule.key);

    // Filtrer la sidebar
    const displayedModules = isAdmin
        ? NAV_MODULES
        : isSalarie
        ? SALARIE_MODULES
        : isPro
        ? PRO_MODULES
        : isParticulier
        ? PARTICULIER_MODULES
        : NAV_MODULES.filter(m => allowedModulesForUsers.includes(m.key));

    return (
        <div className="app-wrapper">
            {isParticulier && !user?.tutorialCompleted && <TutorialOverlay userId={user?.id} userEmail={user?.email} />}
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
                    {(isAdmin || isSalarieModule || isPro || isParticulier || activeModule.key === "annonces") && visibleSubNav.map((subItem) => (
                        <button
                            key={subItem.key}
                            className={`action-btn ${currentSubKey === subItem.key ? "primary" : ""}`}
                            onClick={() => handleSubNavChange(subItem.key)}
                            type="button"
                            data-tutorial-subnav-id={subItem.key}
                        >
                            <span className="action-label-long">{subItem.label}</span>
                            <span className="action-label-short">{subItem.shortLabel || subItem.label}</span>
                        </button>
                    ))}
                </div>

                <div className="topbar-right">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginRight: "1rem" }}>
                        <LanguageSwitcher />
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>{userDisplayName || user?.email}</span>
                        <button className="top-icon" onClick={handleLogout} title="Se déconnecter" aria-label="Se déconnecter"><Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></button>
                        <button 
                            className="top-icon" 
                            onClick={toggleNotifications} 
                            title="Notifications"
                            aria-label="Notifications"
                            style={{ position: "relative" }}
                        >
                            <Icon path="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />
                            {hasUnreadAlert && (
                                <span style={{
                                    position: "absolute",
                                    top: "2px",
                                    right: "2px",
                                    width: "8px",
                                    height: "8px",
                                    backgroundColor: "#ef4444",
                                    borderRadius: "50%",
                                    display: "block",
                                    border: "1.5px solid var(--black)"
                                }} />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                <aside className="sidebar">
                    <nav className="sidebar-nav" aria-label="Navigation principale">
                        {displayedModules.map((module) => {
                            const isActive = activeModule.key === module.key;

                            return (
                                <button
                                    key={module.key}
                                    className={`sidebar-item ${isActive ? "active" : ""}`}
                                    onClick={() => handleModuleChange(module.key)}
                                    type="button"
                                    data-tooltip={module.label}
                                    data-tutorial-id={module.key}
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
                    {isModuleAllowed ? (
                        children
                    ) : (
                        <div style={{ padding: "2rem", maxWidth: "800px" }}>
                            <div className="panel" style={{ textAlign: "center", padding: "4rem 2rem" }}>
                                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚧</div>
                                <h2 style={{ marginBottom: "1rem" }}>Espace en construction</h2>
                                <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: 1.6 }}>
                                    Bienvenue, <strong data-i18n-user-content="true">{user?.email}</strong>.<br />
                                    Votre espace pour accéder au module <strong>{activeModule.label}</strong> est actuellement en cours de développement.
                                </p>
                                <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
                                    Utilisez la barre latérale pour accéder aux fonctionnalités disponibles.
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Notification curtain backdrop */}
            {showNotifications && (
                <div
                    onClick={() => setShowNotifications(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        backdropFilter: "blur(4px)",
                        zIndex: 9999,
                    }}
                />
            )}

            {/* Notification curtain (drawer) */}
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: showNotifications ? 0 : "-25vw",
                    width: "25vw",
                    height: "100vh",
                    backgroundColor: "var(--surface, #ffffff)",
                    borderLeft: "1px solid var(--border)",
                    boxShadow: "-8px 0 30px rgba(24, 43, 45, 0.08)",
                    zIndex: 10000,
                    transition: "right 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                }}
            >
                {/* Header */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1.5rem",
                    borderBottom: "1px solid var(--border)",
                    flexShrink: 0
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <h2 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-main)", margin: 0 }}>
                            Notifications
                        </h2>
                        {unreadCount > 0 && (
                            <span style={{
                                backgroundColor: "var(--green-leaf)",
                                color: "var(--forest-deep)",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "999px"
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowNotifications(false)}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "0.25rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                        <Icon path="M18 6 6 18 M6 6 18 18" />
                    </button>
                </div>

                {/* Mark all as read bar */}
                {notifications.length > 0 && (
                    <div style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "var(--surface-hover)",
                        borderBottom: "1px solid var(--border)",
                        flexShrink: 0
                    }}>
                        <button
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: unreadCount === 0 ? "var(--text-muted)" : "var(--forest-deep)",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                cursor: unreadCount === 0 ? "default" : "pointer",
                                opacity: unreadCount === 0 ? 0.5 : 1,
                                padding: 0
                            }}
                        >
                            Tout marquer comme lu
                        </button>
                    </div>
                )}

                {/* Notifications list */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "1rem"
                }} className="main-content-scroll">
                    {notifications.length === 0 ? (
                        <div style={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                            textAlign: "center",
                            padding: "2rem"
                        }}>
                            <span style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔔</span>
                            <p style={{ fontSize: "0.9rem" }}>Vous n'avez pas de notifications.</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {notifications.map((n) => {
                                let typeBg = "rgba(0,0,0,0.04)";
                                let typeColor = "var(--text-muted)";
                                let indicator = "🔵";
                                
                                if (n.type === "material") {
                                    typeBg = "rgba(229, 255, 188, 0.4)";
                                    typeColor = "#3e4a1a";
                                    indicator = "🌿";
                                } else if (n.type === "project") {
                                    typeBg = "rgba(77, 113, 117, 0.15)";
                                    typeColor = "var(--forest-deep)";
                                    indicator = "🛠️";
                                } else if (n.type === "reservation" || n.type === "booking_received") {
                                    typeBg = "rgba(182, 165, 159, 0.2)";
                                    typeColor = "#7A5C52";
                                    indicator = "📦";
                                } else if (n.type === "point_assigned") {
                                    typeBg = "rgba(56, 189, 248, 0.15)";
                                    typeColor = "#0369a1";
                                    indicator = "📍";
                                } else if (n.type === "material_deposited") {
                                    typeBg = "rgba(34, 197, 94, 0.15)";
                                    typeColor = "#15803d";
                                    indicator = "📥";
                                } else if (n.type === "material_recovered") {
                                    typeBg = "rgba(168, 85, 247, 0.15)";
                                    typeColor = "#7e22ce";
                                    indicator = "🚚";
                                } else if (n.type === "rating_received") {
                                    typeBg = "rgba(234, 179, 8, 0.15)";
                                    typeColor = "#a16207";
                                    indicator = "⭐";
                                } else if (n.type === "tip") {
                                    typeBg = "rgba(202, 214, 216, 0.3)";
                                    typeColor = "#4F6163";
                                    indicator = "💡";
                                }

                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => toggleRead(n.id)}
                                        style={{
                                            padding: "1rem",
                                            borderRadius: "16px",
                                            border: n.unread ? "1px solid var(--forest-deep)" : "1px solid var(--border)",
                                            background: n.unread ? "rgba(77, 113, 117, 0.03)" : "var(--surface)",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            position: "relative",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "0.4rem"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(24, 43, 45, 0.04)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.boxShadow = "none";
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                                            <span style={{
                                                fontSize: "0.72rem",
                                                fontWeight: "700",
                                                padding: "0.15rem 0.5rem",
                                                borderRadius: "20px",
                                                background: typeBg,
                                                color: typeColor,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}>
                                                <span>{indicator}</span>
                                                <span data-i18n-user-content="true">{n.title}</span>
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(n.id);
                                                }}
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    color: "var(--text-muted)",
                                                    cursor: "pointer",
                                                    padding: "0.1rem",
                                                    fontSize: "0.8rem",
                                                    opacity: 0.6
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <p style={{
                                            fontSize: "0.85rem",
                                            color: "var(--text-main)",
                                            margin: 0,
                                            lineHeight: 1.4,
                                            fontWeight: n.unread ? "500" : "400"
                                        }}>
                                            <span data-i18n-user-content="true">{n.message}</span>
                                        </p>
                                        <span style={{
                                            fontSize: "0.72rem",
                                            color: "var(--text-muted)",
                                            alignSelf: "flex-end"
                                        }}>
                                            {formatNotifDate(n.createdAt)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
