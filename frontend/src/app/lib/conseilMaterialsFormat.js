/** Phrase d’intro matériaux pour l’affichage dans la description (cartes conseil). */
export function formatMaterialsIntro(materials) {
    const items = (materials || []).map((m) => String(m).trim()).filter(Boolean);
    if (!items.length) return "";

    if (items.length === 1) {
        return `Vous aurez besoin de ${items[0]}.`;
    }
    if (items.length === 2) {
        return `Vous aurez besoin de ${items[0]} et de ${items[1]}.`;
    }
    const last = items[items.length - 1];
    const rest = items.slice(0, -1).join(", ");
    return `Vous aurez besoin de ${rest} et de ${last}.`;
}

/** Texte principal d’une carte feed (sans l’intro matériaux). */
export function getConseilFeedCoreText(item, { preferFullBody = true, bodyOnly = false } = {}) {
    if (preferFullBody) {
        return (item?.body || "").trim();
    }
    if (bodyOnly) {
        return (item?.body || "").trim();
    }
    return (item?.displayBody || item?.summary || item?.body || "").trim();
}

/** Corps affiché dans une carte feed (intro matériaux + texte, texte brut). */
export function buildConseilFeedDisplayText(item, options = {}) {
    const intro = formatMaterialsIntro(item?.materials);
    const core = getConseilFeedCoreText(item, options);
    if (!intro) return core;
    if (!core) return intro;
    return `${intro}\n\n${core}`;
}
