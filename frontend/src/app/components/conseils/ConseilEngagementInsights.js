"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

const MODAL_COPY = {
    likes: {
        title: "Personnes qui ont aimé ce conseil",
        empty: "Aucun j'aime pour le moment.",
        loadError: "Impossible de charger la liste des j'aime",
    },
    favorites: {
        title: "Personnes qui ont mis ce conseil en favoris",
        empty: "Aucun favori pour le moment.",
        loadError: "Impossible de charger la liste des favoris",
    },
};

function EngagementStatButton({ label, count, icon, onClick, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="conseil-engagement-stat"
        >
            <span className="conseil-engagement-stat__icon" aria-hidden>{icon}</span>
            <span className="conseil-engagement-stat__count">{Number(count ?? 0)}</span>
            <span className="conseil-engagement-stat__label">{label}</span>
        </button>
    );
}

function UsersModal({ open, kind, users, loading, error, onClose }) {
    const copy = MODAL_COPY[kind] || MODAL_COPY.likes;

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            role="presentation"
            className="conseil-engagement-modal-backdrop"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="conseil-engagement-modal-title"
                className="conseil-engagement-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="conseil-engagement-modal__header">
                    <h3 id="conseil-engagement-modal-title" className="conseil-engagement-modal__title">
                        {copy.title}
                    </h3>
                    <button type="button" className="conseil-engagement-modal__close" aria-label="Fermer" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="conseil-engagement-modal__body">
                    {loading ? (
                        <p className="conseil-engagement-modal__hint">Chargement…</p>
                    ) : error ? (
                        <p className="conseil-engagement-modal__error">{error}</p>
                    ) : users.length === 0 ? (
                        <p className="conseil-engagement-modal__hint">{copy.empty}</p>
                    ) : (
                        <ul className="conseil-engagement-modal__list">
                            {users.map((user, idx) => (
                                <li
                                    key={user.userId}
                                    className={idx < users.length - 1 ? "conseil-engagement-modal__item conseil-engagement-modal__item--bordered" : "conseil-engagement-modal__item"}
                                >
                                    <div className="conseil-engagement-modal__name">
                                        {user.displayName || `Utilisateur #${user.userId}`}
                                    </div>
                                    <div className="conseil-engagement-modal__role">{user.role || "—"}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * @param {{ contentId: number|string, likeCount?: number, favoriteCount?: number, apiPrefix?: 'admin'|'salarie' }} props
 * apiPrefix: admin → /admin/salarie-contents/{id}/… ; salarie → /salarie/contents/{id}/…
 */
export default function ConseilEngagementInsights({
    contentId,
    likeCount = 0,
    favoriteCount = 0,
    apiPrefix = "admin",
}) {
    const [modalKind, setModalKind] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const basePath = apiPrefix === "admin"
        ? `/admin/salarie-contents/${contentId}`
        : `/salarie/contents/${contentId}`;

    const openModal = useCallback(async (kind) => {
        setModalKind(kind);
        setLoading(true);
        setError(null);
        setUsers([]);
        try {
            const suffix = kind === "likes" ? "/likes" : "/favorites";
            const res = await fetch(apiUrl(`${basePath}${suffix}`), { headers: buildAuthHeaders() });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || MODAL_COPY[kind].loadError);
            }
            setUsers(Array.isArray(data?.users) ? data.users : []);
        } catch (err) {
            setError(String(err?.message || MODAL_COPY[kind].loadError));
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [basePath]);

    const closeModal = () => setModalKind(null);

    const heartIcon = (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    );
    const bookmarkIcon = (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
    );

    return (
        <div className="conseil-engagement-insights">
            <h2 className="conseil-detail__panel-title">Engagement visiteurs</h2>
            <div className="conseil-engagement-insights__grid">
                <EngagementStatButton
                    label="J'aime"
                    count={likeCount}
                    icon={heartIcon}
                    title="Voir qui a aimé ce conseil"
                    onClick={() => openModal("likes")}
                />
                <EngagementStatButton
                    label="Favoris"
                    count={favoriteCount}
                    icon={bookmarkIcon}
                    title="Voir qui a mis ce conseil en favoris"
                    onClick={() => openModal("favorites")}
                />
            </div>
            <UsersModal
                open={!!modalKind}
                kind={modalKind}
                users={users}
                loading={loading}
                error={error}
                onClose={closeModal}
            />
        </div>
    );
}
