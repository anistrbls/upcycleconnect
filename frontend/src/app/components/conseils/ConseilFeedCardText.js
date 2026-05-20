"use client";

import { ConseilCardFactsStrip } from "./ConseilMetaDisplay";
import ConseilMaterialsIntro from "./ConseilMaterialsIntro";
import {
    formatMaterialsIntro,
    getConseilFeedCoreText,
} from "../../lib/conseilMaterialsFormat";

/**
 * Bloc texte structuré pour les cartes conseil (feed).
 * @param {boolean} preferFullBody — admin : résumé + corps séparés ; public : displayBody
 */
const BODY_TRUNC_LEN = 300;

export default function ConseilFeedCardText({
    item,
    expanded = false,
    onToggleExpand,
    preferFullBody = true,
    bodyOnly = false,
}) {
    const summary = (item?.summary || "").trim();
    const showSummary = preferFullBody && summary.length > 0;
    const hasMaterialsIntro = formatMaterialsIntro(item?.materials).length > 0;
    const coreText = getConseilFeedCoreText(item, { preferFullBody, bodyOnly });
    const introLen = hasMaterialsIntro ? formatMaterialsIntro(item?.materials).length : 0;
    const totalLen = introLen + coreText.length + (hasMaterialsIntro && coreText ? 2 : 0);
    const needsTrunc = totalLen > BODY_TRUNC_LEN;
    const coreMax = Math.max(0, BODY_TRUNC_LEN - introLen - (hasMaterialsIntro && coreText ? 2 : 0));
    const displayCore =
        needsTrunc && !expanded && coreText.length > coreMax
            ? `${coreText.slice(0, coreMax)}\u2026`
            : coreText;
    const showBody = hasMaterialsIntro || displayCore.length > 0;

    return (
        <div className="conseil-card-text">
            {item?.title && (
                <h3 className="conseil-card-text__title">{item.title}</h3>
            )}

            <ConseilCardFactsStrip item={item} />

            {showSummary && (
                <p className="conseil-card-text__summary">{summary}</p>
            )}

            {showBody && (
                <div className="conseil-card-text__body-wrap">
                    <p className="conseil-card-text__body">
                        {hasMaterialsIntro && <ConseilMaterialsIntro materials={item?.materials} />}
                        {hasMaterialsIntro && displayCore && (
                            <>
                                <br />
                                <br />
                            </>
                        )}
                        {displayCore}
                    </p>
                    {needsTrunc && onToggleExpand && (
                        <button
                            type="button"
                            className="conseil-card-text__expand"
                            onClick={onToggleExpand}
                        >
                            {expanded ? "Voir moins" : "Lire la suite"}
                        </button>
                    )}
                </div>
            )}

            {!showBody && !showSummary && !item?.title && (
                <p className="conseil-card-text__empty">Aucun contenu texte.</p>
            )}
        </div>
    );
}
