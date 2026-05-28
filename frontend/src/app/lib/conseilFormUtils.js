import { EMPTY_CONSEIL_FORM, CONSEIL_AUDIENCES, MAX_CONSEIL_PHOTOS } from "./conseilConstants";
import { parseEstimatedTimeValue, validateEstimatedTimeForm } from "./conseilEstimatedTime";

function normalizeTargetAudience(audiences) {
    const clean = [];
    const seen = new Set();
    for (const it of audiences || []) {
        const s = String(it).trim();
        if (!s || s === "Artisans" || seen.has(s) || !CONSEIL_AUDIENCES.includes(s)) continue;
        seen.add(s);
        clean.push(s);
    }
    if (clean.includes("Tous")) return ["Tous"];
    return clean;
}

export function itemToConseilForm(item) {
    if (!item) return { ...EMPTY_CONSEIL_FORM };
    let scheduled = "";
    if (item.scheduledPublishAt) {
        try {
            const d = new Date(item.scheduledPublishAt);
            if (!Number.isNaN(d.getTime())) {
                scheduled = d.toISOString().slice(0, 16);
            }
        } catch {
            scheduled = "";
        }
    }
    const tools = (item.tools || []).length
        ? item.tools.map((t, i) => ({
            name: t.name || "",
            description: t.description || "",
            imageUrl: t.imageUrl || "",
            sortOrder: t.sortOrder ?? i + 1,
        }))
        : [];
    const photos = Array.isArray(item.photos) && item.photos.length
        ? item.photos.map((p) => String(p).trim()).filter(Boolean)
        : (item.imageUrl ? [String(item.imageUrl).trim()] : []);
    const coverIdx = photos.findIndex((p) => p === String(item.imageUrl || "").trim());
    return {
        title: item.title || "",
        summary: item.summary || "",
        body: item.body || "",
        status: item.status || "brouillon",
        imageUrl: item.imageUrl || photos[0] || "",
        photos,
        coverIndex: coverIdx >= 0 ? coverIdx : 0,
        externalUrl: item.externalUrl || "",
        category: item.category || "",
        targetAudience: normalizeTargetAudience(item.targetAudience),
        difficultyLevel: item.difficultyLevel || "",
        estimatedTimeValue: item.estimatedTimeValue != null && item.estimatedTimeValue > 0
            ? String(item.estimatedTimeValue)
            : "",
        estimatedTimeUnit: item.estimatedTimeUnit || "heure",
        materials: Array.isArray(item.materials) ? [...item.materials] : [],
        safetyTips: item.safetyTips || "",
        tags: Array.isArray(item.tags) ? [...item.tags] : [],
        scheduledPublishAt: scheduled,
        tools,
    };
}

export function validateConseilForm(form) {
    if (!form.title?.trim()) return "Le titre est requis.";
    if (!form.body?.trim()) return "Le contenu est requis.";
    if (!form.category?.trim()) return "La catégorie est requise.";
    if (!form.targetAudience?.length) return "Le public visé est requis.";
    if (!form.difficultyLevel?.trim()) return "Le niveau de difficulté est requis.";
    const timeErr = validateEstimatedTimeForm(form.estimatedTimeValue, form.estimatedTimeUnit);
    if (timeErr) return timeErr;
    for (const m of form.materials || []) {
        if (m && m.length > 120) {
            return "Chaque matériau ne doit pas dépasser 120 caractères.";
        }
    }
    if (!form.status?.trim()) return "Le statut est requis.";
    if (form.summary?.trim() && form.summary.trim().length > 250) {
        return "Le résumé court ne doit pas dépasser 250 caractères.";
    }
    for (let i = 0; i < (form.tools || []).length; i++) {
        const t = form.tools[i];
        const hasAny = (t.name || t.description || t.imageUrl)?.trim();
        if (hasAny && !t.name?.trim()) {
            return `Le nom de l'outil ${i + 1} est requis.`;
        }
    }
    return "";
}

export function buildConseilPayload(form) {
    const photos = (form.photos || [])
        .map((p) => String(p).trim())
        .filter(Boolean)
        .slice(0, MAX_CONSEIL_PHOTOS);
    const coverIndex = photos.length
        ? Math.min(Math.max(0, form.coverIndex ?? 0), photos.length - 1)
        : 0;
    const coverUrl = photos.length ? photos[coverIndex] : "";

    const tools = (form.tools || [])
        .filter((t) => t.name?.trim())
        .map((t, i) => ({
            name: t.name.trim(),
            description: (t.description || "").trim(),
            imageUrl: (t.imageUrl || "").trim(),
            sortOrder: t.sortOrder || i + 1,
        }));
    let scheduledPublishAt = "";
    if (form.scheduledPublishAt) {
        const d = new Date(form.scheduledPublishAt);
        if (!Number.isNaN(d.getTime())) {
            scheduledPublishAt = d.toISOString();
        }
    }
    let status = form.status;
    if (scheduledPublishAt) {
        const sched = new Date(scheduledPublishAt);
        if (!Number.isNaN(sched.getTime()) && sched.getTime() > Date.now() && status === "brouillon") {
            status = "publie";
        }
    }
    return {
        title: form.title.trim(),
        body: form.body.trim(),
        summary: (form.summary || "").trim(),
        status,
        imageUrl: coverUrl,
        photos,
        externalUrl: "",
        category: form.category,
        targetAudience: normalizeTargetAudience(form.targetAudience),
        difficultyLevel: form.difficultyLevel,
        estimatedTimeValue: parseEstimatedTimeValue(form.estimatedTimeValue),
        estimatedTimeUnit: (form.estimatedTimeUnit || "").trim(),
        materials: form.materials || [],
        safetyTips: (form.safetyTips || "").trim(),
        tags: form.tags || [],
        scheduledPublishAt,
        tools,
        type: "conseil",
    };
}

export function appendConseilFiltersToUrl(baseUrl, filters) {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.material) params.set("material", filters.material);
    if (filters.audience) params.set("audience", filters.audience);
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString();
    return qs ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${qs}` : baseUrl;
}
