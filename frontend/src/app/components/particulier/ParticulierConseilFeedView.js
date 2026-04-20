"use client";

import { useState } from "react";
import { formatDateFR } from "../../lib/formatters";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

/* ── Icônes style X ─────────────────────────────────────────────────────────── */
const IcHeart = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#E0245E" : "none"} stroke={filled ? "#E0245E" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);
const IcBookmark = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
);
const IcShare = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
);
const IcVerified = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#1D9BF0"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.8c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.37 14.67 22.25 13.43 22.25 12zm-5.74-1.53l-4.6 4.6a.75.75 0 0 1-1.06 0l-2.3-2.3a.75.75 0 1 1 1.06-1.06l1.77 1.77 4.07-4.07a.75.75 0 0 1 1.06 1.06z" /></svg>
);
const IcPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
);

/* ── Carte style X (lecture seule) ──────────────────────────────────────────── */
function ConseilCard({ item, delay = 0 }) {
    const [liked, setLiked] = useState(!!item.likedByMe);
    const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);
    const [bookmarked, setBookmarked] = useState(!!item.favoritedByMe);
    const [favoriteCount, setFavoriteCount] = useState(item.favoriteCount ?? 0);
    const [expanded, setExpanded] = useState(false);

    const body = item.body || "";
    const needsTrunc = body.length > 300;
    const displayBody = needsTrunc && !expanded ? body.slice(0, 300) + "…" : body;

    return (
        <div className="x-card" style={{ animationDelay: `${delay}s` }}>
            {item.isPinned && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#71767B", marginBottom: "0.6rem" }}>
                    <IcPin /> <span style={{ fontWeight: 600 }}>Conseil épinglé</span>
                </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Ligne auteur */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.93rem", color: "#0F1419" }}>{item.authorName}</span>
                    <IcVerified />
                    <span style={{ color: "#71767B", fontSize: "0.84rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        @{(item.authorName || "").toLowerCase().replace(/\s+/g, "")}
                    </span>
                    <span style={{ color: "#71767B", fontSize: "0.84rem" }}>·</span>
                    <span style={{ color: "#71767B", fontSize: "0.84rem", whiteSpace: "nowrap" }}>{formatDateFR(item.createdAt)}</span>
                </div>

                {/* Titre */}
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

                {/* Compteurs */}
                <div style={{ borderTop: "1px solid #EFF3F4", marginTop: "0.85rem", paddingTop: "0.65rem", display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#71767B" }}>
                    <span><strong style={{ color: "#0F1419" }}>{likeCount}</strong> J&apos;aime</span>
                    <span><strong style={{ color: "#0F1419" }}>{favoriteCount}</strong> Favoris</span>
                </div>

                {/* Actions */}
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
                    <button type="button" className="x-icon-btn" aria-label="Partager" style={{ color: "#71767B" }}>
                        <IcShare />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Composant principal ────────────────────────────────────────────────────── */
export default function ParticulierConseilFeedView({ feedItems = [], loading, errorMessage, favoritesOnly = false }) {
    return (
        <>
            <style>{`
                @keyframes cardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .x-card { background:#fff; border:1px solid #EFF3F4; border-radius:20px; padding:1.1rem 1.25rem 0.7rem; box-shadow:0 1px 8px rgba(0,0,0,0.06); transition:box-shadow 0.18s; animation:cardIn 0.22s ease both; }
                .x-card:hover { box-shadow:0 4px 18px rgba(0,0,0,0.10); }
                .x-icon-btn { background:none; border:none; cursor:pointer; padding:6px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s, color 0.15s; font-family:inherit; }
                .x-icon-btn:hover { background:rgba(29,155,240,0.1); color:#1D9BF0 !important; }
            `}</style>

            <div className="header-section" style={{ marginBottom: "1.75rem" }}>
                <div className="title-area">
                    <span className="activities-label">Espace particulier</span>
                    <h1>{favoritesOnly ? "Mes favoris" : "Conseils"}</h1>
                </div>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "1rem" }}>{errorMessage}</p>}

            <div style={{ display: "grid", gap: "0.85rem", maxWidth: "600px" }}>
                {loading && [1, 2, 3].map((k) => (
                    <div key={k} style={{ background: "#F7F9F9", borderRadius: "20px", height: "130px", opacity: 0.5 }} />
                ))}
                {!loading && feedItems.length === 0 && (
                    <div style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
                        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.35rem" }}>
                            {favoritesOnly ? "Aucun conseil en favoris" : "Aucun conseil publié pour le moment"}
                        </p>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            {favoritesOnly ? "Mettez des conseils en favoris pour les retrouver ici." : "Revenez bientôt pour découvrir les conseils de l'équipe."}
                        </p>
                    </div>
                )}
                {!loading && feedItems.map((item, idx) => (
                    <ConseilCard key={item.id} item={item} delay={idx * 0.04} />
                ))}
            </div>
        </>
    );
}
