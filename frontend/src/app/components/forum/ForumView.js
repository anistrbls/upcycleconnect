"use client";

import { useState, useEffect } from "react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";
import { formatDateFR } from "../../lib/formatters";
import AdminModal from "../admin/AdminModal";
import { ForumPhotoPicker, ForumPhotosGrid } from "./ForumPhotoAttachments";

/* ── Icônes ─────────────────────────────────────────────────────────────── */
const IcMsg = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);
const IcHeart = ({ filled }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#E0245E" : "none"} stroke={filled ? "#E0245E" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);
const IcFlag = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);
const IcBack = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
);
const IcLock = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const IcEye = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);
const IcTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);
const IcEdit = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const STATUS_BADGE = {
    open:   { bg: "#E5FFBC", color: "#2E7D32", label: "Ouvert" },
    closed: { bg: "#EFF3F4", color: "#71767B", label: "Fermé" },
    hidden: { bg: "#FDE8E8", color: "#B24A4A", label: "Masqué" },
};

function StatusBadge({ status }) {
    const s = STATUS_BADGE[status] || STATUS_BADGE.open;
    return (
        <span className="db-badge" style={{ background: s.bg, color: s.color, flexShrink: 0, fontSize: "0.72rem" }}>
            {status === "closed" ? <IcLock /> : null}
            <span>{s.label}</span>
        </span>
    );
}

function getInitials(name = "") {
    return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}
function getAvatarColor(name = "") {
    const colors = ["#3B5B8A","#A56A2A","#2E7D6E","#B24A4A","#6A5AA6","#2F7D93","#8F4B78","#356F73"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
    return colors[h];
}

/* ── Avatar inline ──────────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }) {
    const bg = getAvatarColor(name);
    return (
        <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
            {getInitials(name)}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   VUE LISTE DES SUJETS
   ══════════════════════════════════════════════════════════════════════════ */
function ForumTopicList({ topics, loading, onSelect, onNew, role }) {
    return (
        <>
            <style>{`
                @keyframes cardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .forum-row { background:#fff; border:1px solid #EFF3F4; border-radius:16px; padding:1rem 1.25rem; display:flex; align-items:center; gap:1rem; cursor:pointer; transition:box-shadow 0.18s; animation:cardIn 0.22s ease both; }
                .forum-row:hover { box-shadow:0 4px 18px rgba(0,0,0,0.09); }
            `}</style>

            <div className="header-section" style={{ marginBottom: "1.5rem" }}>
                <div className="title-area" style={{ flex: 1 }}>
                    <span className="activities-label">Communauté</span>
                    <h1>Forum</h1>
                </div>
                {role !== "salarie" && (
                    <button className="action-cta task-action-btn" onClick={onNew} style={{ alignSelf: "flex-end", marginBottom: "0.5rem" }}>
                        + Nouveau sujet
                    </button>
                )}
            </div>

            {loading && [1,2,3].map(k => (
                <div key={k} style={{ background: "#F7F9F9", borderRadius: "16px", height: "72px", marginBottom: "0.65rem", opacity: 0.5 }} />
            ))}

            {!loading && topics.length === 0 && (
                <div className="panel" style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
                    <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.35rem" }}>Aucun sujet pour le moment</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Soyez le premier à lancer une discussion !</p>
                </div>
            )}

            <div style={{ display: "grid", gap: "0.65rem" }}>
                {topics.map((t, idx) => (
                    <div key={t.id} className="forum-row" style={{ animationDelay: `${idx * 0.03}s` }} onClick={() => onSelect(t)}>
                        <Avatar name={t.authorName} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.15rem" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F1419", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-i18n-user-content="true">{t.title}</span>
                                <StatusBadge status={t.status} />
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#71767B", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                <span data-i18n-user-content="true">{t.authorName}</span>
                                <span>·</span>
                                <span>{formatDateFR(t.createdAt)}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#71767B", fontSize: "0.8rem", flexShrink: 0 }}>
                            <IcMsg /> <span>{t.replyCount}</span>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   VUE DÉTAIL D'UN SUJET
   ══════════════════════════════════════════════════════════════════════════ */
function ForumTopicDetail({ topicId, role, callerUserId, onBack, onTopicStatusChange }) {
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [replyContent, setReplyContent] = useState("");
    const [replyPhotos, setReplyPhotos] = useState([]);
    const [sending, setSending] = useState(false);
    const [editReplyId, setEditReplyId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [reportOpen, setReportOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState(null); // { type: 'topic'|'reply', id }
    const [reportReason, setReportReason] = useState("");
    const [editTopicOpen, setEditTopicOpen] = useState(false);
    const [editTopicForm, setEditTopicForm] = useState({ title: "", content: "" });

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/forum/topics/${topicId}`), { headers: buildAuthHeaders() });
            const data = await res.json();
            setTopic(data);
        } catch {
            setError("Impossible de charger le sujet.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [topicId]);

    const handleSendReply = async () => {
        if (!replyContent.trim() && replyPhotos.length === 0) return;
        setSending(true);
        try {
            const res = await fetch(apiUrl("/forum/replies"), {
                method: "POST",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ topicId, content: replyContent, photos: replyPhotos }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            setReplyContent("");
            setReplyPhotos([]);
            load();
        } catch (e) { setError(String(e.message)); }
        finally { setSending(false); }
    };

    const handleLike = async (replyId, liked) => {
        const method = liked ? "DELETE" : "POST";
        await fetch(apiUrl(`/forum/replies/${replyId}/like`), { method, headers: buildAuthHeaders() });
        setTopic(prev => ({
            ...prev,
            replies: prev.replies.map(r => r.id === replyId
                ? { ...r, likedByMe: !liked, likeCount: r.likeCount + (liked ? -1 : 1) }
                : r),
        }));
    };

    const handleDeleteReply = async (replyId) => {
        if (!confirm("Supprimer ce message ?")) return;
        await fetch(apiUrl(`/forum/replies/${replyId}`), { method: "DELETE", headers: buildAuthHeaders() });
        load();
    };

    const handleEditReply = async (replyId) => {
        await fetch(apiUrl(`/forum/replies/${replyId}`), {
            method: "PUT",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ content: editContent }),
        });
        setEditReplyId(null);
        load();
    };

    const handleHideReply = async (replyId, currentStatus) => {
        const newStatus = currentStatus === "hidden" ? "visible" : "hidden";
        await fetch(apiUrl(`/forum/replies/${replyId}`), {
            method: "PATCH",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        });
        load();
    };

    const handleReport = async () => {
        if (!reportTarget) return;
        const body = reportTarget.type === "reply"
            ? { replyId: reportTarget.id, reason: reportReason }
            : { topicId: reportTarget.id, reason: reportReason };
        await fetch(apiUrl("/forum/reports"), {
            method: "POST",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        setReportOpen(false);
        setReportReason("");
    };

    const handleTopicStatus = async (newStatus) => {
        await fetch(apiUrl(`/forum/topics/${topicId}`), {
            method: "PATCH",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        });
        if (onTopicStatusChange) onTopicStatusChange();
        load();
    };

    const handleEditTopic = async () => {
        await fetch(apiUrl(`/forum/topics/${topicId}`), {
            method: "PUT",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(editTopicForm),
        });
        setEditTopicOpen(false);
        load();
    };

    const handleDeleteTopic = async () => {
        if (!confirm("Supprimer ce sujet et toutes ses réponses ?")) return;
        await fetch(apiUrl(`/forum/topics/${topicId}`), { method: "DELETE", headers: buildAuthHeaders() });
        onBack();
    };

    const canModerate = role === "admin" || role === "salarie";

    if (loading) return <div style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-muted)" }}>Chargement…</div>;
    if (error) return <div style={{ color: "#a23b3b", padding: "1rem" }}>{error}</div>;
    if (!topic) return null;

    return (
        <>
            <style>{`
                .reply-card { background:#fff; border:1px solid #EFF3F4; border-radius:16px; padding:1rem 1.25rem 0.75rem; margin-bottom:0.65rem; }
                .reply-card.hidden-card { background:#FAFAFA; border-color:#e0e0e0; opacity:0.7; }
                .reply-card.reported-card { background:#FFFBF0; border-color:#f3d9a0; }
            `}</style>

            {/* Header */}
            <div className="header-section" style={{ marginBottom: "1.5rem" }}>
                <button className="back-btn" onClick={onBack} title="Retour"><IcBack /></button>
                <div className="title-area" style={{ flex: 1, minWidth: 0 }}>
                    <span className="activities-label">Forum</span>
                    <h1 style={{ fontSize: "1.6rem", overflow: "hidden", textOverflow: "ellipsis" }} data-i18n-user-content="true">{topic.title}</h1>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-end", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                    <StatusBadge status={topic.status} />
                    {canModerate && (
                        <>
                            {topic.status !== "closed" && (
                                <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", background: "#EFF3F4", color: "#0F1419" }} onClick={() => handleTopicStatus("closed")}>
                                    <IcLock /> Fermer
                                </button>
                            )}
                            {topic.status === "closed" && (
                                <button className="action-cta task-action-btn" style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem" }} onClick={() => handleTopicStatus("open")}>
                                    Rouvrir
                                </button>
                            )}
                            {topic.status !== "hidden" && (
                                <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", background: "#FDE8E8", color: "#B24A4A" }} onClick={() => handleTopicStatus("hidden")}>
                                    <IcEye /> Masquer
                                </button>
                            )}
                            {topic.status === "hidden" && (
                                <button className="action-cta task-action-btn" style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem" }} onClick={() => handleTopicStatus("open")}>
                                    Afficher
                                </button>
                            )}
                        </>
                    )}
                    {(topic.isOwn || role === "admin") && (
                        <>
                            <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", background: "#EFF3F4", color: "#0F1419" }}
                                onClick={() => { setEditTopicForm({ title: topic.title, content: topic.content }); setEditTopicOpen(true); }}>
                                <IcEdit /> Modifier
                            </button>
                            <button className="action-cta" style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", background: "#FDE8E8", color: "#B24A4A" }} onClick={handleDeleteTopic}>
                                <IcTrash /> Supprimer
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Message initial */}
            <div className="panel" style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                    <Avatar name={topic.authorName} size={40} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.93rem" }} data-i18n-user-content="true">{topic.authorName}</span>
                            <span style={{ color: "#71767B", fontSize: "0.8rem" }}>· {formatDateFR(topic.createdAt)}</span>
                            {!topic.isOwn && (
                                <button
                                    type="button"
                                    className="conseil-card-action-btn conseil-card-action-btn--spacer"
                                    title="Signaler"
                                    onClick={() => { setReportTarget({ type: "topic", id: topic.id }); setReportOpen(true); }}
                                >
                                    <IcFlag />
                                </button>
                            )}
                        </div>
                        {topic.content ? (
                            <p style={{ fontSize: "0.93rem", lineHeight: 1.7, color: "#0F1419", whiteSpace: "pre-wrap", margin: 0 }} data-i18n-user-content="true">{topic.content}</p>
                        ) : null}
                        <ForumPhotosGrid photos={topic.photos} />
                    </div>
                </div>
            </div>

            {/* Réponses */}
            <div style={{ marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {topic.replies?.length || 0} réponse{topic.replies?.length !== 1 ? "s" : ""}
                </span>
            </div>

            {topic.replies?.map((r) => (
                <div key={r.id} className={`reply-card${r.status === "hidden" ? " hidden-card" : r.status === "reported" ? " reported-card" : ""}`}>
                    {r.status === "hidden" && (
                        <div style={{ fontSize: "0.75rem", color: "#71767B", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <IcEye /> Message masqué
                        </div>
                    )}
                    {r.status === "reported" && canModerate && (
                        <div style={{ fontSize: "0.75rem", color: "#A56A2A", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <IcFlag /> Message signalé
                        </div>
                    )}
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                        <Avatar name={r.authorName} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.88rem" }} data-i18n-user-content="true">{r.authorName}</span>
                                <span style={{ color: "#71767B", fontSize: "0.78rem" }}>· {formatDateFR(r.createdAt)}</span>
                            </div>
                            {editReplyId === r.id ? (
                                <div>
                                    <textarea
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                        rows={3}
                                        style={{ width: "100%", borderRadius: "10px", border: "1px solid #e0e0e0", padding: "0.6rem", fontSize: "0.9rem", fontFamily: "inherit", resize: "vertical" }}
                                    />
                                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                                        <button className="action-cta task-action-btn" style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }} onClick={() => handleEditReply(r.id)}>Sauvegarder</button>
                                        <button className="action-cta" style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }} onClick={() => setEditReplyId(null)}>Annuler</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {r.content ? (
                                        <p style={{ fontSize: "0.9rem", lineHeight: 1.65, color: "#0F1419", whiteSpace: "pre-wrap", margin: 0 }} data-i18n-user-content="true">{r.content}</p>
                                    ) : null}
                                    <ForumPhotosGrid photos={r.photos} />
                                </>
                            )}
                        </div>
                    </div>
                    {/* Actions réponse */}
                    <div className="conseil-card-actions">
                        <button
                            type="button"
                            className={`conseil-card-action-btn conseil-card-action-btn--like${r.likedByMe ? " conseil-card-action-btn--like-active" : ""}`}
                            title={r.likedByMe ? "Je n'aime plus" : "J'aime"}
                            onClick={() => handleLike(r.id, r.likedByMe)}
                        >
                            <IcHeart filled={r.likedByMe} />
                            {r.likeCount > 0 ? <span>{r.likeCount}</span> : null}
                        </button>
                        {!r.isOwn && (
                            <button
                                type="button"
                                className="conseil-card-action-btn"
                                title="Signaler"
                                onClick={() => { setReportTarget({ type: "reply", id: r.id }); setReportOpen(true); }}
                            >
                                <IcFlag />
                            </button>
                        )}
                        {r.isOwn && editReplyId !== r.id && (
                            <button
                                type="button"
                                className="conseil-card-action-btn"
                                title="Modifier"
                                onClick={() => { setEditReplyId(r.id); setEditContent(r.content); }}
                            >
                                <IcEdit />
                            </button>
                        )}
                        {(r.isOwn || canModerate) && (
                            <button
                                type="button"
                                className="conseil-card-action-btn conseil-card-action-btn--delete conseil-card-action-btn--spacer"
                                title="Supprimer"
                                onClick={() => handleDeleteReply(r.id)}
                            >
                                <IcTrash />
                            </button>
                        )}
                        {canModerate && (
                            <button
                                type="button"
                                className={`conseil-card-action-btn${r.status === "hidden" ? " conseil-card-action-btn--moderate-active" : ""}`}
                                title={r.status === "hidden" ? "Afficher" : "Masquer"}
                                onClick={() => handleHideReply(r.id, r.status)}
                            >
                                <IcEye />
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {/* Formulaire de réponse */}
            {topic.status === "open" && (
                <div className="panel" style={{ marginTop: "1.25rem" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.75rem" }}>Répondre</p>
                    <textarea
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                        placeholder="Votre réponse…"
                        rows={4}
                        style={{ width: "100%", borderRadius: "12px", border: "1px solid #e0e0e0", padding: "0.75rem", fontSize: "0.9rem", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                    />
                    <ForumPhotoPicker photos={replyPhotos} onChange={setReplyPhotos} disabled={sending} />
                    {error && <p style={{ color: "#a23b3b", fontSize: "0.83rem", margin: "0.4rem 0 0" }}>{error}</p>}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.65rem" }}>
                        <button className="action-cta task-action-btn" onClick={handleSendReply} disabled={sending || (!replyContent.trim() && replyPhotos.length === 0)}>
                            {sending ? "Envoi…" : "Répondre"}
                        </button>
                    </div>
                </div>
            )}
            {topic.status === "closed" && (
                <div className="panel" style={{ marginTop: "1rem", textAlign: "center", background: "#F7F9F9" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}><IcLock /> Ce sujet est fermé aux nouvelles réponses.</p>
                </div>
            )}

            {/* Modal signalement */}
            <AdminModal open={reportOpen} title="Signaler un contenu" onClose={() => setReportOpen(false)}>
                <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>Pourquoi signalez-vous ce contenu ?</p>
                <textarea
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="Raison (optionnel)…"
                    rows={3}
                    style={{ width: "100%", borderRadius: "10px", border: "1px solid #e0e0e0", padding: "0.65rem", fontSize: "0.9rem", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <button className="action-cta" onClick={() => setReportOpen(false)}>Annuler</button>
                    <button className="action-cta" style={{ background: "#FDE8E8", color: "#B24A4A" }} onClick={handleReport}>Signaler</button>
                </div>
            </AdminModal>

            {/* Modal édition sujet */}
            <AdminModal open={editTopicOpen} title="Modifier le sujet" onClose={() => setEditTopicOpen(false)}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>Titre</label>
                <input
                    value={editTopicForm.title}
                    onChange={e => setEditTopicForm(p => ({ ...p, title: e.target.value }))}
                    style={{ width: "100%", borderRadius: "10px", border: "1px solid #e0e0e0", padding: "0.6rem 0.8rem", fontSize: "0.9rem", fontFamily: "inherit", marginBottom: "0.75rem", boxSizing: "border-box" }}
                />
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>Contenu</label>
                <textarea
                    value={editTopicForm.content}
                    onChange={e => setEditTopicForm(p => ({ ...p, content: e.target.value }))}
                    rows={5}
                    style={{ width: "100%", borderRadius: "10px", border: "1px solid #e0e0e0", padding: "0.6rem 0.8rem", fontSize: "0.9rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <button className="action-cta" onClick={() => setEditTopicOpen(false)}>Annuler</button>
                    <button className="action-cta task-action-btn" onClick={handleEditTopic}>Sauvegarder</button>
                </div>
            </AdminModal>
        </>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export default function ForumView({ role = "particulier", callerUserId }) {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [newTopicOpen, setNewTopicOpen] = useState(false);
    const [newForm, setNewForm] = useState({ title: "", content: "" });
    const [newTopicPhotos, setNewTopicPhotos] = useState([]);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const loadTopics = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl("/forum/topics"), { headers: buildAuthHeaders() });
            const data = await res.json();
            setTopics(data.items || []);
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTopics(); }, []);

    const handleCreate = async () => {
        if (!newForm.title.trim()) { setCreateError("Le titre est requis."); return; }
        setCreating(true);
        setCreateError("");
        try {
            const res = await fetch(apiUrl("/forum/topics"), {
                method: "POST",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ ...newForm, photos: newTopicPhotos }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            const topic = await res.json();
            setNewTopicOpen(false);
            setNewForm({ title: "", content: "" });
            setNewTopicPhotos([]);
            setSelectedTopicId(topic.id);
            loadTopics();
        } catch (e) { setCreateError(String(e.message)); }
        finally { setCreating(false); }
    };

    if (selectedTopicId) {
        return (
            <ForumTopicDetail
                topicId={selectedTopicId}
                role={role}
                callerUserId={callerUserId}
                onBack={() => { setSelectedTopicId(null); loadTopics(); }}
                onTopicStatusChange={loadTopics}
            />
        );
    }

    return (
        <>
            <ForumTopicList
                topics={topics}
                loading={loading}
                role={role}
                onSelect={t => setSelectedTopicId(t.id)}
                onNew={() => setNewTopicOpen(true)}
            />

            <AdminModal open={newTopicOpen} title="Nouveau sujet" onClose={() => { setNewTopicOpen(false); setNewTopicPhotos([]); }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>Titre *</label>
                <input
                    value={newForm.title}
                    onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Titre de votre sujet…"
                    style={{ width: "100%", borderRadius: "10px", border: "1px solid #e0e0e0", padding: "0.6rem 0.8rem", fontSize: "0.9rem", fontFamily: "inherit", marginBottom: "0.75rem", boxSizing: "border-box" }}
                    autoFocus
                />
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>Message</label>
                <textarea
                    value={newForm.content}
                    onChange={e => setNewForm(p => ({ ...p, content: e.target.value }))}
                    placeholder="Décrivez votre sujet…"
                    rows={5}
                    style={{ width: "100%", borderRadius: "10px", border: "1px solid #e0e0e0", padding: "0.6rem 0.8rem", fontSize: "0.9rem", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />
                <ForumPhotoPicker photos={newTopicPhotos} onChange={setNewTopicPhotos} disabled={creating} />
                {createError && <p style={{ color: "#a23b3b", fontSize: "0.83rem", margin: "0.4rem 0 0" }}>{createError}</p>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <button className="action-cta" onClick={() => setNewTopicOpen(false)}>Annuler</button>
                    <button className="action-cta task-action-btn" onClick={handleCreate} disabled={creating}>
                        {creating ? "Création…" : "Publier le sujet"}
                    </button>
                </div>
            </AdminModal>
        </>
    );
}
