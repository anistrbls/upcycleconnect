export const CONSEIL_LIST_ALL = "/conseils/tous-conseils";
export const CONSEIL_LIST_PENDING = "/conseils/en-attente";
export const CONSEIL_LIST_FAVORIS = "/conseils/favoris";
export const SALARIE_CONSEIL_LIST = "/salarie-contenu/conseils";
export const SALARIE_CONSEIL_DRAFTS = "/salarie-contenu/brouillons";

/** Page détail conseil (admin, particulier, professionnel). */
export function conseilDetailHref(id, backTo = CONSEIL_LIST_ALL) {
    if (!id) return backTo || CONSEIL_LIST_ALL;
    const q = backTo ? `?from=${encodeURIComponent(backTo)}` : "";
    return `/conseils/detail/${id}${q}`;
}

/** Page détail conseil (espace salarié). */
export function salarieConseilDetailHref(id, backTo = SALARIE_CONSEIL_LIST) {
    if (!id) return backTo || SALARIE_CONSEIL_LIST;
    const q = backTo ? `?from=${encodeURIComponent(backTo)}` : "";
    return `/salarie-contenu/conseils/detail/${id}${q}`;
}

export function safeBackPath(from, fallback) {
    if (!from || typeof from !== "string") return fallback;
    if (!from.startsWith("/") || from.startsWith("//")) return fallback;
    return from;
}
