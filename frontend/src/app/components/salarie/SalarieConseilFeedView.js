"use client";

import { useState, useEffect, useRef } from "react";
import { formatDateFR } from "../../lib/formatters";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

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
        <div style={{ position: "fixed", bottom: "5.5rem", right: "2rem", background: "#2E7D32", color: "#fff", padding: "0.75rem 1.25rem", borderRadius: "12px", fontSize: "0.87rem", fontWeight: 500, boxShadow: "0 6px 20px rgba(0,0,0,0.22)", zIndex: 300, pointerEvents: "none", animation: "fadeInSlide 0.3s ease" }}>
            {message}
        </div>
    );
}

/* ── Icônes style X ─────────────────────────────────────────────── */
const IcHeart = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#E0245E" : "none"} stroke={filled ? "#E0245E" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);
const IcBookmark = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
);
const IcShare = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
);
const IcDots = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
);
const IcVerified = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#1D9BF0"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.8c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.37 14.67 22.25 13.43 22.25 12zm-5.74-1.53l-4.6 4.6a.75.75 0 0 1-1.06 0l-2.3-2.3a.75.75 0 1 1 1.06-1.06l1.77 1.77 4.07-4.07a.75.75 0 0 1 1.06 1.06z" /></svg>
);
const IcPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
);

/* ── Icônes formulaire ──────────────────────────────────────────── */
const IcChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const IcCamera = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);

/* ── Styles pleine-page (identiques à l'admin) ──────────────────── */
const S = {
    container: { width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" },
    grid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" },
    card: { background: "var(--surface-hover)", borderRadius: "28px", padding: "2rem", marginBottom: "1.5rem" },
    sectionTitle: { fontSize: "1rem", fontWeight: 700, margin: "0 0 1.25rem 0" },
    label: { display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: "0.75rem" },
    input: { padding: "0.75rem 1rem", borderRadius: "14px", border: "none", background: "#fff", fontSize: "0.92rem", outline: "none", width: "100%", boxSizing: "border-box" },
    textarea: { padding: "0.75rem 1rem", borderRadius: "14px", border: "none", background: "#fff", fontSize: "0.92rem", outline: "none", width: "100%", resize: "vertical", minHeight: "160px", boxSizing: "border-box", fontFamily: "inherit" },
    btnPrimary: { padding: "0.75rem 1.5rem", borderRadius: "20px", border: "none", background: "var(--black)", color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", width: "100%" },
    btnSecondary: { padding: "0.6rem 1.25rem", borderRadius: "20px", border: "none", background: "#e8ecee", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", width: "100%", marginTop: "0.65rem" },
    errorBox: { padding: "0.75rem 1rem", borderRadius: "14px", background: "#FDE8E8", color: "#B24A4A", fontSize: "0.83rem", marginTop: "0.75rem" },
    photoBox: { border: "2px dashed #d0d8da", borderRadius: "20px", padding: "2rem 1rem", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.75)", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" },
};

/* ── Formulaire pleine-page (identique à l'admin) ───────────────── */
function SalarieConseilForm({ editingItem, formState, setFormState, onSubmit, onSaveDraft, onCancel, isSaving, localError }) {
    const fileRef = useRef();
    const set = (key) => (e) => setFormState((p) => ({ ...p, [key]: e.target.value }));

    const handleFileDrop = (file) => {
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (ev) => setFormState((p) => ({ ...p, imageUrl: ev.target.result }));
        reader.readAsDataURL(file);
    };

    return (
        <div style={S.container}>
            <div style={{ marginBottom: "2rem" }}>
                <button type="button" onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem", padding: 0 }}>
                    <IcChevronLeft /> Retour
                </button>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Espace salarié · Conseils</span>
                <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
                    {editingItem ? "Modifier le conseil" : "Partager un conseil"}
                </h1>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit("en_attente"); }}>
                <div style={S.grid}>
                    {/* Colonne principale */}
                    <div>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Contenu</h2>
                            <label style={S.label}>
                                Titre *
                                <input type="text" value={formState.title} onChange={set("title")} style={S.input} required placeholder="Ex. Comment trier les matériaux en bois…" />
                            </label>
                            <label style={S.label}>
                                Contenu *
                                <textarea value={formState.body} onChange={set("body")} style={S.textarea} required placeholder="Rédigez votre conseil…" autoFocus />
                            </label>
                        </div>

                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Image de couverture</h2>
                            {formState.imageUrl ? (
                                <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", marginBottom: "0.75rem" }}>
                                    <img src={formState.imageUrl} alt="Aperçu" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", display: "block" }} />
                                    <button type="button" onClick={() => setFormState((p) => ({ ...p, imageUrl: "" }))} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem" }}>×</button>
                                </div>
                            ) : (
                                <div style={S.photoBox} onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFileDrop(e.dataTransfer.files[0]); }}>
                                    <IcCamera />
                                    <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Cliquer ou glisser une image</span>
                                    <span style={{ fontSize: "0.78rem" }}>JPG, PNG, WEBP</span>
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileDrop(e.target.files[0])} />
                            {!formState.imageUrl.startsWith("data:") && (
                                <div style={{ marginTop: "0.75rem" }}>
                                    <label style={{ ...S.label, fontSize: "0.78rem" }}>
                                        URL externe (facultatif)
                                        <input type="text" value={formState.imageUrl} onChange={set("imageUrl")} style={{ ...S.input, fontSize: "0.82rem" }} placeholder="https://…" />
                                    </label>
                                </div>
                            )}
                        </div>

                        {localError && <div style={S.errorBox}>{localError}</div>}
                    </div>

                    {/* Colonne latérale */}
                    <div style={{ position: "sticky", top: "1rem" }}>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Publication</h2>
                            <button type="submit" disabled={isSaving} style={S.btnPrimary}>
                                {isSaving ? "Envoi…" : editingItem ? "Soumettre à validation" : "Soumettre à validation"}
                            </button>
                            <button type="button" disabled={isSaving} onClick={() => onSubmit("brouillon")} style={S.btnSecondary}>
                                {isSaving ? "Enregistrement…" : "Enregistrer en brouillon"}
                            </button>
                            <button type="button" onClick={onCancel} style={{ ...S.btnSecondary, marginTop: "0.4rem" }}>Annuler</button>
                        </div>
                        <div style={{ ...S.card, background: "#EAF4FF", marginTop: 0 }}>
                            <p style={{ fontSize: "0.83rem", color: "#1e4976", margin: 0, lineHeight: 1.55 }}>
                                Votre conseil sera relu par un administrateur avant d'être publié dans le feed.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

/* ── Carte style X ──────────────────────────────────────────────── */
function ConseilCard({ item, isOwn, onEdit, onDelete, delay = 0 }) {
    const [liked, setLiked] = useState(!!item.likedByMe);
    const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);
    const [bookmarked, setBookmarked] = useState(!!item.favoritedByMe);
    const [favoriteCount, setFavoriteCount] = useState(item.favoriteCount ?? 0);
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const initials = getInitials(item.authorName);
    const avatarBg = getAvatarColor(item.authorName);
    const body = item.body || "";
    const needsTrunc = body.length > 300;
    const displayBody = needsTrunc && !expanded ? body.slice(0, 300) + "…" : body;

    return (
        <div
            className="x-card"
            style={{ animationDelay: `${delay}s` }}
        >
            {/* Badge épinglé */}
            {item.isPinned && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#71767B", marginBottom: "0.6rem" }}>
                    <IcPin /> <span style={{ fontWeight: 600 }}>Conseil épinglé</span>
                </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Ligne auteur */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.2rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", minWidth: 0, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.93rem", color: "#0F1419" }}>{item.authorName}</span>
                            <IcVerified />
                            <span style={{ color: "#71767B", fontSize: "0.84rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                @{(item.authorName || "").toLowerCase().replace(/\s+/g, "")}
                            </span>
                            <span style={{ color: "#71767B", fontSize: "0.84rem" }}>·</span>
                            <span style={{ color: "#71767B", fontSize: "0.84rem", whiteSpace: "nowrap" }}>{formatDateFR(item.createdAt)}</span>
                        </div>
                        {/* Menu "..." */}
                        {isOwn && (
                            <div style={{ position: "relative", flexShrink: 0 }}>
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((p) => !p)}
                                    className="x-icon-btn"
                                    style={{ color: "#71767B" }}
                                    aria-label="Options"
                                >
                                    <IcDots />
                                </button>
                                {menuOpen && (
                                    <>
                                        <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setMenuOpen(false)} />
                                        <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", borderRadius: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: "1px solid #EFF3F4", zIndex: 50, minWidth: "150px", overflow: "hidden" }}>
                                            <button type="button" onClick={() => { setMenuOpen(false); onEdit(item); }} style={{ display: "block", width: "100%", padding: "0.65rem 1rem", textAlign: "left", background: "none", border: "none", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = "#F7F9F9"}
                                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                            >Modifier</button>
                                            <button type="button" onClick={() => { setMenuOpen(false); onDelete(item); }} style={{ display: "block", width: "100%", padding: "0.65rem 1rem", textAlign: "left", background: "none", border: "none", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", color: "#E0245E", fontFamily: "inherit" }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = "#FFF0F3"}
                                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                            >Supprimer</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Titre (si présent) */}
                    {item.title && (
                        <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0F1419", marginBottom: "0.35rem", lineHeight: 1.4 }}>
                            {item.title}
                        </p>
                    )}

                    {/* Corps */}
                    <p style={{ fontSize: "0.93rem", lineHeight: 1.65, color: "#0F1419", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0 0 0.5rem 0" }}>
                        {displayBody}
                    </p>
                    {needsTrunc && (
                        <button type="button" onClick={() => setExpanded((p) => !p)} style={{ fontSize: "0.82rem", color: "#1D9BF0", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontWeight: 500 }}>
                            {expanded ? "Voir moins" : "Lire la suite"}
                        </button>
                    )}

                    {/* Image */}
                    {item.imageUrl && (
                        <div style={{ marginTop: "0.85rem", borderRadius: "16px", overflow: "hidden", border: "1px solid #EFF3F4" }}>
                            <img src={item.imageUrl} alt={item.title || "Image"} style={{ width: "100%", maxHeight: "300px", objectFit: "cover", display: "block" }} onError={(e) => { e.target.parentElement.style.display = "none"; }} />
                        </div>
                    )}

                    {/* Divider + compteurs */}
                    <div style={{ borderTop: "1px solid #EFF3F4", marginTop: "0.85rem", paddingTop: "0.65rem", display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#71767B" }}>
                        <span><strong style={{ color: "#0F1419" }}>{likeCount}</strong> J'aime</span>
                        <span><strong style={{ color: "#0F1419" }}>{favoriteCount}</strong> Favoris</span>
                    </div>

                    {/* Divider + actions */}
                    <div style={{ borderTop: "1px solid #EFF3F4", marginTop: "0.55rem", paddingTop: "0.35rem", display: "flex", alignItems: "center", justifyContent: "space-around" }}>
                        <button
                            type="button"
                            className="x-icon-btn"
                            aria-label={liked ? "Je n'aime plus" : "J'aime"}
                            onClick={async () => {
                                const next = !liked;
                                setLiked(next);
                                setLikeCount((c) => c + (next ? 1 : -1));
                                try {
                                    await fetch(apiUrl(`/salarie/contents/like/${item.id}`), {
                                        method: next ? "POST" : "DELETE",
                                        headers: buildAuthHeaders(),
                                    });
                                } catch {}
                            }}
                            style={{ color: liked ? "#E0245E" : "#71767B" }}
                        >
                            <IcHeart filled={liked} />
                        </button>
                        <button
                            type="button"
                            className="x-icon-btn"
                            aria-label={bookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}
                            onClick={async () => {
                                const next = !bookmarked;
                                setBookmarked(next);
                                setFavoriteCount((c) => c + (next ? 1 : -1));
                                try {
                                    await fetch(apiUrl(`/salarie/contents/favorite/${item.id}`), {
                                        method: next ? "POST" : "DELETE",
                                        headers: buildAuthHeaders(),
                                    });
                                } catch {}
                            }}
                            style={{ color: bookmarked ? "#1D9BF0" : "#71767B" }}
                        >
                            <IcBookmark filled={bookmarked} />
                        </button>
                        <button type="button" className="x-icon-btn" aria-label="Partager" style={{ color: "#71767B" }}><IcShare /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Composant principal ────────────────────────────────────────── */
export default function SalarieConseilFeedView({
    feedItems = [],
    ownItems = [],
    loading,
    errorMessage,
    onCreate,
    onUpdate,
    onDelete,
    draftOnly = false,
}) {
    const [composerOpen, setComposerOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");
    const [formState, setFormState] = useState({ title: "", body: "", imageUrl: "" });
    const [toast, setToast] = useState("");

    const drafts = ownItems.filter((i) => i.type === "conseil" && i.status === "brouillon");
    const pendingItems = ownItems.filter((i) => i.type === "conseil" && i.status === "en_attente");

    const showToast = (msg) => setToast(msg);

    const resetForm = () => {
        setEditingItem(null);
        setFormState({ title: "", body: "", imageUrl: "" });
        setLocalError("");
    };

    const openComposer = () => { resetForm(); setComposerOpen(true); };

    const openDraftForEdit = (item) => {
        setEditingItem(item);
        setFormState({ title: item.title || "", body: item.body || "", imageUrl: item.imageUrl || "" });
        setLocalError("");
        setComposerOpen(true);
    };

    const handleSubmit = async (status) => {
        setLocalError("");
        if (!formState.body.trim()) { setLocalError("Le contenu est requis."); return; }
        if (!formState.title.trim()) { setLocalError("Le titre est requis."); return; }
        setIsSaving(true);
        try {
            const payload = {
                title: formState.title.trim(),
                body: formState.body.trim(),
                imageUrl: formState.imageUrl.trim(),
                status,
                type: "conseil",
            };
            if (editingItem) { await onUpdate(editingItem.id, payload); } else { await onCreate(payload); }
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

    /* ── Vue formulaire (pleine-page) ── */
    if (composerOpen) {
        return (
            <SalarieConseilForm
                editingItem={editingItem}
                formState={formState}
                setFormState={setFormState}
                onSubmit={handleSubmit}
                onCancel={() => { setComposerOpen(false); resetForm(); }}
                isSaving={isSaving}
                localError={localError}
            />
        );
    }

    /* ── Vue brouillons seuls ── */
    if (draftOnly) {
        return (
            <>
                <style>{`
                    @keyframes cardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                    .x-card { background:#fff; border:1px solid #EFF3F4; border-radius:20px; padding:1.1rem 1.25rem 0.7rem; box-shadow:0 1px 8px rgba(0,0,0,0.06); transition:box-shadow 0.18s; animation:cardIn 0.22s ease both; cursor:default; }
                    .x-card:hover { box-shadow:0 4px 18px rgba(0,0,0,0.10); }
                    .x-icon-btn { background:none; border:none; cursor:pointer; padding:6px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s, color 0.15s; font-family:inherit; }
                    .x-icon-btn:hover { background:rgba(29,155,240,0.1); color:#1D9BF0 !important; }
                `}</style>
                <Toast message={toast} onDone={() => setToast("")} />
                <div className="header-section" style={{ marginBottom: "1.75rem" }}>
                    <div className="title-area">
                        <span className="activities-label">Espace salarié</span>
                        <h1>Brouillons</h1>
                    </div>
                </div>
                {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "1rem" }}>{errorMessage}</p>}
                {loading && [1, 2, 3].map((k) => (
                    <div key={k} style={{ background: "#F7F9F9", borderRadius: "14px", height: "72px", opacity: 0.5, marginBottom: "0.5rem", maxWidth: "600px" }} />
                ))}
                {!loading && drafts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "3rem 1rem", maxWidth: "600px" }}>
                        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.35rem" }}>Aucun brouillon</p>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Vos conseils enregistrés en brouillon apparaîtront ici.</p>
                        <button type="button" className="action-cta task-action-btn" style={{ marginTop: "1.25rem", fontSize: "0.88rem" }} onClick={openComposer}>Commencer un conseil</button>
                    </div>
                )}
                {!loading && drafts.length > 0 && (
                    <div style={{ display: "grid", gap: "0.85rem", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
                        {drafts.map((item, idx) => (
                            <ConseilCard
                                key={item.id}
                                item={item}
                                isOwn
                                onEdit={openDraftForEdit}
                                onDelete={handleDelete}
                                delay={idx * 0.04}
                            />
                        ))}
                    </div>
                )}
                {/* FAB */}
                <button type="button" title="Nouveau conseil" onClick={openComposer} style={{ position: "fixed", bottom: "2rem", right: "2rem", width: "52px", height: "52px", borderRadius: "50%", background: "var(--text-main, #1a2e35)", color: "#fff", border: "none", fontSize: "1.6rem", lineHeight: 1, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.22)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s, box-shadow 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.28)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.22)"; }}
                >+</button>
            </>
        );
    }

    /* ── Vue feed ── */
    return (
        <>
            <style>{`
                @keyframes fadeInSlide { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes cardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .x-card {
                    background: #fff;
                    border: 1px solid #EFF3F4;
                    border-radius: 20px;
                    padding: 1.1rem 1.25rem 0.7rem;
                    box-shadow: 0 1px 8px rgba(0,0,0,0.06);
                    transition: box-shadow 0.18s;
                    animation: cardIn 0.22s ease both;
                    cursor: default;
                }
                .x-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.10); }
                .x-icon-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s, color 0.15s;
                    font-family: inherit;
                }
                .x-icon-btn:hover { background: rgba(29,155,240,0.1); color: #1D9BF0 !important; }
                .pending-banner {
                    background: #FFFBF0;
                    border: 1px solid #F5DCA0;
                    border-left: 4px solid #F5A623;
                    border-radius: 14px;
                    padding: 0.85rem 1.1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .feed-divider {
                    display: flex; align-items: center; gap: 0.75rem;
                    margin: 1.5rem 0 1rem;
                    color: #71767B; font-size: 0.72rem; font-weight: 600;
                    text-transform: uppercase; letter-spacing: 0.07em;
                }
                .feed-divider::before, .feed-divider::after { content: ""; flex: 1; height: 1px; background: #EFF3F4; }
            `}</style>

            <Toast message={toast} onDone={() => setToast("")} />

            <div className="header-section" style={{ marginBottom: "1.75rem" }}>
                <div className="title-area">
                    <span className="activities-label">Espace salarié</span>
                    <h1>Conseils</h1>
                </div>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "1rem" }}>{errorMessage}</p>}

            {/* En attente */}
            {pendingItems.length > 0 && (
                <div style={{ marginBottom: "1.5rem", display: "grid", gap: "0.5rem" }}>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>En attente de validation</p>
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

            {!loading && feedItems.length > 0 && <div className="feed-divider">Conseils publiés</div>}

            {/* Feed */}
            <div style={{ display: "grid", gap: "0.85rem", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
                {loading && [1, 2, 3].map((k) => (
                    <div key={k} style={{ background: "#F7F9F9", borderRadius: "20px", height: "130px", opacity: 0.5 }} />
                ))}
                {!loading && feedItems.length === 0 && (
                    <div style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
                        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.35rem" }}>Aucun conseil partagé pour l'instant</p>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Soyez le premier à partager votre expertise !</p>
                        <button type="button" className="action-cta task-action-btn" style={{ marginTop: "1.25rem", fontSize: "0.88rem" }} onClick={openComposer}>Partager un conseil</button>
                    </div>
                )}
                {!loading && feedItems.map((item, idx) => {
                    const isOwn = ownItems.some((o) => o.id === item.id);
                    return (
                        <ConseilCard
                            key={item.id}
                            item={item}
                            isOwn={isOwn || item.isOwn}
                            onEdit={(i) => openDraftForEdit(i)}
                            onDelete={handleDelete}
                            delay={idx * 0.04}
                        />
                    );
                })}
            </div>

            {/* FAB */}
            <button type="button" title="Nouveau conseil" onClick={openComposer} style={{ position: "fixed", bottom: "2rem", right: "2rem", width: "52px", height: "52px", borderRadius: "50%", background: "var(--text-main, #1a2e35)", color: "#fff", border: "none", fontSize: "1.6rem", lineHeight: 1, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.22)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s, box-shadow 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.28)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.22)"; }}
            >+</button>
        </>
    );
}

