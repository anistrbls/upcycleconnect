"use client";

import { ConseilCardFactsStrip } from "./ConseilMetaDisplay";

const IconChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const IconPin = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
);

/**
 * En-tête page détail : retour, titre, résumé (sous-titre), pastilles infos.
 */
export default function ConseilDetailHeader({
    item,
    onBack,
    backLabel = "Retour",
    eyebrow = "Conseil",
    badge = null,
    metaLine = null,
}) {
    if (!item) return null;
    const summary = (item.summary || "").trim();

    return (
        <header className="conseil-detail__header">
            <button type="button" className="conseil-detail__back" onClick={onBack}>
                <IconChevronLeft />
                {backLabel}
            </button>

            {metaLine}

            <div className="conseil-detail__title-row">
                <div className="conseil-detail__title-block">
                    {eyebrow && <span className="conseil-detail__eyebrow">{eyebrow}</span>}
                    <h1 className="conseil-detail__title">
                        {item.isPinned && (
                            <span className="conseil-detail__pin" title="Conseil épinglé">
                                <IconPin />
                            </span>
                        )}
                        {item.title}
                    </h1>
                </div>
                {badge}
            </div>

            {summary && <p className="conseil-detail__subtitle">{summary}</p>}

            <div className="conseil-detail__facts">
                <ConseilCardFactsStrip item={item} />
            </div>
        </header>
    );
}
