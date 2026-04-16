"use client";

import { useState, useEffect } from "react";
import { fieldStyle, labelStyle } from "../../lib/styles";
import { formatDateFR } from "../../lib/formatters";

const AVATAR_PALETTE = ["#B5D5E0", "#C8E6C9", "#FFE0B2", "#E1BEE7", "#F8BBD9", "#B2DFDB", "#D7E3F5", "#F0E68C"];

function getInitials(name) {
    return (name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("");
}

function getAvatarColor(name) {
    const idx = [...(name || "?")].reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[idx];
}

function Toast({ message, onDone }) {
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(onDone, 3500);
        return () => clearTimeout(t);
    }, [message, onDone]);

    if (!message) return null;
    return (
        <div style={{
            position: "fixed",
            bottom: "5.5rem",
            right: "2rem",
            background: "#2E7D32",
            color: "#fff",
            padding: "0.75rem 1.25rem",
            borderRadius: "12px",
            fontSize: "0.87rem",
            fontWeight: 500,
            boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
            zIndex: 300,
            pointerEvents: "none",
            animation: "fadeInSlide 0.3s ease",
        }}>
            {message}
        </div>
    );
}

export default function SalarieConseilFeedView({
    feedItems = [],
    ownItems = [],
    loading,
    errorMessage,
    onCreate,
    onUpdate,
    onDelete,
}) {
    const [composerOpen, setComposerOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");
    const [formState, setFormState] = useState({ title: "", body: "" });
    const [confirmClose, setConfirmClose] = useState(false);
    const [toast, setToast] = useState("");
    const [expandedIds, setExpandedIds] = useState(new Set());

    const drafts = ownItems.filter((i) => i.type === "conseil" && i.status === "brouillon");
    const pendingItems = ownItems.filter((i) => i.type === "conseil" && i.status === "en_attente");

    const hasContent = formState.title.trim() !== "" || formState.body.trim() !== "";

    const showToast = (msg) => setToast(msg);

    const resetForm = () => {
        setEditingItem(null);
        setFormState({ title: "", body: "" });
        setLocalError("");
        setConfirmClose(false);
    };

    const openComposer = () => {
        resetForm();
        setComposerOpen(true);
    };

    const openDraftForEdit = (item) => {
        setEditingItem(item);
        setFormState({ title: item.title || "", body: item.body || "" });
        setLocalError("");
        setConfirmClose(false);
    };

    // Gestion du × : si contenu non sauvegardé → confirmation
    const handleCloseAttempt = () => {
        if (!editingItem && hasContent) {
            setConfirmClose(true);
        } else {
            setComposerOpen(false);
            resetForm();
        }
    };

    const handleSaveDraftAndClose = async () => {
        setIsSaving(true);
        try {
            const body = formState.body.trim();
            await onCreate({
                title: formState.title.trim() || (body.slice(0, 60) || "Brouillon"),
                body,
                status: "brouillon",
                type: "conseil",
            });
            setComposerOpen(false);
            resetForm();
            showToast("Conseil enregistré en brouillon ✓");
        } catch (err) {
            setLocalError(String(err?.message || "Impossible d'enregistrer."));
            setConfirmClose(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscardAndClose = () => {
        setComposerOpen(false);
        resetForm();
    };

    const handleSubmit = async (status) => {
        setLocalError("");
        if (!formState.body.trim()) { setLocalError("Le contenu est requis."); return; }
        setIsSaving(true);
        try {
            const body = formState.body.trim();
            const payload = {
                title: formState.title.trim() || (body.slice(0, 60) || "Conseil"),
                body,
                status,
                type: "conseil",
            };
            if (editingItem) {
                await onUpdate(editingItem.id, payload);
            } else {
                await onCreate(payload);
            }
            setComposerOpen(false);
            resetForm();
            if (status === "brouillon") showToast("Conseil enregistré en brouillon ✓");
        } catch (err) {
            setLocalError(String(err?.message || "Une erreur est survenue."));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm("Supprimer ce conseil ?")) return;
        try { await onDelete(item.id); } catch (err) { window.alert(String(err?.message || "Impossible de supprimer.")); }
    };

    const toggleExpand = (id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    return (
        <>
            <style>{`
                @keyframes fadeInSlide {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .conseil-card {
                    background: #fff;
                    border: 1px solid #E4ECEE;
                    border-radius: 18px;
                    padding: 1.25rem 1.4rem 1rem;
                    box-shadow: 0 2px 12px rgba(62,104,108,0.07);
                    transition: box-shadow 0.2s, transform 0.2s;
                    animation: cardIn 0.25s ease both;
                }
                .conseil-card:hover {
                    box-shadow: 0 6px 24px rgba(62,104,108,0.13);
                    transform: translateY(-2px);
                }
                .conseil-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: #333;
                    flex-shrink: 0;
                    user-select: none;
                    letter-spacing: 0.02em;
                }
                .conseil-body-text {
                    font-size: 0.925rem;
                    line-height: 1.7;
                    color: #233B3D;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .conseil-see-more {
                    font-size: 0.8rem;
                    color: #4F6163;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.15rem 0;
                    font-family: inherit;
                    font-weight: 500;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.2rem;
                    margin-top: 0.2rem;
                }
                .conseil-see-more:hover { text-decoration: underline; }
                .conseil-own-actions {
                    display: flex;
                    gap: 0.4rem;
                    margin-top: 0.6rem;
                    padding-top: 0.65rem;
                    border-top: 1px solid #EEF3F4;
                }
                .conseil-action-btn {
                    font-size: 0.76rem;
                    padding: 0.3rem 0.75rem;
                    border-radius: 999px;
                    border: 1px solid #D8E5E7;
                    background: #F4F8F9;
                    color: #4F6163;
                    cursor: pointer;
                    font-family: inherit;
                    font-weight: 500;
                    transition: background 0.15s, color 0.15s;
                }
                .conseil-action-btn:hover { background: #E4ECEE; color: #233B3D; }
                .conseil-action-btn.danger { border-color: #F5C6C6; background: #FEF2F2; color: #9B2C2C; }
                .conseil-action-btn.danger:hover { background: #FDE8E8; }
                .pending-banner {
                    background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E6 100%);
                    border: 1px solid #F5DCA0;
                    border-left: 4px solid #F5A623;
                    border-radius: 14px;
                    padding: 0.85rem 1.1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .feed-divider {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin: 1.5rem 0 1rem;
                    color: #8AABAE;
                    font-size: 0.72rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                }
                .feed-divider::before, .feed-divider::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: #E4ECEE;
                }
            `}</style>

            <Toast message={toast} onDone={() => setToast("")} />

            {/* Header */}
            <div className="header-section" style={{ marginBottom: "1.75rem" }}>
                <div className="title-area">
                    <span className="activities-label">Espace salarié</span>
                    <h1>Conseils</h1>
                </div>
            </div>

            {errorMessage && (
                <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "1rem" }}>{errorMessage}</p>
            )}

            {/* En attente de validation */}
            {pendingItems.length > 0 && (
                <div style={{ marginBottom: "1.5rem", display: "grid", gap: "0.5rem" }}>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                        En attente de validation
                    </p>
                    {pendingItems.map((item) => (
                        <div key={item.id} className="pending-banner">

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: "0.87rem", color: "#7A4F0C", marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                                <p style={{ fontSize: "0.78rem", color: "#A3742A", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Fil des conseils publiés */}
            {!loading && feedItems.length > 0 && (
                <div className="feed-divider">Conseils publiés</div>
            )}

            <div style={{ display: "grid", gap: "1rem" }}>
                {loading && (
                    <div style={{ display: "flex", gap: "0.75rem", flexDirection: "column" }}>
                        {[1, 2, 3].map((k) => (
                            <div key={k} style={{ background: "#F4F8F9", borderRadius: "18px", height: "110px", animation: "pulse 1.4s ease infinite", opacity: 0.6 }} />
                        ))}
                    </div>
                )}
                {!loading && feedItems.length === 0 && (
                    <div style={{ textAlign: "center", padding: "3.5rem 1rem" }}>

                        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.35rem" }}>Aucun conseil partagé pour l'instant</p>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Soyez le premier à partager votre expertise avec l'équipe !</p>
                        <button
                            type="button"
                            className="action-cta task-action-btn"
                            style={{ marginTop: "1.25rem", fontSize: "0.88rem" }}
                            onClick={openComposer}
                        >
                            Partager un conseil
                        </button>
                    </div>
                )}
                {!loading && feedItems.map((item, idx) => {
                    const isExpanded = expandedIds.has(item.id);
                    const initials = getInitials(item.authorName);
                    const avatarBg = getAvatarColor(item.authorName);
                    const needsTruncation = (item.body || "").length > 280;
                    return (
                        <div key={item.id} className="conseil-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                            {/* En-tête */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                                <div className="conseil-avatar" style={{ background: avatarBg }}>
                                    {initials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 600, fontSize: "0.92rem", color: "#182B2D", lineHeight: 1.2 }}>
                                        {item.authorName}
                                    </p>
                                    <p style={{ fontSize: "0.75rem", color: "#8AABAE", marginTop: "0.1rem" }}>
                                        {formatDateFR(item.createdAt)}
                                    </p>
                                </div>
                                {/* Badge décoratif */}

                            </div>

                            {/* Titre */}
                            {item.title && (
                                <p style={{ fontWeight: 700, fontSize: "0.97rem", color: "#182B2D", marginBottom: "0.5rem", lineHeight: 1.35 }}>
                                    {item.title}
                                </p>
                            )}

                            {/* Corps */}
                            <p
                                className="conseil-body-text"
                                style={needsTruncation && !isExpanded
                                    ? { display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }
                                    : {}}
                            >
                                {item.body}
                            </p>

                            {needsTruncation && (
                                <button className="conseil-see-more" type="button" onClick={() => toggleExpand(item.id)}>
                                    {isExpanded ? "Voir moins" : "Lire la suite"}
                                </button>
                            )}

                            {/* Actions propres */}
                            {item.isOwn && (
                                <div className="conseil-own-actions">
                                    <button
                                        className="conseil-action-btn"
                                        type="button"
                                        onClick={() => { openDraftForEdit({ ...item, status: "publie" }); setComposerOpen(true); }}
                                    >
                                        Modifier
                                    </button>
                                    <button
                                        className="conseil-action-btn danger"
                                        type="button"
                                        onClick={() => handleDelete(item)}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Composer */}
            {composerOpen && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
                    onClick={(e) => { if (e.target === e.currentTarget) handleCloseAttempt(); }}
                >
                    <div style={{ background: "#fff", borderRadius: "20px", width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem", position: "relative", display: "grid", gap: "1.25rem" }}>

                        {/* Bouton × */}
                        <button
                            type="button"
                            onClick={handleCloseAttempt}
                            style={{ position: "absolute", top: "1.1rem", right: "1.1rem", width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "#f0f0f0", color: "#555", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                            aria-label="Fermer"
                        >
                            ×
                        </button>

                        {/* Contenu selon l'état */}
                        {confirmClose ? (
                            /* Écran de confirmation fermeture */
                            <div style={{ display: "grid", gap: "1rem", paddingTop: "0.5rem" }}>
                                <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>Tu as commencé à écrire quelque chose.</p>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>Souhaites-tu enregistrer ce conseil en brouillon avant de fermer ?</p>
                                {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                                <div style={{ display: "grid", gap: "0.5rem" }}>
                                    <button className="action-cta task-action-btn" type="button" disabled={isSaving} onClick={handleSaveDraftAndClose} style={{ justifyContent: "center" }}>
                                        {isSaving ? "Enregistrement…" : "Enregistrer en brouillon"}
                                    </button>
                                    <button className="action-cta" type="button" onClick={handleDiscardAndClose} style={{ background: "#FDE8E8", color: "#a23b3b", justifyContent: "center" }}>
                                        Fermer sans enregistrer
                                    </button>
                                    <button className="action-cta" type="button" onClick={() => setConfirmClose(false)} style={{ background: "#e8ecee", color: "var(--text-main)", justifyContent: "center" }}>
                                        Continuer d'écrire
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, paddingRight: "2rem", margin: 0 }}>
                                    {editingItem ? "Modifier le conseil" : "Partager un conseil"}
                                </h2>

                                {/* Section brouillons — uniquement en mode création */}
                                {!editingItem && drafts.length > 0 && (
                                    <div>
                                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                                            Brouillons ({drafts.length})
                                        </p>
                                        <div style={{ display: "grid", gap: "0.35rem" }}>
                                            {drafts.map((d) => (
                                                <button
                                                    key={d.id}
                                                    type="button"
                                                    onClick={() => openDraftForEdit(d)}
                                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "0.6rem 0.85rem", borderRadius: "12px", background: "#F5F8F9", border: "1px solid #E0E8EB", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                                                >
                                                    <span style={{ fontWeight: 500, fontSize: "0.85rem", color: "var(--text-main)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {d.title || (d.body || "").slice(0, 50) || "Sans titre"}
                                                    </span>
                                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                                                        {formatDateFR(d.updatedAt || d.createdAt)}
                                                    </span>
                                                    <span style={{ fontSize: "0.75rem", color: "#8AABAE", flexShrink: 0 }}>modifier</span>
                                                </button>
                                            ))}
                                        </div>
                                        <hr style={{ border: "none", borderTop: "1px solid #E8ECEE", margin: "0.75rem 0 0" }} />
                                    </div>
                                )}

                                {/* Formulaire */}
                                <div style={{ display: "grid", gap: "0.85rem" }}>
                                    <label style={labelStyle}>
                                        Titre <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optionnel)</span>
                                        <input
                                            type="text"
                                            value={formState.title}
                                            onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
                                            placeholder="Un titre accrocheur…"
                                            style={fieldStyle}
                                        />
                                    </label>
                                    <label style={labelStyle}>
                                        Conseil *
                                        <textarea
                                            rows={5}
                                            value={formState.body}
                                            onChange={(e) => setFormState((p) => ({ ...p, body: e.target.value }))}
                                            placeholder="Partagez votre conseil avec l'équipe…"
                                            style={{ ...fieldStyle, resize: "vertical" }}
                                            autoFocus
                                        />
                                    </label>
                                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem", margin: 0 }}>{localError}</p>}
                                    <div style={{ display: "grid", gap: "0.5rem" }}>
                                        <button
                                            className="action-cta task-action-btn"
                                            type="button"
                                            disabled={isSaving}
                                            onClick={() => handleSubmit("en_attente")}
                                            style={{ justifyContent: "center" }}
                                        >
                                            {isSaving ? "Envoi…" : "Soumettre à validation"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* FAB "+" */}
            <button
                type="button"
                title="Nouveau conseil"
                onClick={openComposer}
                style={{ position: "fixed", bottom: "2rem", right: "2rem", width: "52px", height: "52px", borderRadius: "50%", background: "var(--text-main, #1a2e35)", color: "#fff", border: "none", fontSize: "1.6rem", lineHeight: 1, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.22)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s, box-shadow 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.28)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.22)"; }}
            >
                +
            </button>
        </>
    );
}
