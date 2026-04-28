"use client";

import { useState, useEffect } from "react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";
import { formatDateFR } from "../../lib/formatters";

/* ── Icônes ─────────────────────────────────────────────────────────────── */
const IcFlag = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);
const IcEye = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);
const IcTrash = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);
const IcLock = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const IcCheck = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const IcX = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const STATUS_COLORS = {
    pending:  { bg: "#FFF3CD", color: "#856404", label: "En attente" },
    resolved: { bg: "#E5FFBC", color: "#2E7D32", label: "Résolu" },
    ignored:  { bg: "#EFF3F4", color: "#71767B", label: "Ignoré" },
};

function StatusBadge({ status }) {
    const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
    return (
        <span className="db-badge" style={{ background: s.bg, color: s.color, fontSize: "0.72rem" }}>{s.label}</span>
    );
}

const TABS = [
    { key: "pending",  label: "En attente" },
    { key: "resolved", label: "Résolus" },
    { key: "ignored",  label: "Ignorés" },
];

export default function ForumModerationView() {
    const [tab, setTab] = useState("pending");
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadReports = async (status) => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/forum/reports?status=${status}`), { headers: buildAuthHeaders() });
            const data = await res.json();
            setReports(data.items || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    useEffect(() => { loadReports(tab); }, [tab]);

    const patchReport = async (reportId, status) => {
        await fetch(apiUrl(`/forum/reports/${reportId}`), {
            method: "PATCH",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        loadReports(tab);
    };

    const patchReply = async (replyId, status) => {
        await fetch(apiUrl(`/forum/replies/${replyId}`), {
            method: "PATCH",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        loadReports(tab);
    };

    const deleteReply = async (replyId) => {
        if (!confirm("Supprimer ce message ?")) return;
        await fetch(apiUrl(`/forum/replies/${replyId}`), { method: "DELETE", headers: buildAuthHeaders() });
        loadReports(tab);
    };

    const closeTopic = async (topicId) => {
        await fetch(apiUrl(`/forum/topics/${topicId}`), {
            method: "PATCH",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status: "closed" }),
        });
        loadReports(tab);
    };

    return (
        <>
            <style>{`
                .mod-card { background:#fff; border:1px solid #EFF3F4; border-radius:16px; padding:1.1rem 1.25rem; margin-bottom:0.7rem; animation: cardIn 0.22s ease both; }
                @keyframes cardIn { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
                .mod-card-content { background:#FAFAFA; border:1px solid #e8e8e8; border-radius:10px; padding:0.65rem 0.85rem; margin:0.6rem 0; font-size:0.88rem; color:#0F1419; line-height:1.6; white-space:pre-wrap; }
                .mod-tab { background:none; border:none; cursor:pointer; padding:0.45rem 1rem; border-radius:20px; font-size:0.85rem; font-weight:500; transition:background 0.15s; }
                .mod-tab.active { background:#0F1419; color:#fff; font-weight:600; }
                .mod-tab:not(.active) { color:#71767B; }
                .mod-tab:not(.active):hover { background:#EFF3F4; }
                .mod-action { display:flex; align-items:center; gap:0.3rem; padding:0.3rem 0.7rem; border-radius:8px; border:1px solid transparent; cursor:pointer; font-size:0.78rem; font-weight:500; transition:all 0.15s; }
            `}</style>

            <div className="header-section" style={{ marginBottom: "1.5rem" }}>
                <div className="title-area">
                    <span className="activities-label">Forum</span>
                    <h1>Modération</h1>
                </div>
            </div>

            {/* Onglets */}
            <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.25rem", background: "#EFF3F4", padding: "0.3rem", borderRadius: "24px", width: "fit-content" }}>
                {TABS.map(t => (
                    <button key={t.key} className={`mod-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && [1,2].map(k => (
                <div key={k} style={{ background: "#F7F9F9", borderRadius: "16px", height: "110px", marginBottom: "0.7rem", opacity: 0.5 }} />
            ))}

            {!loading && reports.length === 0 && (
                <div className="panel" style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
                    <p style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: "0.3rem" }}>
                        {tab === "pending" ? "Aucun signalement en attente" : "Aucun signalement ici"}
                    </p>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                        {tab === "pending" ? "La communauté est tranquille !" : ""}
                    </p>
                </div>
            )}

            {reports.map((rep, idx) => (
                <div key={rep.id} className="mod-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                    {/* En-tête */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                        <IcFlag />
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Signalement #{rep.id}</span>
                        <StatusBadge status={rep.status} />
                        <span style={{ fontSize: "0.78rem", color: "#71767B", marginLeft: "auto" }}>{formatDateFR(rep.createdAt)}</span>
                    </div>

                    {/* Meta signaleur */}
                    <div style={{ fontSize: "0.8rem", color: "#71767B", display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                        <span>Signalé par <strong style={{ color: "#0F1419" }}>{rep.reporterName}</strong></span>
                        {rep.reason && <span>· Raison : <em>{rep.reason}</em></span>}
                    </div>

                    {/* Contenu signalé */}
                    {rep.content && (
                        <>
                            {rep.authorName && (
                                <div style={{ fontSize: "0.78rem", color: "#71767B", marginBottom: "0.15rem" }}>
                                    {rep.replyId ? "Message de" : "Sujet de"} <strong style={{ color: "#0F1419" }}>{rep.authorName}</strong>
                                </div>
                            )}
                            <div className="mod-card-content">{rep.content}</div>
                        </>
                    )}

                    {/* Actions (seulement si pending) */}
                    {rep.status === "pending" && (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid #EFF3F4" }}>
                            {rep.replyId && (
                                <>
                                    <button className="mod-action" style={{ background: "#FDE8E8", borderColor: "#f3c4c4", color: "#B24A4A" }}
                                        onClick={() => patchReply(rep.replyId, "hidden")}>
                                        <IcEye /> Masquer le message
                                    </button>
                                    <button className="mod-action" style={{ background: "#FDE8E8", borderColor: "#f3c4c4", color: "#B24A4A" }}
                                        onClick={() => deleteReply(rep.replyId)}>
                                        <IcTrash /> Supprimer le message
                                    </button>
                                </>
                            )}
                            {rep.topicId && (
                                <button className="mod-action" style={{ background: "#EFF3F4", borderColor: "#e0e0e0", color: "#0F1419" }}
                                    onClick={() => closeTopic(rep.topicId)}>
                                    <IcLock /> Fermer le sujet
                                </button>
                            )}
                            <button className="mod-action" style={{ background: "#E5FFBC", borderColor: "#c8e6a0", color: "#2E7D32", marginLeft: "auto" }}
                                onClick={() => patchReport(rep.id, "resolved")}>
                                <IcCheck /> Marquer résolu
                            </button>
                            <button className="mod-action" style={{ background: "#EFF3F4", borderColor: "#e0e0e0", color: "#71767B" }}
                                onClick={() => patchReport(rep.id, "ignored")}>
                                <IcX /> Ignorer
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </>
    );
}
