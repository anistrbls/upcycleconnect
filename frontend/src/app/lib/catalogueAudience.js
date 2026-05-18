/** Filtre query `targetAudience` pour GET /api/services selon le rôle. */
export function getCatalogueTargetAudience(role) {
    if (role === "particulier") return "particulier";
    if (role === "professionnel") return "professionnel";
    return "";
}

export function buildServicesCatalogueUrl(basePath, role) {
    const audience = getCatalogueTargetAudience(role);
    if (!audience) return basePath;
    const sep = basePath.includes("?") ? "&" : "?";
    return `${basePath}${sep}targetAudience=${encodeURIComponent(audience)}`;
}

/** Filtre côté client (filet de sécurité si l'API ne filtre pas). */
export function filterServicesForRole(services, role) {
    if (!Array.isArray(services)) return [];
    if (role !== "particulier" && role !== "professionnel") return services;
    return services.filter((s) => {
        const aud = s.targetAudience || "tous";
        return aud === "tous" || aud === role;
    });
}
