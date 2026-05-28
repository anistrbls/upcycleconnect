"use client";

import { useState } from "react";
import { ConseilDetailSections } from "./ConseilMetaDisplay";
import ConseilDetailHeader from "./ConseilDetailHeader";
import ConseilDetailBody from "./ConseilDetailBody";
import ConseilDetailHero from "./ConseilDetailHero";
import { formatDateFR } from "../../lib/formatters";
import { apiUrl, buildAuthHeaders } from "../../lib/api";
import ConseilEngagementInsights from "./ConseilEngagementInsights";

const IcHeart = ({ filled }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "#E0245E" : "none"} stroke={filled ? "#E0245E" : "#c0392b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);
const IcBookmark = ({ filled }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "var(--accent)" : "none"} stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
);
const IcVerified = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#1D9BF0" aria-hidden><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.8c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.37 14.67 22.25 13.43 22.25 12zm-5.74-1.53l-4.6 4.6a.75.75 0 0 1-1.06 0l-2.3-2.3a.75.75 0 1 1 1.06-1.06l1.77 1.77 4.07-4.07a.75.75 0 0 1 1.06 1.06z" /></svg>
);
const IconPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
);

function ConseilVisitorEngagement({ item, liked, likeCount, bookmarked, favoriteCount, onToggleLike, onToggleFavorite }) {
    return (
        <div className="conseil-detail__panel conseil-detail__panel--compact">
            <h2 className="conseil-detail__panel-title">Interactions</h2>
            <div className="conseil-engagement-insights__grid">
                <button
                    type="button"
                    className={`conseil-engagement-stat${liked ? " conseil-engagement-stat--active" : ""}`}
                    aria-label={liked ? "Je n'aime plus" : "J'aime"}
                    aria-pressed={liked}
                    onClick={onToggleLike}
                >
                    <span className="conseil-engagement-stat__icon" aria-hidden><IcHeart filled={liked} /></span>
                    <span className="conseil-engagement-stat__count">{likeCount}</span>
                    <span className="conseil-engagement-stat__label">J&apos;aime</span>
                </button>
                <button
                    type="button"
                    className={`conseil-engagement-stat${bookmarked ? " conseil-engagement-stat--active conseil-engagement-stat--bookmark" : ""}`}
                    aria-label={bookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}
                    aria-pressed={bookmarked}
                    onClick={onToggleFavorite}
                >
                    <span className="conseil-engagement-stat__icon" aria-hidden><IcBookmark filled={bookmarked} /></span>
                    <span className="conseil-engagement-stat__count">{favoriteCount}</span>
                    <span className="conseil-engagement-stat__label">Favoris</span>
                </button>
            </div>
        </div>
    );
}

export default function ConseilPublicDetailView({
    item,
    onBack,
    showEngagement = true,
    showEngagementInsights = false,
    engagementApiPrefix = "salarie",
    onEdit,
}) {
    const [liked, setLiked] = useState(!!item?.likedByMe);
    const [likeCount, setLikeCount] = useState(item?.likeCount ?? 0);
    const [bookmarked, setBookmarked] = useState(!!item?.favoritedByMe);
    const [favoriteCount, setFavoriteCount] = useState(item?.favoriteCount ?? 0);

    if (!item) return null;

    const toggleLike = async () => {
        const next = !liked;
        setLiked(next);
        setLikeCount((c) => c + (next ? 1 : -1));
        try {
            await fetch(apiUrl(`/salarie/contents/like/${item.id}`), {
                method: next ? "POST" : "DELETE",
                headers: buildAuthHeaders(),
            });
        } catch { /* ignore */ }
    };

    const toggleFavorite = async () => {
        const next = !bookmarked;
        setBookmarked(next);
        setFavoriteCount((c) => c + (next ? 1 : -1));
        try {
            await fetch(apiUrl(`/salarie/contents/favorite/${item.id}`), {
                method: next ? "POST" : "DELETE",
                headers: buildAuthHeaders(),
            });
        } catch { /* ignore */ }
    };

    return (
        <article className="conseil-detail-page">
            <ConseilDetailHeader
                item={item}
                onBack={onBack}
                eyebrow="Conseils"
            />

            <div className="conseil-detail__grid">
                <div className="conseil-detail__main">
                    <ConseilDetailHero item={item} />

                    <div className="conseil-detail__panel">
                        <ConseilDetailBody item={item} />
                        <ConseilDetailSections item={item} />
                    </div>

                    {onEdit && (
                        <button type="button" className="action-cta task-action-btn conseil-detail__action-btn" onClick={onEdit}>
                            Modifier
                        </button>
                    )}
                </div>

                <aside className="conseil-detail__sidebar">
                    <div className="conseil-detail__panel conseil-detail__panel--compact">
                        <h2 className="conseil-detail__panel-title">Informations</h2>
                        <dl className="conseil-detail__meta-list">
                            <div className="conseil-detail__meta-row">
                                <dt>Auteur</dt>
                                <dd className="conseil-detail__meta-author">
                                    <span>{item.authorName}</span>
                                    <IcVerified />
                                </dd>
                            </div>
                            <div className="conseil-detail__meta-row">
                                <dt>Publié le</dt>
                                <dd>{formatDateFR(item.createdAt)}</dd>
                            </div>
                        </dl>
                        {item.isPinned && (
                            <p className="conseil-detail__pinned-note">
                                <IconPin />
                                Conseil épinglé du jour
                            </p>
                        )}
                    </div>

                    {showEngagementInsights && (
                        <div className="conseil-detail__panel conseil-detail__panel--compact">
                            <ConseilEngagementInsights
                                contentId={item.id}
                                likeCount={item.likeCount}
                                favoriteCount={item.favoriteCount}
                                apiPrefix={engagementApiPrefix}
                            />
                        </div>
                    )}

                    {showEngagement && (
                        <ConseilVisitorEngagement
                            item={item}
                            liked={liked}
                            likeCount={likeCount}
                            bookmarked={bookmarked}
                            favoriteCount={favoriteCount}
                            onToggleLike={toggleLike}
                            onToggleFavorite={toggleFavorite}
                        />
                    )}
                </aside>
            </div>
        </article>
    );
}
