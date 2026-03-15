"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../lib/api";
import { getDefaultSubRoute, getModuleByKey, getSubNavItem, NAV_MODULES } from "../lib/constants";
import { Icon } from "../components/admin/Icon";

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const { activeModule, activeSub } = useMemo(() => {
        const [moduleKey, subKey] = pathname.split("/").filter(Boolean);
        const module = getModuleByKey(moduleKey);
        const sub = getSubNavItem(module.key, subKey);
        return { activeModule: module, activeSub: sub };
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
                            onClick={() => handleSubNavChange(subItem.key)}
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

                <main className="main-content">{children}</main>
            </div>
        </div>
    );
}
