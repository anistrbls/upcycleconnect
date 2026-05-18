const TARGET_AUDIENCE_LABELS = {
    tous: "Pour tous",
    particulier: "Pour les particuliers",
    professionnel: "Pour les professionnels",
};

export const formatTargetAudienceLabel = (value) => {
    const key = String(value || "tous").toLowerCase().trim();
    return TARGET_AUDIENCE_LABELS[key] || `Pour les ${key}`;
};

export const formatDateFR = (rawDate) => {
    if (!rawDate) {
        return "-";
    }

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleDateString("fr-FR");
};

export const formatDateTimeFR = (rawDate) => {
    if (!rawDate) {
        return "-";
    }
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }
    return parsed.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const toDateTimeInputValue = (rawValue) => {
    if (!rawValue) {
        return "";
    }
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }
    const pad = (value) => String(value).padStart(2, "0");
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};
