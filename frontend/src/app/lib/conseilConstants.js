export const CONSEIL_AUDIENCES = [
    "Particuliers",
    "Professionnels",
    "Tous",
];

export const CONSEIL_DIFFICULTIES = [
    "Débutant",
    "Intermédiaire",
    "Avancé",
];

export const CONSEIL_STATUSES = [
    { value: "brouillon", label: "Brouillon" },
    { value: "en_attente", label: "En attente de validation" },
    { value: "publie", label: "Publié" },
    { value: "archive", label: "Archivé" },
];

export const STATUS_LABELS = {
    brouillon: "Brouillon",
    en_attente: "En attente",
    publie: "Publié",
    archive: "Archivé",
};

export const STATUS_COLORS = {
    brouillon: { bg: "#E6EDEE", color: "#556" },
    en_attente: { bg: "#FFF3E0", color: "#A56A2A" },
    publie: { bg: "#E5FFBC", color: "#2E7D32" },
    archive: { bg: "#F0F0F0", color: "#888" },
};

export const EMPTY_CONSEIL_FORM = {
    title: "",
    summary: "",
    body: "",
    status: "brouillon",
    imageUrl: "",
    photos: [],
    coverIndex: 0,
    externalUrl: "",
    category: "",
    targetAudience: [],
    difficultyLevel: "",
    estimatedTimeValue: "",
    estimatedTimeUnit: "heure",
    materials: [],
    safetyTips: "",
    tags: [],
    scheduledPublishAt: "",
    tools: [],
};

export function emptyTool(sortOrder = 1) {
    return { name: "", description: "", imageUrl: "", sortOrder };
}

export const MAX_CONSEIL_PHOTOS = 10;
