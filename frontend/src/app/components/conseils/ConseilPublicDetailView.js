"use client";

import { useState } from "react";
import { ConseilDetailSections } from "./ConseilMetaDisplay";
import ConseilDetailHeader from "./ConseilDetailHeader";
import ConseilDetailBody from "./ConseilDetailBody";
import ConseilDetailHero from "./ConseilDetailHero";
import { formatDateFR } from "../../lib/formatters";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

const IcHeart = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#E0245E" : "none"} stroke={filled ? "#E0245E" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);
const IcBookmark = ({ filled }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
);
const IcVerified = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#1D9BF0"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.8c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.37 14.67 22.25 13.43 22.25 12zm-5.74-1.53l-4.6 4.6a.75.75 0 0 1-1.06 0l-2.3-2.3a.75.75 0 1 1 1.06-1.06l1.77 1.77 4.07-4.07a.75.75 0 0 1 1.06 1.06z" /></svg>
);

export default function ConseilPublicDetailView({
    item,
    onBack,
    showEngagement = true,
    onEdit,
}) {
    const [liked, setLiked] = useState(!!item?.likedByMe);
    const [likeCount, setLikeCount] = useState(item?.likeCount ?? 0);
    const [bookmarked, setBookmarked] = useState(!!item?.favoritedByMe);
    const [favoriteCount, setFavoriteCount] = useState(item?.favoriteCount ?? 0);

    if (!item) return null;

    const authorMeta = (
        <p className="conseil-detail__author">
            <span className="conseil-detail__author-name">{item.authorName}</span>
            <IcVerified />
            <span className="conseil-detail__author-date">· {formatDateFR(item.createdAt)}</span>
        </p>
    );

    return (
        <article className="conseil-detail-page conseil-detail-page--narrow">
            <ConseilDetailHeader
                item={item}
                onBack={onBack}
                eyebrow={null}
                metaLine={authorMeta}
            />

            <ConseilDetailHero item={item} />

            <div className="conseil-detail__panel">
                <ConseilDetailBody item={item} />
                <ConseilDetailSections item={item} />
            </div>

            {onEdit && (
                <button type="button" className="action-cta task-action-btn" style={{ marginTop: "1.25rem" }} onClick={onEdit}>
                    Modifier
                </button>
            )}

            {showEngagement && (
                <footer className="conseil-detail__engagement">
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
                            } catch { /* ignore */ }
                        }}
                        style={{ color: liked ? "#E0245E" : "#71767B" }}
                    >
                        <IcHeart filled={liked} />
                    </button>
                    <span>{likeCount} J&apos;aime</span>
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
                            } catch { /* ignore */ }
                        }}
                        style={{ color: bookmarked ? "#1D9BF0" : "#71767B" }}
                    >
                        <IcBookmark filled={bookmarked} />
                    </button>
                    <span>{favoriteCount} Favoris</span>
                </footer>
            )}
        </article>
    );
}
