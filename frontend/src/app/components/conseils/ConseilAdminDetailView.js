"use client";

import { ConseilDetailSections, StatusBadge } from "./ConseilMetaDisplay";
import ConseilDetailHeader from "./ConseilDetailHeader";
import ConseilDetailBody from "./ConseilDetailBody";
import ConseilDetailHero from "./ConseilDetailHero";
import { formatDateFR } from "../../lib/formatters";
import ConseilEngagementInsights from "./ConseilEngagementInsights";

const IconPencil = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);
const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" /></svg>
);
const IconCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const IconX = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const IconPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
);

export default function ConseilAdminDetailView({ item, onBack, onEdit, onDelete, onValidate, onOpenReject }) {
    if (!item) return null;

    return (
        <article className="conseil-detail-page">
            <ConseilDetailHeader
                item={item}
                onBack={onBack}
                eyebrow="Conseils"
                badge={<StatusBadge status={item.status} />}
            />

            <div className="conseil-detail__grid">
                <div className="conseil-detail__main">
                    <ConseilDetailHero item={item} />

                    <div className="conseil-detail__panel">
                        <ConseilDetailBody item={item} />
                        <ConseilDetailSections item={item} />
                    </div>

                    {item.rejectionComment && (
                        <div className="conseil-detail__alert conseil-detail__alert--error">
                            <p className="conseil-detail__alert-title">Motif de refus</p>
                            <p className="conseil-detail__alert-text">{item.rejectionComment}</p>
                        </div>
                    )}
                </div>

                <aside className="conseil-detail__sidebar">
                    <div className="conseil-detail__panel conseil-detail__panel--compact">
                        <h2 className="conseil-detail__panel-title">Informations</h2>
                        <dl className="conseil-detail__meta-list">
                            <div className="conseil-detail__meta-row">
                                <dt>Auteur</dt>
                                <dd>{item.authorName}</dd>
                            </div>
                            <div className="conseil-detail__meta-row">
                                <dt>Statut</dt>
                                <dd><StatusBadge status={item.status} /></dd>
                            </div>
                            <div className="conseil-detail__meta-row">
                                <dt>Créé le</dt>
                                <dd>{formatDateFR(item.createdAt)}</dd>
                            </div>
                            <div className="conseil-detail__meta-row">
                                <dt>Modifié le</dt>
                                <dd>{formatDateFR(item.updatedAt)}</dd>
                            </div>
                        </dl>
                        {item.isPinned && (
                            <p className="conseil-detail__pinned-note">
                                <IconPin />
                                Conseil épinglé du jour
                            </p>
                        )}
                    </div>

                    <div className="conseil-detail__panel conseil-detail__panel--compact">
                        <ConseilEngagementInsights
                            contentId={item.id}
                            likeCount={item.likeCount}
                            favoriteCount={item.favoriteCount}
                            apiPrefix="admin"
                        />
                    </div>

                    <div className="conseil-detail__panel conseil-detail__panel--compact conseil-detail__actions">
                        <h2 className="conseil-detail__panel-title">Actions</h2>
                        <button type="button" onClick={onEdit} className="action-cta task-action-btn conseil-detail__action-btn">
                            <IconPencil /> Modifier
                        </button>
                        {item.status === "en_attente" && (
                            <>
                                <button type="button" onClick={() => onValidate(item)} className="action-cta task-action-btn conseil-detail__action-btn conseil-detail__action-btn--validate">
                                    <IconCheck /> Valider
                                </button>
                                <button type="button" onClick={() => onOpenReject(item)} className="action-cta conseil-detail__action-btn conseil-detail__action-btn--reject">
                                    <IconX /> Refuser
                                </button>
                            </>
                        )}
                        <button type="button" onClick={() => onDelete(item)} className="action-cta conseil-detail__action-btn conseil-detail__action-btn--delete">
                            <IconTrash /> Supprimer
                        </button>
                    </div>
                </aside>
            </div>
        </article>
    );
}
