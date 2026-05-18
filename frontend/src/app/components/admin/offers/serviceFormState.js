/** Construit l'état initial du formulaire prestation à partir d'une prestation API. */
export function buildServiceFormInitialData(service) {
    if (!service) return null;

    const photos = [];
    if (service.imageUrl) photos.push(service.imageUrl);
    if (Array.isArray(service.photos)) {
        service.photos.forEach((p) => {
            if (p && !photos.includes(p)) photos.push(p);
        });
    }

    const bookingMode = service.bookingMode || service.type || (service.isBookable ? "booking" : "request");
    const description = String(
        service.detailedDescription || service.description || service.shortDescription || "",
    ).trim();

    const employeeIds = Array.isArray(service.employeeIds)
        ? service.employeeIds.map((id) => Number(id)).filter((id) => id > 0)
        : Array.isArray(service.providers)
          ? service.providers.map((p) => Number(p.id)).filter((id) => id > 0)
          : [];

    return {
        id: service.id,
        name: service.name || "",
        shortDescription: service.shortDescription || "",
        description,
        categoryId: String(service.categoryId ?? ""),
        type: bookingMode,
        price: String(service.price ?? 0),
        durationMinutes: String(service.durationMinutes ?? 60),
        targetAudience: service.targetAudience || "tous",
        imageUrl: service.imageUrl || "",
        photos,
        status: service.status || "brouillon",
        employeeIds,
    };
}

/** Payload API pour créer / dupliquer une prestation depuis un objet service. */
export function buildServiceCreatePayload(service, overrides = {}) {
    const bookingMode = service.bookingMode || service.type || (service.isBookable ? "booking" : "request");
    const employeeIds = Array.isArray(service.employeeIds)
        ? service.employeeIds.map((id) => Number(id)).filter((id) => id > 0)
        : Array.isArray(service.providers)
          ? service.providers.map((p) => Number(p.id)).filter((id) => id > 0)
          : [];

    return {
        name: service.name || "",
        shortDescription: service.shortDescription || "",
        description: String(service.detailedDescription || service.description || "").trim(),
        categoryId: Number(service.categoryId),
        type: bookingMode,
        price: Number(service.price) || 0,
        durationMinutes: Number(service.durationMinutes) || 60,
        targetAudience: service.targetAudience || "tous",
        imageUrl: service.imageUrl || "",
        photos: Array.isArray(service.photos) ? service.photos : [],
        status: service.status || "brouillon",
        employeeIds,
        ...overrides,
    };
}

export function getCoverIndexForService(service, photos) {
    if (!photos?.length) return 0;
    if (service?.imageUrl) {
        const idx = photos.indexOf(service.imageUrl);
        if (idx >= 0) return idx;
    }
    return 0;
}
