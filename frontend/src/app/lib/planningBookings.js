/** Transforme les réservations API en entrées affichables sur le planning. */
export function mapBookingsForPlanning(bookings = [], services = []) {
    return (bookings || [])
        .filter((b) => b.status !== "cancelled" && (b.bookingType || "booking") === "booking")
        .map((b) => {
            const svc = services.find((s) => Number(s.id) === Number(b.serviceId));
            const mins = Number(svc?.durationMinutes) || 60;
            const start = new Date(b.bookingDate);
            const end = new Date(start.getTime() + mins * 60 * 1000);
            return {
                ...b,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
            };
        });
}

export function getPlanningItemLabel(item) {
    if (item._type === "event") return item.titre || item.name || "Événement";
    if (item._type === "unavail") return item.reason || "Indisponibilité";
    if (item._type === "booking") {
        const name = item.serviceName || "Prestation";
        return item.userName ? `${name} · ${item.userName}` : name;
    }
    return "Créneau";
}

export function getPlanningItemStart(item) {
    if (item._type === "event") return new Date(item.dateDebut);
    return new Date(item.startTime);
}

export function getPlanningItemEnd(item) {
    if (item._type === "event") return new Date(item.dateFin);
    return new Date(item.endTime);
}

export function getPlanningItemStyle(type) {
    if (type === "event") return { bg: "#E5FFBC", panel: "#fdfefb" };
    if (type === "booking") return { bg: "#FEF3C7", panel: "#fffbeb" };
    if (type === "unavail") return { bg: "#FEE2E2", panel: "#fffafa" };
    return { bg: "#EAF4FF", panel: "#fbfdff" };
}
