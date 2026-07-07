"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { Loader2, Bell, Settings, Sun, Moon, Check, ChevronDown, Package, Wrench, BookOpen, CreditCard, Activity, Search, Filter, Folder, RefreshCw, AlertTriangle, Info, AlertCircle, ChevronLeft, ChevronRight, X, MessageSquare } from "lucide-react";

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

// ─────────────────────────────────────────────────────────
// Composant Journal Système — données réelles depuis l'API
// ─────────────────────────────────────────────────────────
const LEVEL_STYLES = {
    INFO:  { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   icon: <Info size={11} /> },
    WARN:  { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",   icon: <AlertTriangle size={11} /> },
    ERROR: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",    icon: <AlertCircle size={11} /> },
    DEBUG: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",   icon: <Activity size={11} /> },
};

function formatLogDate(isoStr) {
    if (!isoStr) return "—";
    const d = new Date(isoStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    if (d >= today) return `Aujourd'hui, ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    if (d >= yesterday) return `Hier, ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function SystemLogsPanel() {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [level, setLevel] = useState("ALL");
    const [source, setSource] = useState("");
    const [sources, setSources] = useState([]);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const searchTimeout = useRef(null);
    const limit = 50;

    const fetchLogs = useCallback(async (p = page, lvl = level, q = search, src = source) => {
        setLoading(true);
        setError(null);
        try {
            const token = window.localStorage.getItem(TOKEN_KEY);
            const params = new URLSearchParams({ page: p, limit, level: lvl, search: q, source: src });
            const res = await fetch(apiUrl(`/admin/system-logs?${params}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`Erreur ${res.status}`);
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page, level, search, source]);

    const fetchSources = useCallback(async () => {
        try {
            const token = window.localStorage.getItem(TOKEN_KEY);
            const res = await fetch(apiUrl("/admin/system-logs/sources"), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSources(data.sources || []);
            }
        } catch (_) {}
    }, []);

    useEffect(() => {
        fetchLogs(page, level, search, source);
        fetchSources();
    }, [page, level, source]);

    // Debounce search
    const handleSearchChange = (val) => {
        setSearch(val);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setPage(1);
            fetchLogs(1, level, val, source);
        }, 350);
    };

    // Auto-refresh every 15s
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => fetchLogs(page, level, search, source), 15000);
        return () => clearInterval(id);
    }, [autoRefresh, page, level, search, source, fetchLogs]);

    const handleLevelChange = (lvl) => {
        setLevel(lvl);
        setPage(1);
    };

    const handleSourceChange = (src) => {
        setSource(src);
        setPage(1);
    };

    const s = {
        panel: { ...styles.panel, padding: 0, overflow: "hidden" },
        header: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            padding: "1.5rem 2rem",
            borderBottom: "1px solid var(--border, #e2e8f0)",
        },
        titleRow: { display: "flex", alignItems: "center", gap: "0.75rem" },
        title: { fontSize: "1.05rem", fontWeight: "700", color: "var(--text-main)" },
        controls: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
        searchWrap: { position: "relative" },
        searchInput: {
            padding: "0.42rem 0.9rem 0.42rem 2rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            fontSize: "0.83rem",
            outline: "none",
            background: "white",
            width: "180px",
        },
        select: {
            padding: "0.42rem 0.8rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            fontSize: "0.83rem",
            outline: "none",
            background: "white",
            color: "var(--text-main)",
            cursor: "pointer",
        },
        iconBtn: {
            padding: "0.42rem 0.7rem",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.82rem",
            color: "var(--text-main)",
            transition: "background 0.15s",
        },
    };

    return (
        <div style={s.panel}>
            {/* Header */}
            <div style={s.header}>
                <div style={s.titleRow}>
                    <Activity size={18} color="var(--forest-deep)" />
                    <span style={s.title}>Journal Système</span>
                    {total > 0 && (
                        <span style={{ fontSize: "0.75rem", fontWeight: "600", background: "rgba(77,113,117,0.1)", color: "var(--forest-deep)", padding: "0.15rem 0.55rem", borderRadius: "20px" }}>
                            {total.toLocaleString("fr-FR")} entrées
                        </span>
                    )}
                </div>
                <div style={s.controls}>
                    {/* Search */}
                    <div style={s.searchWrap}>
                        <Search size={13} color="var(--text-muted)" style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)" }} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            style={s.searchInput}
                        />
                        {search && (
                            <button onClick={() => { setSearch(""); handleSearchChange(""); }} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, lineHeight: 1 }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    {/* Level filter */}
                    <select value={level} onChange={e => handleLevelChange(e.target.value)} style={s.select}>
                        <option value="ALL">Tous les niveaux</option>
                        <option value="INFO">INFO</option>
                        <option value="WARN">WARN</option>
                        <option value="ERROR">ERROR</option>
                        <option value="DEBUG">DEBUG</option>
                    </select>
                    {/* Source filter */}
                    {sources.length > 0 && (
                        <select value={source} onChange={e => handleSourceChange(e.target.value)} style={s.select}>
                            <option value="">Toutes les sources</option>
                            {sources.map(src => <option key={src} value={src}>{src}</option>)}
                        </select>
                    )}
                    {/* Refresh */}
                    <button onClick={() => fetchLogs(page, level, search, source)} style={s.iconBtn} title="Actualiser">
                        <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    </button>
                    {/* Auto-refresh toggle */}
                    <button
                        onClick={() => setAutoRefresh(v => !v)}
                        style={{ ...s.iconBtn, background: autoRefresh ? "rgba(16,185,129,0.1)" : "white", color: autoRefresh ? "#059669" : "var(--text-main)", border: autoRefresh ? "1px solid rgba(16,185,129,0.3)" : "1px solid var(--border)" }}
                        title="Auto-actualisation 15s"
                    >
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: autoRefresh ? "#10b981" : "#94a3b8", display: "inline-block" }} />
                        Live
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
                {error ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "var(--state-critical)" }}>
                        <AlertCircle size={28} style={{ marginBottom: "0.5rem" }} />
                        <p style={{ margin: 0, fontSize: "0.9rem" }}>Erreur : {error}</p>
                    </div>
                ) : loading && logs.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        <Loader2 size={28} style={{ animation: "spin 1s linear infinite", marginBottom: "0.5rem" }} />
                        <p style={{ margin: 0, fontSize: "0.88rem" }}>Chargement des logs…</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                        <Activity size={32} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                        <p style={{ margin: 0, fontSize: "0.9rem" }}>Aucun log trouvé</p>
                        {(search || level !== "ALL" || source) && (
                            <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem" }}>Essayez de modifier vos filtres.</p>
                        )}
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                            <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border)" }}>
                                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", color: "var(--text-muted)", textAlign: "left", whiteSpace: "nowrap", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Horodatage</th>
                                <th style={{ padding: "0.75rem 0.5rem", fontWeight: "600", color: "var(--text-muted)", textAlign: "left", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Niveau</th>
                                <th style={{ padding: "0.75rem 0.5rem", fontWeight: "600", color: "var(--text-muted)", textAlign: "left", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Source</th>
                                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", color: "var(--text-muted)", textAlign: "left", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, idx) => {
                                const ls = LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO;
                                return (
                                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: idx % 2 === 0 ? "white" : "rgba(0,0,0,0.01)", transition: "background 0.1s" }}>
                                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                                            {formatLogDate(log.created_at)}
                                        </td>
                                        <td style={{ padding: "0.75rem 0.5rem" }}>
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.3rem",
                                                fontSize: "0.7rem",
                                                fontWeight: "700",
                                                padding: "0.2rem 0.55rem",
                                                borderRadius: "6px",
                                                color: ls.color,
                                                background: ls.bg,
                                                letterSpacing: "0.03em",
                                            }}>
                                                {ls.icon}
                                                {log.level}
                                            </span>
                                        </td>
                                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: "600", fontSize: "0.83rem", color: "var(--text-main)", whiteSpace: "nowrap" }}>
                                            {log.source}
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-main)", maxWidth: "520px" }}>
                                            <span style={{ fontSize: "0.83rem", lineHeight: 1.45 }}>{log.message}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer pagination */}
            {!error && logs.length > 0 && (
                <div style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} sur {total.toLocaleString("fr-FR")} entrées
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            style={{ padding: "0.35rem 0.6rem", border: "1px solid var(--border)", borderRadius: "8px", background: "white", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1, display: "flex", alignItems: "center" }}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let p;
                            if (totalPages <= 7) p = i + 1;
                            else if (page <= 4) p = i + 1;
                            else if (page >= totalPages - 3) p = totalPages - 6 + i;
                            else p = page - 3 + i;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    style={{ padding: "0.35rem 0.65rem", border: "1px solid var(--border)", borderRadius: "8px", background: p === page ? "var(--forest-deep)" : "white", color: p === page ? "white" : "var(--text-main)", cursor: "pointer", fontSize: "0.82rem", fontWeight: p === page ? "700" : "400" }}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            style={{ padding: "0.35rem 0.6rem", border: "1px solid var(--border)", borderRadius: "8px", background: "white", cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1, display: "flex", alignItems: "center" }}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

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
        app_booking_cancelled: true,
        email_booking_cancelled: true,
        app_booking_expired: true,
        email_booking_expired: true,
        app_deposit_reminder: true,
        email_deposit_reminder: true,
        app_event_moderation: true,
        email_event_moderation: true,
        app_event_registration: true,
        email_event_registration: true,
        app_event_cancellation: true,
        email_event_cancellation: true,
        app_event_assignment: true,
        email_event_assignment: true,
        app_event_update: true,
        email_event_update: true,
        app_event_reminder: true,
        email_event_reminder: true,
        app_event_refund: true,
        email_event_refund: true,
        app_conseil_engagement: true,
        app_conseil_moderation: true,
        email_conseil_moderation: true,
        app_new_conseil: true,
        email_new_conseil: true,
        app_project_engagement: true,
        // Forum
        app_forum_new_reply: true,
        email_forum_new_reply: true,
        app_forum_mention: true,
        email_forum_mention: true,
        app_forum_moderation: true,
        email_forum_moderation: true,
        app_admin_forum_report: true,
        email_admin_forum_report: true,
        // Finances
        app_finance_payment_confirmed: true,
        email_finance_payment_confirmed: true,
        app_finance_payment_received: true,
        email_finance_payment_received: true,
        app_finance_payment_failed: true,
        email_finance_payment_failed: true,
        app_finance_refund_issued: true,
        email_finance_refund_issued: true,
        app_finance_subscription_active: true,
        email_finance_subscription_active: true,
        app_material_alerts: true,
        // Prestations
        app_booking_confirmed: true,
        email_booking_confirmed: true,
        app_booking_request_received: true,
        email_booking_request_received: true,
        app_prestation_booking_cancelled: true,
        email_prestation_booking_cancelled: true,
        app_service_reminder: true,
        email_service_reminder: true,
        app_service_completed: true,
        email_service_completed: true,
        app_new_message_received: true,
        email_new_message_received: true,
        displayMode: "light",
        mapType: "plan",
        showPhonePublicly: false,
        showEmailPublicly: false,
    });
    const [toast, setToast] = useState(null);
    const [collapsedModules, setCollapsedModules] = useState({});

    const toggleModule = (key) => setCollapsedModules(prev => ({ ...prev, [key]: !prev[key] }));

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
                    // Load settings from backend API
                    try {
                        const settingsRes = await fetch(apiUrl("/user/notification-settings"), {
                            method: "GET",
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (settingsRes.ok) {
                            const apiSettings = await settingsRes.json();
                            setSettings(prev => ({ ...prev, ...apiSettings }));
                            window.localStorage.setItem(`upcycle_settings_${data.user.id}`, JSON.stringify(apiSettings));
                        } else {
                            // Fallback to localStorage if API fails
                            const saved = window.localStorage.getItem(`upcycle_settings_${data.user.id}`);
                            if (saved) setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
                        }
                    } catch (e) {
                        console.error("Failed to fetch settings from API", e);
                        const saved = window.localStorage.getItem(`upcycle_settings_${data.user.id}`);
                        if (saved) setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
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

    const saveSetting = async (key, value) => {
        if (!user) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        window.localStorage.setItem(`upcycle_settings_${user.id}`, JSON.stringify(newSettings));
        
        // Dispatch custom event to notify other components/layouts (e.g. layout.js) in real time
        window.dispatchEvent(new Event("upcycle-settings-changed"));

        // Persist to backend DB (map camelCase frontend keys → snake_case backend keys)
        try {
            const token = window.localStorage.getItem(TOKEN_KEY);
            const payload = {
                appEnabled:                            !!newSettings.appEnabled,
                emailEnabled:                          !!newSettings.emailEnabled,
                // Annonces
                app_moderation:                        !!newSettings.app_moderation,
                email_moderation:                      !!newSettings.email_moderation,
                app_booking_received:                  !!newSettings.app_booking_received,
                email_booking_received:                !!newSettings.email_booking_received,
                app_point_assigned:                    !!newSettings.app_point_assigned,
                email_point_assigned:                  !!newSettings.email_point_assigned,
                app_material_deposited:                !!newSettings.app_material_deposited,
                email_material_deposited:              !!newSettings.email_material_deposited,
                app_material_recovered:                !!newSettings.app_material_recovered,
                email_material_recovered:              !!newSettings.email_material_recovered,
                app_rating_received:                   !!newSettings.app_rating_received,
                email_rating_received:                 !!newSettings.email_rating_received,
                app_booking_cancelled:                 !!newSettings.app_booking_cancelled,
                email_booking_cancelled:               !!newSettings.email_booking_cancelled,
                app_booking_expired:                   !!newSettings.app_booking_expired,
                email_booking_expired:                 !!newSettings.email_booking_expired,
                app_deposit_reminder:                  !!newSettings.app_deposit_reminder,
                email_deposit_reminder:                !!newSettings.email_deposit_reminder,
                // Prestations
                app_booking_confirmed:                 !!newSettings.app_booking_confirmed,
                email_booking_confirmed:               !!newSettings.email_booking_confirmed,
                app_booking_request_received:          !!newSettings.app_booking_request_received,
                email_booking_request_received:        !!newSettings.email_booking_request_received,
                app_prestation_booking_cancelled:      !!newSettings.app_prestation_booking_cancelled,
                email_prestation_booking_cancelled:    !!newSettings.email_prestation_booking_cancelled,
                app_service_reminder:                  !!newSettings.app_service_reminder,
                email_service_reminder:                !!newSettings.email_service_reminder,
                app_service_completed:                 !!newSettings.app_service_completed,
                email_service_completed:               !!newSettings.email_service_completed,
                // Événements
                app_event_registration:                !!newSettings.app_event_registration,
                email_event_registration:              !!newSettings.email_event_registration,
                app_event_cancellation:                !!newSettings.app_event_cancellation,
                email_event_cancellation:              !!newSettings.email_event_cancellation,
                app_event_reminder:                    !!newSettings.app_event_reminder,
                email_event_reminder:                  !!newSettings.email_event_reminder,
                app_event_moderation:                  !!newSettings.app_event_moderation,
                email_event_moderation:                !!newSettings.email_event_moderation,
                // Forum
                app_forum_new_reply:                   !!newSettings.app_forum_new_reply,
                email_forum_new_reply:                 !!newSettings.email_forum_new_reply,
                app_forum_mention:                     !!newSettings.app_forum_mention,
                email_forum_mention:                   !!newSettings.email_forum_mention,
                app_forum_moderation:                  !!newSettings.app_forum_moderation,
                email_forum_moderation:                !!newSettings.email_forum_moderation,
                app_admin_forum_report:                !!newSettings.app_admin_forum_report,
                email_admin_forum_report:              !!newSettings.email_admin_forum_report,
                // Finances
                app_finance_payment_confirmed:         !!newSettings.app_finance_payment_confirmed,
                email_finance_payment_confirmed:       !!newSettings.email_finance_payment_confirmed,
                app_finance_payment_received:          !!newSettings.app_finance_payment_received,
                email_finance_payment_received:        !!newSettings.email_finance_payment_received,
                app_finance_payment_failed:            !!newSettings.app_finance_payment_failed,
                email_finance_payment_failed:          !!newSettings.email_finance_payment_failed,
                app_finance_refund_issued:             !!newSettings.app_finance_refund_issued,
                email_finance_refund_issued:           !!newSettings.email_finance_refund_issued,
                app_finance_subscription_active:       !!newSettings.app_finance_subscription_active,
                email_finance_subscription_active:     !!newSettings.email_finance_subscription_active,
                app_material_alerts:                   !!newSettings.app_material_alerts,
                // Conseils
                app_conseil_moderation:                !!newSettings.app_conseil_moderation,
                email_conseil_moderation:              !!newSettings.email_conseil_moderation,
                app_new_conseil:                       !!newSettings.app_new_conseil,
                email_new_conseil:                     !!newSettings.email_new_conseil,
                app_conseil_engagement:                !!newSettings.app_conseil_engagement,
                // Projets
                app_project_engagement:                !!newSettings.app_project_engagement,
                // Admin
                app_admin_new_conseil:                 !!newSettings.app_admin_new_conseil,
                email_admin_new_conseil:               !!newSettings.email_admin_new_conseil,
                // Préférences
                displayMode:                           newSettings.displayMode || "light",
                language:                              newSettings.language || "fr",
                mapType:                               newSettings.mapType || "plan",
                showPhonePublicly:                     !!newSettings.showPhonePublicly,
                showEmailPublicly:                     !!newSettings.showEmailPublicly,
            };
            await fetch(apiUrl("/user/notification-settings"), {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
        } catch (e) {
            console.error("Failed to sync notification settings to server", e);
        }

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
    if (user?.role === "admin" && !["integrations", "journal-systeme", "notifications", "configuration", "roles-permissions"].includes(subpage)) {
        const activeModule = getModuleByKey("parametres");
        const activeSub = getSubNavItem(activeModule.key, subpage);
        return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />;
    }

    const isPro = user?.role === "professionnel";
    const isSalarie = user?.role === "salarie";
    const isAdmin = user?.role === "admin";
    const roleLabel = isAdmin ? "Administration" : isSalarie ? "Espace Salarié" : isPro ? "Espace Pro" : "Espace particulier";

    let modules = [];
    if (isSalarie) {
        modules = [
            {
                key: "prestations",
                label: "Prestations",
                icon: <Wrench size={16} />,
                color: "#7c3aed",
                items: [
                    { appKey: "app_booking_confirmed", emailKey: "email_booking_confirmed", label: "Réservation de prestation assignée", desc: "Lorsqu'une réservation de prestation m'est confirmée et assignée." },
                    { appKey: "app_prestation_booking_cancelled", emailKey: "email_prestation_booking_cancelled", label: "Annulation d'une réservation de prestation", desc: "Lorsqu'un client annule une prestation sur laquelle j'interviens." },
                    { appKey: "app_service_reminder", emailKey: "email_service_reminder", label: "Rappel de prestation à venir", desc: "Rappel 24h avant le rendez-vous d'une prestation assignée." },
                ],
            },
            {
                key: "evenements",
                label: "Evenements",
                icon: <Bell size={16} />,
                color: "#0f766e",
                items: [
                    { appKey: "app_event_moderation", emailKey: "email_event_moderation", label: "Validation ou refus de mes evenements", desc: "Lorsqu'un evenement soumis par mes soins est valide ou refuse par un administrateur." },
                    { appKey: "app_event_reminder", emailKey: "email_event_reminder", label: "Rappel d'evenement a venir", desc: "Rappel 24h avant un evenement sur lequel j'interviens." },
                ],
            },
            {
                key: "conseils",
                label: "Conseils",
                icon: <BookOpen size={16} />,
                color: "#ea580c",
                items: [
                    { appKey: "app_conseil_moderation", emailKey: "email_conseil_moderation", label: "Validation ou refus de mes conseils", desc: "Lorsqu'un administrateur valide ou refuse mon conseil." },
                    { appKey: "app_conseil_engagement", emailKey: null, label: "Interactions sur mes conseils", desc: "Lorsqu'un utilisateur aime ou ajoute mon conseil à ses favoris." },
                ],
            },
        ];
    } else if (!isPro) {
        modules = [
            {
                key: "annonces",
                label: "Annonces",
                icon: <Package size={16} />,
                color: "#0d9488",
                items: [
                    { appKey: "app_moderation", emailKey: "email_moderation", label: "Validation & modération de mes annonces", desc: "Lorsqu'un administrateur valide ou refuse mon annonce." },
                    { appKey: "app_booking_received", emailKey: "email_booking_received", label: "Réservation de mes annonces", desc: "Lorsqu'un professionnel réserve un de mes matériaux." },
                    { appKey: "app_material_alerts", emailKey: null, label: "Alertes sur matériaux recherchés", desc: "Quand une annonce correspondant à un matériau sauvegardé est publiée." },
                    { appKey: "app_booking_expired", emailKey: "email_booking_expired", label: "Expiration de la réservation de mes objets", desc: "Lorsqu'un professionnel n'a pas finalisé son retrait à temps." },
                    { appKey: "app_point_assigned", emailKey: "email_point_assigned", label: "Assignation de point de dépôt", desc: "Lorsqu'un point de dépôt est assigné pour le transit de mon matériau." },
                    { appKey: "app_deposit_reminder", emailKey: "email_deposit_reminder", label: "Rappel de dépôt de mes objets", desc: "Plus que 24h pour déposer mon objet dans le conteneur." },
                    { appKey: "app_material_deposited", emailKey: "email_material_deposited", label: "Confirmation de dépôt", desc: "Lorsque mon dépôt de matériau dans un point relais est enregistré." },
                    { appKey: "app_rating_received", emailKey: "email_rating_received", label: "Nouvelle évaluation reçue", desc: "Lorsqu'un professionnel évalue ma transaction." },
                    { appKey: "app_material_recovered", emailKey: "email_material_recovered", label: "Confirmation de récupération", desc: "Lorsque mon matériau est récupéré par le professionnel." },
                ],
            },
            {
                key: "prestations",
                label: "Prestations",
                icon: <Wrench size={16} />,
                color: "#7c3aed",
                items: [
                    { appKey: "app_booking_confirmed", emailKey: "email_booking_confirmed", label: "Confirmation de ma réservation de prestation", desc: "Lorsqu'un prestataire ou un salarié confirme mon rendez-vous de prestation." },
                    { appKey: "app_prestation_booking_cancelled", emailKey: "email_prestation_booking_cancelled", label: "Annulation de ma réservation de prestation", desc: "Lorsqu'une réservation de prestation est annulée par le prestataire ou l'administrateur." },
                    { appKey: "app_service_reminder", emailKey: "email_service_reminder", label: "Rappel de prestation à venir", desc: "Rappel 24h avant le rendez-vous de ma prestation." },
                ],
            },
            {
                key: "evenements",
                label: "Evenements",
                icon: <Bell size={16} />,
                color: "#0f766e",
                items: [
                    { appKey: "app_event_registration", emailKey: "email_event_registration", label: "Confirmation d'inscription a un evenement", desc: "Lorsqu'une inscription ou un paiement d'evenement est confirme." },
                    { appKey: "app_event_cancellation", emailKey: "email_event_cancellation", label: "Annulation ou desinscription d'evenement", desc: "Lorsqu'un evenement est annule ou lorsque ma participation est desinscrite." },
                    { appKey: "app_event_reminder", emailKey: "email_event_reminder", label: "Rappel d'evenement a venir", desc: "Rappel 24h avant un evenement auquel je participe." },                ],
            },
            {
                key: "conseils",
                label: "Conseils",
                icon: <BookOpen size={16} />,
                color: "#ea580c",
                items: [
                    { appKey: "app_new_conseil", emailKey: "email_new_conseil", label: "Parution de nouveaux conseils", desc: "Lorsqu'un nouveau conseil ou guide pratique est publié par l'équipe UpcycleConnect." },
                ],
            },
        ];
    } else {
        modules = [
            {
                key: "annonces",
                label: "Annonces",
                icon: <Package size={16} />,
                color: "#0d9488",
                items: [
                    { appKey: "app_point_assigned", emailKey: "email_point_assigned", label: "Assignation de point de dépôt", desc: "Lorsqu'un point de dépôt est assigné pour le transit d'un matériau réservé." },
                    { appKey: "app_material_deposited", emailKey: "email_material_deposited", label: "Confirmation de dépôt", desc: "Lorsque le dépôt du matériau que j'ai réservé est enregistré." },
                    { appKey: "app_material_alerts", emailKey: null, label: "Alertes sur matériaux recherchés", desc: "Quand une annonce correspondant à un matériau sauvegardé est publiée." },
                    { appKey: "app_booking_cancelled", emailKey: "email_booking_cancelled", label: "Annulation de mes réservations", desc: "Lorsqu'un particulier retire ou annule son annonce." },
                    { appKey: "app_booking_expired", emailKey: "email_booking_expired", label: "Expiration de mes réservations", desc: "Lorsque le délai de retrait ou de paiement est dépassé." },
                    { appKey: "app_rating_received", emailKey: "email_rating_received", label: "Nouvelle évaluation reçue", desc: "Lorsqu'un particulier évalue ma récupération de matériau." },
                    { appKey: "app_material_recovered", emailKey: "email_material_recovered", label: "Confirmation de récupération", desc: "Lorsque ma récupération de matériau est enregistrée." },
                ],
            },
            {
                key: "prestations",
                label: "Prestations",
                icon: <Wrench size={16} />,
                color: "#7c3aed",
                items: [
                    { appKey: "app_booking_request_received", emailKey: "email_booking_request_received", label: "Nouvelle demande de prestation reçue", desc: "Lorsqu'un client soumet une demande de prestation me concernant." },
                    { appKey: "app_booking_confirmed", emailKey: "email_booking_confirmed", label: "Réservation de prestation confirmée", desc: "Lorsqu'une réservation de prestation est confirmée par un administrateur ou un salarié." },
                    { appKey: "app_prestation_booking_cancelled", emailKey: "email_prestation_booking_cancelled", label: "Annulation d'une réservation de prestation", desc: "Lorsqu'un client annule sa réservation de prestation." },
                    { appKey: "app_service_reminder", emailKey: "email_service_reminder", label: "Rappel de prestation à venir", desc: "Rappel 24h avant le rendez-vous d'une prestation assignée." },
                ],
            },
            {
                key: "evenements",
                label: "Evenements",
                icon: <Bell size={16} />,
                color: "#0f766e",
                items: [
                    { appKey: "app_event_registration", emailKey: "email_event_registration", label: "Confirmation d'inscription a un evenement", desc: "Lorsqu'une inscription ou un paiement d'evenement est confirme." },
                    { appKey: "app_event_cancellation", emailKey: "email_event_cancellation", label: "Annulation ou desinscription d'evenement", desc: "Lorsqu'un evenement est annule ou lorsque ma participation est desinscrite." },
                    { appKey: "app_event_reminder", emailKey: "email_event_reminder", label: "Rappel d'evenement a venir", desc: "Rappel 24h avant un evenement auquel je participe." },                ],
            },
            {
                key: "conseils",
                label: "Conseils",
                icon: <BookOpen size={16} />,
                color: "#ea580c",
                items: [
                    { appKey: "app_new_conseil", emailKey: "email_new_conseil", label: "Parution de nouveaux conseils", desc: "Lorsqu'un nouveau conseil ou guide pratique est publié par l'équipe UpcycleConnect." },
                ],
            },
            {
                key: "projets",
                label: "Projets",
                icon: <Folder size={16} />,
                color: "#be185d",
                items: [
                    { appKey: "app_project_engagement", emailKey: null, label: "Interactions sur mes projets", desc: "Lorsqu'un utilisateur aime ou ajoute mon projet à ses favoris." },
                ],
            },
        ];
    }

    const forumItems = [
        { appKey: "app_forum_new_reply", emailKey: "email_forum_new_reply", label: "Nouvelle réponse sur mes sujets", desc: "Quand quelqu'un commente sur un sujet que j'ai créé." },
        { appKey: "app_forum_mention", emailKey: "email_forum_mention", label: "Mentions", desc: "Quand quelqu'un me mentionne (@prenom)." },
        { appKey: "app_forum_moderation", emailKey: "email_forum_moderation", label: "Modération de mes contenus", desc: "Si un de mes contenus est masqué ou supprimé." }
    ];
    if (isAdmin || isSalarie) {
        forumItems.push({ appKey: "app_admin_forum_report", emailKey: "email_admin_forum_report", label: "Alerte Signalement Forum", desc: "Avertissement quand un utilisateur signale un post (Réservé à l'équipe)." });
    }
    modules.push({
        key: "forum",
        label: "Forum Communautaire",
        icon: <MessageSquare size={16} />,
        color: "#eab308",
        items: forumItems,
    });

    const financeItems = [];
    if (!isSalarie) {
        financeItems.push({ appKey: "app_finance_payment_confirmed", emailKey: "email_finance_payment_confirmed", label: "Confirmation de paiement", desc: "Lorsque votre paiement (annonce, événement, prestation, etc.) est validé avec succès." });
        financeItems.push({ appKey: "app_finance_payment_received", emailKey: "email_finance_payment_received", label: "Paiement reçu", desc: "Lorsqu'un client paie pour l'une de vos annonces, événements ou prestations." });
        financeItems.push({ appKey: "app_finance_refund_issued", emailKey: "email_finance_refund_issued", label: "Remboursement effectué", desc: "Lorsqu'un remboursement est traité sur votre compte." });
        financeItems.push({ appKey: "app_finance_payment_failed", emailKey: "email_finance_payment_failed", label: "Échec de paiement", desc: "Lorsque votre paiement Stripe (annonce, événement, prestation) échoue ou expire." });
        
        if (isPro) {
            financeItems.push({ appKey: "app_finance_subscription_active", emailKey: "email_finance_subscription_active", label: "Abonnement activé", desc: "Lorsque votre abonnement Pro est validé." });
        }
    }
    
    if (financeItems.length > 0) {
        modules.push({
            key: "finances",
            label: "Finances",
            icon: <CreditCard size={16} />,
            color: "#10b981", // emerald
            items: financeItems,
        });
    }

    const isAdminModerationNotificationsPage = isAdmin && subpage === "roles-permissions";
    const adminModerationModules = [
        {
            key: "admin-moderation",
            label: "Modérations admin",
            icon: <AlertTriangle size={16} />,
            color: "#b45309",
            items: [
                {
                    appKey: "app_moderation",
                    emailKey: "email_moderation",
                    label: "Contenus à modérer",
                    desc: "Alerte lorsqu'une annonce, un événement ou un projet est soumis à modération (notification admin_moderation).",
                },
                {
                    appKey: "app_admin_new_conseil",
                    emailKey: "email_admin_new_conseil",
                    label: "Nouveaux conseils à relire",
                    desc: "Alerte lorsqu'un salarié soumet un conseil pour validation.",
                },
            ],
        },
        {
            key: "admin-forum-reports",
            label: "Signalements forum",
            icon: <MessageSquare size={16} />,
            color: "#0369a1",
            items: [
                {
                    appKey: "app_admin_forum_report",
                    emailKey: "email_admin_forum_report",
                    label: "Signalement forum",
                    desc: "Alerte lorsqu'un utilisateur signale un sujet ou une réponse du forum.",
                },
            ],
        },
    ];

    const displayedModules = isAdminModerationNotificationsPage ? adminModerationModules : modules;
    const pageTitle = isAdminModerationNotificationsPage ? "Notifications" : "Paramètres";
    const pageSubtitle = isAdminModerationNotificationsPage
        ? "Administration"
        : roleLabel;

    return (
        <div style={styles.container}>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">
                        {pageSubtitle}
                    </span>
                    <h1>{pageTitle}</h1>
                </div>
            </div>

            {subpage === "notifications" || isAdminModerationNotificationsPage ? (
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
                            {isAdminModerationNotificationsPage ? "Notifications Admin" : "Préférences par type d'alerte"}
                        </span>
                    </div>

                    {/* Module Accordion */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {displayedModules.map((mod) => {
                            const isCollapsed = collapsedModules[mod.key];
                            const activeCount = mod.items.filter(it => settings[it.appKey] || settings[it.emailKey]).length;
                            return (
                                <div key={mod.key} style={{
                                    border: "1px solid var(--border, #e2e8f0)",
                                    borderRadius: "20px",
                                    overflow: "hidden",
                                    background: "white",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                                }}>
                                    {/* Accordion Header */}
                                    <button
                                        type="button"
                                        onClick={() => toggleModule(mod.key)}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "1rem",
                                            padding: "1rem 1.25rem",
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            textAlign: "left",
                                            borderBottom: isCollapsed ? "none" : `1px solid var(--border, #e2e8f0)`,
                                            transition: "background 0.15s",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                                            <div style={{
                                                width: "30px", height: "30px", borderRadius: "10px",
                                                background: `${mod.color}15`, color: mod.color,
                                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                            }}>
                                                {mod.icon}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-main)" }}>{mod.label}</div>
                                                <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                                                    {activeCount} / {mod.items.length} alertes actives
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronDown
                                            size={18}
                                            color="var(--text-muted)"
                                            style={{ transition: "transform 0.25s ease", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0 }}
                                        />
                                    </button>

                                    {/* Accordion Body */}
                                    {!isCollapsed && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0", padding: "0.75rem" }}>
                                            {mod.items.map((item, idx) => (
                                                <div key={item.appKey} style={{
                                                    ...styles.settingItem,
                                                    borderRadius: idx === 0 && mod.items.length === 1 ? "12px" : idx === 0 ? "12px 12px 4px 4px" : idx === mod.items.length - 1 ? "4px 4px 12px 12px" : "4px",
                                                    marginBottom: idx < mod.items.length - 1 ? "2px" : 0,
                                                    boxShadow: "none",
                                                    border: "1px solid rgba(0,0,0,0.04)",
                                                }}>
                                                    <div style={styles.settingText}>
                                                        <div style={styles.settingLabel}>{item.label}</div>
                                                        <div style={item.desc ? styles.settingDesc : {}}>{item.desc}</div>
                                                    </div>
                                                    <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
                                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                                                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>In-app</span>
                                                            <label style={{ ...styles.switch, opacity: settings.appEnabled ? 1 : 0.4, pointerEvents: settings.appEnabled ? "auto" : "none" }}>
                                                                <input type="checkbox" checked={!!settings[item.appKey]} onChange={(e) => saveSetting(item.appKey, e.target.checked)} style={styles.switchInput} />
                                                                <span style={{ ...styles.slider, backgroundColor: settings[item.appKey] && settings.appEnabled ? "var(--forest-deep)" : "#cbd5e1" }}>
                                                                    <span style={{ ...styles.sliderDot, transform: settings[item.appKey] && settings.appEnabled ? "translateX(18px)" : "translateX(0)" }} />
                                                                </span>
                                                            </label>
                                                        </div>
                                                        {item.emailKey && (
                                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                                                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>E-mail</span>
                                                                <label style={{ ...styles.switch, opacity: settings.emailEnabled ? 1 : 0.4, pointerEvents: settings.emailEnabled ? "auto" : "none" }}>
                                                                    <input type="checkbox" checked={!!settings[item.emailKey]} onChange={(e) => saveSetting(item.emailKey, e.target.checked)} style={styles.switchInput} />
                                                                    <span style={{ ...styles.slider, backgroundColor: settings[item.emailKey] && settings.emailEnabled ? "var(--forest-deep)" : "#cbd5e1" }}>
                                                                        <span style={{ ...styles.sliderDot, transform: settings[item.emailKey] && settings.emailEnabled ? "translateX(18px)" : "translateX(0)" }} />
                                                                    </span>
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                <SystemLogsPanel />
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
