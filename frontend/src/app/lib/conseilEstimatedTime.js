/** Unités de temps estimé (codes API alignés sur le backend). */
export const CONSEIL_TIME_UNITS = [
    { value: "minute", label: "Minutes" },
    { value: "heure", label: "Heures" },
    { value: "demi_journee", label: "Demi-journée" },
    { value: "jour", label: "Jours" },
    { value: "semaine", label: "Semaines" },
    { value: "mois", label: "Mois" },
    { value: "annee", label: "Années" },
];

export function parseEstimatedTimeValue(raw) {
    if (raw === "" || raw === null || raw === undefined) return null;
    const n = Number.parseFloat(String(raw).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

export function validateEstimatedTimeForm(value, unit) {
    const hasValue = value !== "" && value !== null && value !== undefined;
    const hasUnit = Boolean(unit?.trim());
    if (!hasValue && !hasUnit) return "";
    if (!hasValue) return "Indiquez une durée (nombre).";
    if (!hasUnit) return "Choisissez une unité.";
    const n = parseEstimatedTimeValue(value);
    if (n === null) return "Durée invalide (nombre positif requis).";
    if (n > 1_000_000) return "Durée trop élevée.";
    return "";
}

export function estimatedTimeDisplayLabel(item) {
    if (!item) return "";
    if (item.estimatedTime) return item.estimatedTime;
    if (item.estimatedTimeMinutes > 0 && item.estimatedTimeValue && item.estimatedTimeUnit) {
        const unitLabel = CONSEIL_TIME_UNITS.find((u) => u.value === item.estimatedTimeUnit)?.label || item.estimatedTimeUnit;
        return `${item.estimatedTimeValue} ${unitLabel}`.toLowerCase();
    }
    return "";
}
