const STORAGE_KEY = "uc_dismissed_conseil_material_suggestions";

export function materialSuggestionKey(label) {
    return String(label || "").trim().toLowerCase();
}

function normalizeKey(label) {
    return materialSuggestionKey(label);
}

export function loadDismissedConseilMaterialSuggestions() {
    if (typeof window === "undefined") return new Set();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set((Array.isArray(arr) ? arr : []).map(normalizeKey).filter(Boolean));
    } catch {
        return new Set();
    }
}

export function dismissConseilMaterialSuggestion(label) {
    if (typeof window === "undefined") return;
    const key = normalizeKey(label);
    if (!key) return;
    const set = loadDismissedConseilMaterialSuggestions();
    set.add(key);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/** Suggestions affichées sur Paramètres → Configuration (hors refus mémorisés via « Non »). */
export function filterVisibleConseilMaterialSuggestions(suggestions, dismissedSet) {
    return (suggestions || []).filter((label) => {
        const k = normalizeKey(label);
        return k && !dismissedSet.has(k);
    });
}
