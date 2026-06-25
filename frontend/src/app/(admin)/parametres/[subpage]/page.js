"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { Loader2, Bell, Settings, Sun, Moon, Check, CreditCard, Activity, Search, Filter } from "lucide-react";

const styles = {
    container: {
        width: "100%",
        padding: "0 0 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "2.5rem",
        alignItems: "start",
        width: "100%",
        marginTop: "1.5rem",
    },
    panel: {
        background: "var(--surface-hover, #f8fafc)",
        borderRadius: "28px",
        padding: "2.5rem",
        width: "100%",
        border: "none",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
    },
    sectionHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        marginBottom: "2rem",
        borderBottom: "1px solid var(--border, #e2e8f0)",
        paddingBottom: "1rem",
    },
    sectionTitle: {
        fontSize: "1.1rem",
        fontWeight: "600",
        color: "var(--text-main, #0f172a)",
    },
    mutedBadge: {
        fontSize: "0.85rem",
        color: "var(--state-critical, #ef4444)",
        background: "rgba(239, 68, 68, 0.05)",
        border: "1px solid rgba(239, 68, 68, 0.15)",
        padding: "0.75rem 1rem",
        borderRadius: "12px",
        textAlign: "center",
        marginBottom: "1.5rem",
        fontWeight: "500",
    },
    settingsList: {
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
    },
    settingItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 1.25rem",
        background: "white",
        borderRadius: "16px",
        border: "1px solid var(--border, #e2e8f0)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.01)",
        gap: "2rem",
    },
    settingText: {
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        flex: 1,
    },
    settingLabel: {
        fontSize: "0.95rem",
        fontWeight: "600",
        color: "var(--text-main, #0f172a)",
    },
    settingDesc: {
        fontSize: "0.82rem",
        color: "var(--text-muted, #64748b)",
        lineHeight: 1.4,
    },
    switch: {
        position: "relative",
        display: "inline-block",
        width: "42px",
        height: "24px",
        cursor: "pointer",
        flexShrink: 0,
    },
    switchInput: {
        opacity: 0,
        width: 0,
        height: 0,
    },
    slider: {
        position: "absolute",
        cursor: "pointer",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transition: "all 0.3s ease",
        borderRadius: "34px",
        display: "flex",
        alignItems: "center",
        padding: "0 3px",
    },
    sliderDot: {
        height: "18px",
        width: "18px",
        borderRadius: "50%",
        backgroundColor: "white",
        transition: "all 0.3s ease",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
    },
    select: {
        padding: "0.5rem 1rem",
        borderRadius: "12px",
        border: "1px solid var(--border, #e2e8f0)",
        fontSize: "0.9rem",
        fontWeight: "500",
        color: "var(--text-main, #0f172a)",
        background: "white",
        outline: "none",
        cursor: "pointer",
        minWidth: "150px",
    },
    themeSelector: {
        display: "flex",
        gap: "0.5rem",
    },
    themeButton: {
        padding: "0.5rem 1rem",
        borderRadius: "12px",
        fontSize: "0.88rem",
        fontWeight: "600",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        transition: "all 0.2s ease",
    },
    toast: {
        position: "fixed",
        bottom: "2.5rem",
        right: "2.5rem",
        padding: "1rem 1.5rem",
        borderRadius: "16px",
        background: "#0f172a",
        color: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "0.88rem",
        fontWeight: "500",
        border: "1px solid rgba(255,255,255,0.1)",
        animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    }
};

export default function SettingsSubPage({ params }) {
    const router = useRouter();
    const [subpage, setSubpage] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        appEnabled: true,
        emailEnabled: true,
        app_moderation: true,
        email_moderation: true,
        app_booking_received: true,
        email_booking_received: true,
        app_point_assigned: true,
        email_point_assigned: true,
        app_material_deposited: true,
        email_material_deposited: true,
        app_material_recovered: true,
        email_material_recovered: true,
        app_rating_received: true,
        email_rating_received: true,
        displayMode: "light",
        mapType: "plan",
        showPhonePublicly: false,
        showEmailPublicly: false,
    });
    const [toast, setToast] = useState(null);

    // Resolve params in Next.js
    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setSubpage(resolved.subpage);
        };
        resolveParams();
    }, [params]);

    // Fetch user profile and load settings from localStorage
    useEffect(() => {
        const fetchMe = async () => {
            const token = window.localStorage.getItem(TOKEN_KEY);
            if (!token) return;
            try {
                const response = await fetch(apiUrl("/auth/me"), {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                    
                    // Load settings from localStorage specific to this user
                    const saved = window.localStorage.getItem(`upcycle_settings_${data.user.id}`);
                    if (saved) {
                        try {
                            setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
                        } catch (e) {
                            console.error("Failed to parse settings", e);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMe();
    }, []);

    useEffect(() => {
        if (user?.role === "admin" && subpage === "general") {
            router.replace("/parametres/configuration");
        }
    }, [router, subpage, user]);

    const saveSetting = (key, value) => {
        if (!user) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        window.localStorage.setItem(`upcycle_settings_${user.id}`, JSON.stringify(newSettings));
        
        // Dispatch custom event to notify other components/layouts (e.g. layout.js) in real time
        window.dispatchEvent(new Event("upcycle-settings-changed"));

        // Show success toast
        setToast("Paramètre enregistré avec succès !");
        setTimeout(() => setToast(null), 2500);
    };

    if (loading || !subpage) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--emerald-deep)" />
                <style jsx>{`
                    .animate-spin { animation: spin 1s linear infinite; }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Admins keep their ModulePlaceholder, except for implemented subpages
    if (user?.role === "admin" && !["integrations", "journal-systeme"].includes(subpage)) {
        const activeModule = getModuleByKey("parametres");
        const activeSub = getSubNavItem(activeModule.key, subpage);
        return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />;
    }

    const isPro = user?.role === "professionnel";
    const isAdmin = user?.role === "admin";
    const roleLabel = isAdmin ? "Administration" : isPro ? "Espace Pro" : "Espace particulier";

    return (
        <div style={styles.container}>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">
                        {roleLabel}
                    </span>
                    <h1>Paramètres</h1>
                </div>
            </div>

            {subpage === "notifications" ? (
                <div style={styles.panel}>
                    {/* Master Toggles Card */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "1.5rem",
                        marginBottom: "2rem",
                        background: "rgba(77, 113, 117, 0.04)",
                        padding: "1.5rem",
                        borderRadius: "20px",
                        border: "1px solid rgba(77, 113, 117, 0.1)"
                    }}>
                        {/* Master In-App */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "var(--forest-deep)" }}>
                                    Dans l'application
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                    Autoriser l'affichage d'alertes visuelles (pastille rouge et cloche).
                                </div>
                            </div>
                            <label style={styles.switch}>
                                <input 
                                    type="checkbox" 
                                    checked={settings.appEnabled} 
                                    onChange={(e) => saveSetting("appEnabled", e.target.checked)}
                                    style={styles.switchInput}
                                />
                                <span style={{
                                    ...styles.slider,
                                    backgroundColor: settings.appEnabled ? "var(--forest-deep)" : "#cbd5e1"
                                }}>
                                    <span style={{
                                        ...styles.sliderDot,
                                        transform: settings.appEnabled ? "translateX(18px)" : "translateX(0)"
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* Master E-mail */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "var(--forest-deep)" }}>
                                    Par e-mail
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                    M'envoyer des alertes par e-mail en temps réel.
                                </div>
                            </div>
                            <label style={styles.switch}>
                                <input 
                                    type="checkbox" 
                                    checked={settings.emailEnabled} 
                                    onChange={(e) => saveSetting("emailEnabled", e.target.checked)}
                                    style={styles.switchInput}
                                />
                                <span style={{
                                    ...styles.slider,
                                    backgroundColor: settings.emailEnabled ? "var(--forest-deep)" : "#cbd5e1"
                                }}>
                                    <span style={{
                                        ...styles.sliderDot,
                                        transform: settings.emailEnabled ? "translateX(18px)" : "translateX(0)"
                                    }} />
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Section Header */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        marginBottom: "1.5rem",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: "0.75rem"
                    }}>
                        <Bell size={20} color="var(--forest-deep)" />
                        <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-main)" }}>
                            Préférences par type d'alerte
                        </span>
                    </div>

                    {/* Single Unified List */}
                    <div style={styles.settingsList}>
                        {(!isPro ? [
                            {
                                appKey: "app_moderation",
                                emailKey: "email_moderation",
                                label: "Validation & modération de mes annonces",
                                desc: "Lorsqu'un administrateur valide ou refuse mon annonce."
                            },
                            {
                                appKey: "app_booking_received",
                                emailKey: "email_booking_received",
                                label: "Réservation de mes annonces",
                                desc: "Lorsqu'un professionnel réserve un de mes matériaux."
                            },
                            {
                                appKey: "app_point_assigned",
                                emailKey: "email_point_assigned",
                                label: "Assignation de point de dépôt",
                                desc: "Lorsqu'un point de dépôt est assigné pour le transit de mon matériau."
                            },
                            {
                                appKey: "app_material_deposited",
                                emailKey: "email_material_deposited",
                                label: "Confirmation de dépôt",
                                desc: "Lorsque mon dépôt de matériau dans un point relais est enregistré."
                            },
                            {
                                appKey: "app_rating_received",
                                emailKey: "email_rating_received",
                                label: "Nouvelle évaluation reçue",
                                desc: "Lorsqu'un professionnel évalue ma transaction."
                            },
                            {
                                appKey: "app_material_recovered",
                                emailKey: "email_material_recovered",
                                label: "Confirmation de récupération",
                                desc: "Lorsque mon matériau est récupéré par le professionnel."
                            }
                        ] : [
                            {
                                appKey: "app_point_assigned",
                                emailKey: "email_point_assigned",
                                label: "Assignation de point de dépôt",
                                desc: "Lorsqu'un point de dépôt est assigné pour le transit d'un matériau réservé."
                            },
                            {
                                appKey: "app_material_deposited",
                                emailKey: "email_material_deposited",
                                label: "Confirmation de dépôt",
                                desc: "Lorsque le dépôt du matériau que j'ai réservé est enregistré."
                            },
                            {
                                appKey: "app_material_recovered",
                                emailKey: "email_material_recovered",
                                label: "Confirmation de récupération",
                                desc: "Lorsque ma récupération de matériau est enregistrée."
                            }
                        ]).map((item) => (
                            <div key={item.appKey} style={styles.settingItem}>
                                <div style={styles.settingText}>
                                    <div style={styles.settingLabel}>{item.label}</div>
                                    <div style={item.desc ? styles.settingDesc : {}}>{item.desc}</div>
                                </div>
                                
                                <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
                                    {/* In-app Toggle */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>In-app</span>
                                        <label style={{ 
                                            ...styles.switch, 
                                            opacity: settings.appEnabled ? 1 : 0.4, 
                                            pointerEvents: settings.appEnabled ? "auto" : "none" 
                                        }}>
                                            <input 
                                                type="checkbox" 
                                                checked={settings[item.appKey]} 
                                                onChange={(e) => saveSetting(item.appKey, e.target.checked)}
                                                style={styles.switchInput}
                                            />
                                            <span style={{
                                                ...styles.slider,
                                                backgroundColor: settings[item.appKey] && settings.appEnabled ? "var(--forest-deep)" : "#cbd5e1"
                                            }}>
                                                <span style={{
                                                    ...styles.sliderDot,
                                                    transform: settings[item.appKey] && settings.appEnabled ? "translateX(18px)" : "translateX(0)"
                                                }} />
                                            </span>
                                        </label>
                                    </div>

                                    {/* Email Toggle */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>E-mail</span>
                                        <label style={{ 
                                            ...styles.switch, 
                                            opacity: settings.emailEnabled ? 1 : 0.4, 
                                            pointerEvents: settings.emailEnabled ? "auto" : "none" 
                                        }}>
                                            <input 
                                                type="checkbox" 
                                                checked={settings[item.emailKey]} 
                                                onChange={(e) => saveSetting(item.emailKey, e.target.checked)}
                                                style={styles.switchInput}
                                            />
                                            <span style={{
                                                ...styles.slider,
                                                backgroundColor: settings[item.emailKey] && settings.emailEnabled ? "var(--forest-deep)" : "#cbd5e1"
                                            }}>
                                                <span style={{
                                                    ...styles.sliderDot,
                                                    transform: settings[item.emailKey] && settings.emailEnabled ? "translateX(18px)" : "translateX(0)"
                                                }} />
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : subpage === "preferences" ? (
                <div style={styles.panel}>
                    <div style={styles.sectionHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <Settings size={20} color="var(--forest-deep)" />
                            <span style={styles.sectionTitle}>Préférences générales</span>
                        </div>
                    </div>

                    <div style={styles.settingsList}>
                        {/* Display Mode */}
                        <div style={styles.settingItem}>
                            <div style={styles.settingText}>
                                <div style={styles.settingLabel}>Mode d'affichage</div>
                                <div style={styles.settingDesc}>Basculer l'apparence entre le thème clair et le thème sombre (si disponible).</div>
                            </div>
                            <div style={styles.themeSelector}>
                                <button 
                                    onClick={() => saveSetting("displayMode", "light")}
                                    style={{
                                        ...styles.themeButton,
                                        backgroundColor: settings.displayMode === "light" ? "var(--forest-deep)" : "transparent",
                                        color: settings.displayMode === "light" ? "white" : "var(--text-main)",
                                        border: settings.displayMode === "light" ? "none" : "1px solid var(--border)"
                                    }}
                                >
                                    <Sun size={14} /> Clair
                                </button>
                                <button 
                                    onClick={() => saveSetting("displayMode", "dark")}
                                    style={{
                                        ...styles.themeButton,
                                        backgroundColor: settings.displayMode === "dark" ? "var(--forest-deep)" : "transparent",
                                        color: settings.displayMode === "dark" ? "white" : "var(--text-main)",
                                        border: settings.displayMode === "dark" ? "none" : "1px solid var(--border)"
                                    }}
                                >
                                    <Moon size={14} /> Sombre
                                </button>
                            </div>
                        </div>

                        {/* Map Type */}
                        <div style={styles.settingItem}>
                            <div style={styles.settingText}>
                                <div style={styles.settingLabel}>Type de carte par défaut</div>
                                <div style={styles.settingDesc}>Choisir le type de visuels cartographiques lors de la recherche d'annonces.</div>
                            </div>
                            <select 
                                value={settings.mapType} 
                                onChange={(e) => saveSetting("mapType", e.target.value)}
                                style={styles.select}
                            >
                                <option value="plan">Plan standard</option>
                                <option value="satellite">Vue Satellite</option>
                            </select>
                        </div>

                        {/* Phone Visibility */}
                        <div style={styles.settingItem}>
                            <div style={styles.settingText}>
                                <div style={styles.settingLabel}>Numéro de téléphone public</div>
                                <div style={styles.settingDesc}>Afficher votre numéro de téléphone sur la page de détail de vos annonces.</div>
                            </div>
                            <label style={styles.switch}>
                                <input 
                                    type="checkbox" 
                                    checked={settings.showPhonePublicly} 
                                    onChange={(e) => saveSetting("showPhonePublicly", e.target.checked)}
                                    style={styles.switchInput}
                                />
                                <span style={{
                                    ...styles.slider,
                                    backgroundColor: settings.showPhonePublicly ? "var(--forest-deep)" : "#cbd5e1"
                                }}>
                                    <span style={{
                                        ...styles.sliderDot,
                                        transform: settings.showPhonePublicly ? "translateX(18px)" : "translateX(0)"
                                    }} />
                                </span>
                            </label>
                        </div>

                        {/* Email Visibility */}
                        <div style={styles.settingItem}>
                            <div style={styles.settingText}>
                                <div style={styles.settingLabel}>Adresse e-mail publique</div>
                                <div style={styles.settingDesc}>Permettre aux autres utilisateurs de voir votre e-mail pour des échanges directs.</div>
                            </div>
                            <label style={styles.switch}>
                                <input 
                                    type="checkbox" 
                                    checked={settings.showEmailPublicly} 
                                    onChange={(e) => saveSetting("showEmailPublicly", e.target.checked)}
                                    style={styles.switchInput}
                                />
                                <span style={{
                                    ...styles.slider,
                                    backgroundColor: settings.showEmailPublicly ? "var(--forest-deep)" : "#cbd5e1"
                                }}>
                                    <span style={{
                                        ...styles.sliderDot,
                                        transform: settings.showEmailPublicly ? "translateX(18px)" : "translateX(0)"
                                    }} />
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            ) : subpage === "integrations" ? (
                <div style={styles.panel}>
                    <div style={styles.sectionHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <CreditCard size={20} color="var(--forest-deep)" />
                            <span style={styles.sectionTitle}>Intégrations & Paiements</span>
                        </div>
                    </div>

                    <div style={styles.settingsList}>
                        {/* Stripe Integration */}
                        <div style={styles.settingItem}>
                            <div style={styles.settingText}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <div style={styles.settingLabel}>Stripe</div>
                                    <div style={{
                                        fontSize: "0.7rem",
                                        fontWeight: "600",
                                        background: "rgba(16, 185, 129, 0.15)",
                                        color: "#059669",
                                        padding: "0.2rem 0.5rem",
                                        borderRadius: "8px"
                                    }}>
                                        Connecté
                                    </div>
                                </div>
                                <div style={styles.settingDesc}>
                                    Votre compte Stripe est actuellement connecté. Vous pouvez recevoir des paiements pour vos ateliers ou abonnements.
                                </div>
                            </div>
                            <button
                                style={{
                                    padding: "0.5rem 1rem",
                                    borderRadius: "12px",
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    color: "var(--state-critical)",
                                    border: "none",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                Gérer sur Stripe
                            </button>
                        </div>
                    </div>
                </div>
            ) : subpage === "journal-systeme" ? (
                <div style={styles.panel}>
                    <div style={styles.sectionHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <Activity size={20} color="var(--forest-deep)" />
                            <span style={styles.sectionTitle}>Journal Système</span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <div style={{ position: "relative" }}>
                                <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                                <input 
                                    type="text" 
                                    placeholder="Rechercher..." 
                                    style={{
                                        padding: "0.4rem 1rem 0.4rem 2rem",
                                        borderRadius: "12px",
                                        border: "1px solid var(--border)",
                                        fontSize: "0.85rem",
                                        outline: "none"
                                    }}
                                />
                            </div>
                            <button style={{
                                padding: "0.4rem 0.8rem",
                                borderRadius: "12px",
                                background: "white",
                                border: "1px solid var(--border)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                fontSize: "0.85rem",
                                color: "var(--text-main)",
                                cursor: "pointer"
                            }}>
                                <Filter size={14} /> Filtres
                            </button>
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                                    <th style={{ padding: "1rem 0.5rem", fontWeight: "600" }}>Horodatage</th>
                                    <th style={{ padding: "1rem 0.5rem", fontWeight: "600" }}>Niveau</th>
                                    <th style={{ padding: "1rem 0.5rem", fontWeight: "600" }}>Source</th>
                                    <th style={{ padding: "1rem 0.5rem", fontWeight: "600" }}>Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { date: "Aujourd'hui, 13:42", level: "INFO", source: "Auth", msg: "Connexion réussie pour admin@upcycleconnect.fr", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
                                    { date: "Aujourd'hui, 11:23", level: "WARN", source: "API", msg: "Tentative de paiement échouée (Stripe)", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
                                    { date: "Hier, 16:45", level: "ERROR", source: "Database", msg: "Connexion perdue pendant 2 secondes", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
                                    { date: "Hier, 09:12", level: "INFO", source: "Items", msg: "Nouvelle annonce créée (ID: 16)", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
                                    { date: "23 Juin, 14:30", level: "INFO", source: "System", msg: "Redémarrage de l'API terminé", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" }
                                ].map((log, idx) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                                        <td style={{ padding: "1rem 0.5rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{log.date}</td>
                                        <td style={{ padding: "1rem 0.5rem" }}>
                                            <span style={{
                                                fontSize: "0.7rem",
                                                fontWeight: "700",
                                                padding: "0.2rem 0.5rem",
                                                borderRadius: "6px",
                                                color: log.color,
                                                background: log.bg
                                            }}>
                                                {log.level}
                                            </span>
                                        </td>
                                        <td style={{ padding: "1rem 0.5rem", fontWeight: "500" }}>{log.source}</td>
                                        <td style={{ padding: "1rem 0.5rem", color: "var(--text-main)" }}>{log.msg}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        <span>Affichage de 5 logs sur 2,341</span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button style={{ padding: "0.3rem 0.6rem", border: "1px solid var(--border)", borderRadius: "6px", background: "white", cursor: "pointer" }}>Précédent</button>
                            <button style={{ padding: "0.3rem 0.6rem", border: "1px solid var(--border)", borderRadius: "6px", background: "white", cursor: "pointer" }}>Suivant</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={styles.panel}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Sous-page non trouvée.</p>
                </div>
            )}

            {toast && (
                <div style={styles.toast}>
                    <Check size={16} color="#4ade80" />
                    <span>{toast}</span>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
