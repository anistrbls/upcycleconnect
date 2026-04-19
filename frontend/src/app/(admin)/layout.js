"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../lib/api";
import { getDefaultSubRoute, getModuleByKey, NAV_MODULES, SALARIE_MODULES, PARTICULIER_MODULES } from "../lib/constants";
import { Icon } from "../components/admin/Icon";

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const currentSubKey = pathname.split("/").filter(Boolean)[1] || "";

    const { activeModule } = useMemo(() => {
        const parts = pathname.split("/").filter(Boolean);
        const moduleKey = parts[0] || "vue-globale";

        const module = getModuleByKey(moduleKey);
        return { activeModule: module };
    }, [pathname]);

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

    const handleLogout = () => {
        window.localStorage.removeItem(TOKEN_KEY);
        router.replace("/login");
    };

    const handleModuleChange = (moduleKey) => {
        if (isAdmin && moduleKey === "annonces") {
            router.push("/annonces/mes-annonces");
            return;
        }
        if (isPro && moduleKey === "annonces") {
            router.push("/annonces/disponible");
            return;
        }
        if (isParticulier && moduleKey === "evenements") {
            router.push("/evenements/activites");
            return;
        }
        router.push(getDefaultSubRoute(moduleKey));
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

    const isSalarie = user?.role === "salarie";
    const isAdmin = user?.role === "admin";
    const isPro = user?.role === "professionnel";
    const isParticulier = user?.role === "particulier";
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
        { key: "mon-planning", label: "Mon planning", shortLabel: "Planning" },
    ];
    const visibleSubNav = activeModule.key === "annonces"
        ? (isAdmin ? adminAnnoncesSubNav : (isPro ? proAnnoncesSubNav : activeModule.subNav))
        : (activeModule.key === "evenements" && isParticulier)
        ? particulierEvenementsSubNav
        : activeModule.subNav;
    const userDisplayName = (() => {
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
        ? ["annonces"]
        : isParticulier
        ? ["vue-globale", "annonces", "evenements"]
        : ["vue-globale", "annonces"];
    const isSalarieModule = activeModule.key.startsWith("salarie-");
    const isModuleAllowed = isAdmin || (isSalarie && isSalarieModule) || allowedModulesForUsers.includes(activeModule.key);

    // Filtrer la sidebar
    const displayedModules = isAdmin
        ? NAV_MODULES
        : isSalarie
        ? SALARIE_MODULES
        : isParticulier
        ? PARTICULIER_MODULES
        : NAV_MODULES.filter(m => allowedModulesForUsers.includes(m.key));

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
                    {(isAdmin || isSalarieModule || activeModule.key === "annonces" || (isParticulier && activeModule.key === "evenements")) && visibleSubNav.map((subItem) => (
                        <button
                            key={subItem.key}
                            className={`action-btn ${currentSubKey === subItem.key ? "primary" : ""}`}
                            onClick={() => handleSubNavChange(subItem.key)}
                            type="button"
                        >
                            <span className="action-label-long">{subItem.label}</span>
                            <span className="action-label-short">{subItem.shortLabel || subItem.label}</span>
                        </button>
                    ))}
                    {!isAdmin && activeModule.key === "vue-globale" && (
                        <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", background: "#f8fafb", padding: "0.4rem 1rem", borderRadius: "100px", border: "1px solid #e2eaea" }}>
                            Mode {userRoleLabel}
                        </div>
                    )}
                </div>

                <div className="topbar-right">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginRight: "1rem" }}>
                        {!isAdmin && <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>{userDisplayName || user?.email}</span>}
                        <button className="top-icon" onClick={handleLogout} title="Se déconnecter" aria-label="Se déconnecter"><Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></button>
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
                                    Bienvenue, <strong>{user?.email}</strong>.<br />
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
        </div>
    );
}
