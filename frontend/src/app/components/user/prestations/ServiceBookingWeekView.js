"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { fieldStyle, labelStyle } from "../../../lib/styles";
import DaySlotsRow from "./DaySlotsRow";

function getStartOfWeek(date) {
    const next = new Date(date);
    const day = next.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    next.setDate(next.getDate() - distanceFromMonday);
    next.setHours(0, 0, 0, 0);
    return next;
}

function toDayKey(date) {
    const d = new Date(date);
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    return `${Y}-${M}-${D}`;
}

function formatWeekRange(weekStart) {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts = { day: "numeric", month: "short" };
    return `${weekStart.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })}`;
}

function formatSlotLabel(iso) {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPrice(service) {
    const price = Number(service?.price || 0);
    if (price <= 0) return "Gratuit";
    return `${price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export default function ServiceBookingWeekView({ serviceId }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [service, setService] = useState(null);
    const [loadingService, setLoadingService] = useState(true);
    const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
    const [slots, setSlots] = useState([]);
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState("");
    const [assignedProviderCount, setAssignedProviderCount] = useState(null);
    const [slotsHint, setSlotsHint] = useState("");

    const [selectedSlot, setSelectedSlot] = useState(null);
    const [availableProviders, setAvailableProviders] = useState([]);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [message, setMessage] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const calendarDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [weekStart]);

    const slotsByDay = useMemo(() => {
        const map = new Map();
        slots.forEach((slot) => {
            const key = toDayKey(new Date(slot.scheduledAt));
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(slot);
        });
        map.forEach((list) => list.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)));
        return map;
    }, [slots]);

    const loadService = useCallback(async () => {
        setLoadingService(true);
        try {
            const res = await fetch(apiUrl(`/services/${serviceId}`), { headers: buildAuthHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Prestation introuvable.");
            setService(data);
        } catch (err) {
            setService(null);
            setSlotsError(String(err?.message || "Erreur de chargement."));
        } finally {
            setLoadingService(false);
        }
    }, [serviceId]);

    const loadWeekSlots = useCallback(async () => {
        if (!serviceId) return;
        setLoadingSlots(true);
        setSlotsError("");
        try {
            const weekKey = toDayKey(weekStart);
            const res = await fetch(apiUrl(`/services/${serviceId}/week-slots?weekStart=${weekKey}`), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Impossible de charger les créneaux.");
            setSlots(data.slots ?? []);
            setDurationMinutes(data.durationMinutes ?? 60);
            setAssignedProviderCount(
                typeof data.assignedProviderCount === "number" ? data.assignedProviderCount : null,
            );
            setSlotsHint(data.hint ? String(data.hint) : "");
        } catch (err) {
            setSlots([]);
            setSlotsError(String(err?.message || "Erreur de chargement des créneaux."));
        } finally {
            setLoadingSlots(false);
        }
    }, [serviceId, weekStart]);

    useEffect(() => {
        loadService();
    }, [loadService]);

    useEffect(() => {
        if (service) loadWeekSlots();
    }, [service, loadWeekSlots]);

    const loadProvidersForSlot = useCallback(async (scheduledAt) => {
        setLoadingProviders(true);
        setAvailableProviders([]);
        setSelectedEmployeeId(null);
        try {
            const res = await fetch(
                apiUrl(`/services/${serviceId}/availability?scheduledAt=${encodeURIComponent(scheduledAt)}`),
                { headers: buildAuthHeaders() },
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Impossible de charger les experts.");
            setAvailableProviders(data.available ?? []);
        } catch (err) {
            setSubmitError(String(err?.message || "Erreur de disponibilité."));
        } finally {
            setLoadingProviders(false);
        }
    }, [serviceId]);

    const handleSelectSlot = (slot) => {
        setSelectedSlot(slot);
        setSubmitError("");
        loadProvidersForSlot(slot.scheduledAt);
    };

    const handleConfirm = async () => {
        if (!selectedSlot) {
            setSubmitError("Sélectionnez un créneau.");
            return;
        }
        if (!selectedEmployeeId) {
            setSubmitError("Choisissez un expert disponible.");
            return;
        }

        setIsSubmitting(true);
        setSubmitError("");
        try {
            const createRes = await fetch(apiUrl("/bookings"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    serviceId: Number(serviceId),
                    scheduledAt: selectedSlot.scheduledAt,
                    employeeId: selectedEmployeeId,
                    message: message.trim(),
                    bookingType: "booking",
                }),
            });
            const createData = await createRes.json();
            if (!createRes.ok) throw new Error(createData?.error || "Erreur lors de la réservation.");

            const booking = createData.booking ?? createData;
            const requiresPayment = Boolean(createData.requiresPayment);

            if (requiresPayment && booking?.id) {
                const checkoutRes = await fetch(apiUrl(`/bookings/${booking.id}/checkout`), {
                    method: "POST",
                    headers: buildAuthHeaders(),
                });
                const checkoutData = await checkoutRes.json();
                if (!checkoutRes.ok) throw new Error(checkoutData?.error || "Erreur lors du paiement.");
                if (checkoutData.url) {
                    window.location.href = checkoutData.url;
                    return;
                }
            }

            setSuccessMessage("Votre réservation est confirmée !");
            setSelectedSlot(null);
            setSelectedEmployeeId(null);
            setMessage("");
            await loadWeekSlots();
        } catch (err) {
            setSubmitError(String(err?.message || "Erreur lors de la confirmation."));
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const stripe = searchParams.get("stripe");
        const sessionId = searchParams.get("session_id");
        if (stripe !== "success" || !sessionId) return;

        (async () => {
            try {
                const res = await fetch(apiUrl(`/bookings/confirm-payment?session_id=${encodeURIComponent(sessionId)}`), {
                    headers: buildAuthHeaders(),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Paiement non confirmé.");
                setSuccessMessage("Paiement reçu — votre réservation est confirmée !");
                router.replace(`/prestations/catalogue/${serviceId}/reserver`);
                await loadWeekSlots();
            } catch (err) {
                setSubmitError(String(err?.message || "Erreur de confirmation du paiement."));
            }
        })();
    }, [searchParams, serviceId, router, loadWeekSlots]);

    if (loadingService) {
        return <p style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Chargement…</p>;
    }

    if (!service) {
        return (
            <div>
                <p style={{ color: "#a23b3b" }}>{slotsError || "Prestation introuvable."}</p>
                <button type="button" className="action-cta task-action-btn" onClick={() => router.push(`/prestations/catalogue/${serviceId}`)}>
                    Retour
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: "100%", animation: "fadeIn 0.4s ease-out" }}>
            <button
                type="button"
                onClick={() => router.push(`/prestations/catalogue/${serviceId}`)}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "0.88rem",
                    marginBottom: "1.25rem",
                    padding: 0,
                }}
            >
                <ArrowLeft size={16} /> Retour à la prestation
            </button>

            <header style={{ marginBottom: "1.5rem" }}>
                <p className="activities-label">Réservation</p>
                <h1 style={{ fontSize: "2rem", fontWeight: 500, margin: "0.35rem 0", letterSpacing: "-0.02em" }}>
                    {service.name}
                </h1>
                <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
                    {formatPrice(service)} · créneaux de {durationMinutes} min · {formatWeekRange(weekStart)}
                </p>
                <p style={{ color: "var(--text-muted)", margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
                    Parcourez les créneaux jour par jour, puis sélectionnez une carte pour continuer.
                </p>
            </header>

            {successMessage ? (
                <div className="panel" style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem", borderRadius: "16px", background: "rgba(198, 255, 0, 0.2)", fontWeight: 600 }}>
                    {successMessage}
                </div>
            ) : null}

            {searchParams.get("stripe") === "cancel" ? (
                <div className="panel" style={{ marginBottom: "1.25rem", padding: "1rem", borderRadius: "16px", color: "var(--text-muted)" }}>
                    Paiement annulé. Vous pouvez choisir un autre créneau ou réessayer.
                </div>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                        type="button"
                        className="action-btn"
                        onClick={() => {
                            const prev = new Date(weekStart);
                            prev.setDate(prev.getDate() - 7);
                            setWeekStart(getStartOfWeek(prev));
                            setSelectedSlot(null);
                        }}
                        aria-label="Semaine précédente"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem", minWidth: "200px", textAlign: "center" }}>
                        {formatWeekRange(weekStart)}
                    </span>
                    <button
                        type="button"
                        className="action-btn"
                        onClick={() => {
                            const next = new Date(weekStart);
                            next.setDate(next.getDate() + 7);
                            setWeekStart(getStartOfWeek(next));
                            setSelectedSlot(null);
                        }}
                        aria-label="Semaine suivante"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
                <button type="button" className="action-btn" onClick={() => setWeekStart(getStartOfWeek(new Date()))}>
                    Aujourd&apos;hui
                </button>
            </div>

            <div
                className="panel"
                style={{
                    borderRadius: "20px",
                    overflow: "hidden",
                    border: "1px solid rgba(35,59,61,0.1)",
                    marginBottom: "1.5rem",
                }}
            >
                {slotsError ? (
                    <p style={{ padding: "1rem 1.25rem", margin: 0, textAlign: "center", color: "var(--state-critical)", fontSize: "0.88rem" }}>
                        {slotsError}
                    </p>
                ) : null}

                {!slotsError && slotsHint ? (
                    <p
                        style={{
                            padding: "0.85rem 1.25rem",
                            margin: 0,
                            fontSize: "0.85rem",
                            color: assignedProviderCount === 0 ? "var(--state-critical)" : "var(--text-muted)",
                            borderBottom: "1px solid rgba(35,59,61,0.08)",
                            fontWeight: assignedProviderCount === 0 ? 600 : 500,
                        }}
                    >
                        {slotsHint}
                    </p>
                ) : null}

                {loadingSlots ? (
                    <p style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-muted)", margin: 0 }}>
                        Mise à jour des créneaux…
                    </p>
                ) : null}

                {!slotsError && !loadingSlots ? (
                    <div style={{ paddingBottom: "0.5rem" }}>
                        {calendarDays.map((dayDate) => {
                            const dayKey = toDayKey(dayDate);
                            const daySlots = slotsByDay.get(dayKey) || [];
                            return (
                                <DaySlotsRow
                                    key={dayKey}
                                    dayDate={dayDate}
                                    slots={daySlots}
                                    selectedSlot={selectedSlot}
                                    onSelectSlot={handleSelectSlot}
                                    durationMinutes={durationMinutes}
                                />
                            );
                        })}
                    </div>
                ) : null}
            </div>

            {selectedSlot ? (
                <div className="panel" style={{ borderRadius: "24px", padding: "1.5rem", display: "grid", gap: "1.25rem" }}>
                    <div>
                        <span
                            style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "var(--text-muted)",
                            }}
                        >
                            Créneau sélectionné
                        </span>
                        <p style={{ margin: "0.35rem 0 0", fontWeight: 600, fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Clock size={16} /> {formatSlotLabel(selectedSlot.scheduledAt)}
                        </p>
                    </div>

                    <div>
                        <label style={labelStyle}>Expert disponible *</label>
                        {loadingProviders ? (
                            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement des experts…</p>
                        ) : availableProviders.length === 0 ? (
                            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                                Aucun expert disponible sur ce créneau.
                            </p>
                        ) : (
                            <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
                                {availableProviders.map((p) => {
                                    const id = Number(p.id);
                                    const selected = selectedEmployeeId === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setSelectedEmployeeId(id)}
                                            style={{
                                                ...fieldStyle,
                                                textAlign: "left",
                                                cursor: "pointer",
                                                fontWeight: selected ? 700 : 500,
                                                border: selected ? "2px solid var(--forest-deep)" : "none",
                                                background: selected ? "rgba(198, 255, 0, 0.25)" : fieldStyle.background,
                                            }}
                                        >
                                            {p.name || `Expert #${id}`}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <label style={labelStyle}>
                        Message (optionnel)
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            placeholder="Précisions pour l'expert…"
                            style={{ ...fieldStyle, resize: "vertical", minHeight: "5rem" }}
                        />
                    </label>

                    {submitError ? <p style={{ color: "var(--state-critical)", margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>{submitError}</p> : null}

                    <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className="action-cta task-action-btn"
                            disabled={isSubmitting || !selectedEmployeeId}
                            onClick={handleConfirm}
                            style={{ opacity: isSubmitting || !selectedEmployeeId ? 0.7 : 1 }}
                        >
                            {isSubmitting
                                ? "Traitement…"
                                : Number(service.price) > 0
                                  ? "Confirmer et payer"
                                  : "Confirmer la réservation"}
                        </button>
                        <button
                            type="button"
                            className="action-btn"
                            onClick={() => {
                                setSelectedSlot(null);
                                setSelectedEmployeeId(null);
                                setSubmitError("");
                            }}
                        >
                            Changer de créneau
                        </button>
                    </div>
                </div>
            ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                    Sélectionnez une carte créneau pour afficher le formulaire de confirmation.
                </p>
            )}
        </div>
    );
}
