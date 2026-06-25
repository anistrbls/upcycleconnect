"use client";

import { ConseilCardFactsStrip } from "./ConseilMetaDisplay";
import ConseilMaterialsIntro from "./ConseilMaterialsIntro";
import {
    formatMaterialsIntro,
    getConseilFeedCoreText,
} from "../../lib/conseilMaterialsFormat";

/**
 * Bloc texte structuré pour les cartes conseil (feed).
 * Ordre : titre → résumé → pastilles (catégorie, niveau, public…) → corps.
 * @param {boolean} preferFullBody — admin : corps complet sous le résumé
 */
const BODY_TRUNC_LEN = 300;

export default function ConseilFeedCardText({
    item,
    expanded = false,
    onToggleExpand,
    preferFullBody = false,
}) {
    const summary = (item?.summary || "").trim();
    const hasMaterialsIntro = formatMaterialsIntro(item?.materials).length > 0;
    const coreText = getConseilFeedCoreText(item, { preferFullBody });
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
                <h3 className="conseil-card-text__title" data-i18n-user-content="true">{item.title}</h3>
            )}

            {summary && (
                <p className="conseil-card-text__summary" data-i18n-user-content="true">{summary}</p>
            )}

            <ConseilCardFactsStrip item={item} />

            {showBody && (
                <div className="conseil-card-text__body-wrap">
                    <p className="conseil-card-text__body" data-i18n-user-content="true">
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

            {!showBody && !summary && !item?.title && (
                <p className="conseil-card-text__empty">Aucun contenu texte.</p>
            )}
        </div>
    );
}
