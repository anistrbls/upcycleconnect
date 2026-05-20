/** Visibilité des conseils publiés selon le public visé et le rôle connecté. */

export function conseilVisibleForRole(item, role) {
    if (!item) return false;
    if (role === "admin" || role === "salarie") return true;
    const audiences = item.targetAudience || [];
    if (!audiences.length) return true;
    if (audiences.includes("Tous")) return true;
    if (role === "particulier") return audiences.includes("Particuliers");
    if (role === "professionnel") return audiences.includes("Professionnels");
    return true;
}

export function filterConseilsForRole(items, role) {
    if (!Array.isArray(items)) return [];
    if (role === "admin" || role === "salarie") return items;
    return items.filter((item) => conseilVisibleForRole(item, role));
}
