"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, Clock, Tag } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { formatTargetAudienceLabel } from "../../../lib/formatters";
import { fieldStyle, labelStyle } from "../../../lib/styles";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";

function formatPrice(service) {
    const price = Number(service?.price || 0);
    if (price <= 0) return "Gratuit";
    return `${price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

const sectionLabel = {
    fontSize: "0.72rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    margin: "0 0 1rem",
    display: "block",
};

const arrowBtn = (side) => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: "12px",
    padding: "8px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(8px)",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
});

const actionBtn = (tone = "neutral") => ({
    padding: "0.82rem 1rem",
    borderRadius: "999px",
    border: tone === "neutral" ? "1px solid rgba(35,59,61,0.12)" : "none",
    background: tone === "primary" ? "var(--forest-deep)" : tone === "danger" ? "var(--state-critical-bg)" : "transparent",
    color: tone === "primary" ? "#fff" : tone === "danger" ? "var(--state-critical)" : "var(--text-main)",
    fontFamily: "inherit",
    fontSize: "0.88rem",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
});

function formatNextSlotLabel(rawDate) {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return "-";
    const label = parsed.toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function collectPhotos(service) {
    const list = [];
    if (service?.imageUrl) list.push(service.imageUrl);
    if (Array.isArray(service?.photos)) {
        service.photos.forEach((p) => {
            if (p && !list.includes(p)) list.push(p);
        });
    }
    return list;
}

export default function ServiceCatalogueDetailView({ serviceId, readOnly = false }) {
    const router = useRouter();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [activePhoto, setActivePhoto] = useState(0);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [bookingError, setBookingError] = useState("");
    const [myBookings, setMyBookings] = useState([]);

    const photos = useMemo(() => (service ? collectPhotos(service) : []), [service]);
    const bookingMode = service?.bookingMode || service?.type || (service?.isBookable ? "booking" : "request");
    const bodyText = (service?.detailedDescription || service?.description || "").trim();
    const descriptionParts = bodyText ? bodyText.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean) : [];

    const loadService = useCallback(async () => {
        if (!serviceId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setNotFound(false);
        setFetchError("");
        try {
            const res = await fetch(apiUrl(`/services/${serviceId}`), { headers: buildAuthHeaders() });
            if (res.status === 404) {
                setService(null);
                setNotFound(true);
                return;
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Impossible de charger la prestation.");
            setService(data);
            setActivePhoto(0);
        } catch (err) {
            setService(null);
            setFetchError(String(err?.message || "Erreur de chargement."));
        } finally {
            setLoading(false);
        }
    }, [serviceId]);

    const loadMyBookings = useCallback(async () => {
        try {
            const res = await fetch(apiUrl("/bookings/mine"), { headers: buildAuthHeaders() });
            const data = await res.json();
            if (res.ok) setMyBookings(data.items ?? []);
        } catch {
            setMyBookings([]);
        }
    }, []);

    useEffect(() => {
        loadService();
    }, [loadService]);

    useEffect(() => {
        if (!readOnly) loadMyBookings();
    }, [loadMyBookings, readOnly]);

    const serviceReservations = useMemo(() => {
        const sid = Number(serviceId);
        return myBookings.filter(
            (b) =>
                Number(b.serviceId) === sid &&
                (b.bookingType || "booking") === "booking" &&
                b.status !== "cancelled",
        );
    }, [myBookings, serviceId]);

    const nextUpcomingReservation = useMemo(() => {
        const now = Date.now();
        return [...serviceReservations]
            .filter((b) => {
                const t = new Date(b.bookingDate).getTime();
                return !Number.isNaN(t) && t >= now - 60_000;
            })
            .sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate))[0];
    }, [serviceReservations]);

    const hasExistingReservations = serviceReservations.length > 0;

    const prevPhoto = () => {
        if (photos.length <= 1) return;
        setActivePhoto((i) => (i - 1 + photos.length) % photos.length);
    };
    const nextPhoto = () => {
        if (photos.length <= 1) return;
        setActivePhoto((i) => (i + 1) % photos.length);
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setBookingError("");
        setSuccessMessage("");
        try {
            const res = await fetch(apiUrl("/bookings"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    serviceId: service.id,
                    message,
                    bookingType: "request",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi");
            setSuccessMessage("Votre demande a été envoyée avec succès !");
            setMessage("");
            setTimeout(() => {
                setShowRequestForm(false);
                setSuccessMessage("");
            }, 3000);
        } catch (err) {
            setBookingError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <p style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Chargement de la prestation…</p>;
    }

    if (notFound) {
        return (
            <div>
                <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>Prestation introuvable.</p>
                <button type="button" onClick={() => router.push("/prestations/catalogue")} style={actionBtn("primary")}>
                    Retour au catalogue
                </button>
            </div>
        );
    }

    if (fetchError || !service) {
        return (
            <div>
                <p style={{ color: "#a23b3b", marginBottom: "1rem" }}>{fetchError || "Prestation indisponible."}</p>
                <button type="button" onClick={() => router.push("/prestations/catalogue")} style={actionBtn("neutral")}>
                    Retour au catalogue
                </button>
            </div>
        );
    }

    const currentPhoto = photos[activePhoto];

    return (
        <div style={{ width: "100%", padding: "1rem 0 4rem", animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", paddingBottom: "0.9rem", borderBottom: "1px solid rgba(35,59,61,0.08)" }}>
                    <button
                        type="button"
                        onClick={() => router.push("/prestations/catalogue")}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.45rem",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            fontSize: "0.86rem",
                            fontFamily: "inherit",
                            fontWeight: "600",
                        }}
                    >
                        <ArrowLeft size={16} aria-hidden />
                        Catalogue
                    </button>
                    <span className="activities-label" style={{ margin: 0 }}>
                        Prestations{readOnly ? " · consultation" : ""}
                    </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(360px, 0.8fr)", gap: "1.5rem", alignItems: "stretch" }}>
                    <div style={{ background: "var(--black)", borderRadius: "28px", padding: "1rem", border: "1px solid rgba(18, 25, 26, 0.08)" }}>
                        <div style={{ borderRadius: "22px", overflow: "hidden", background: "#12191A", position: "relative" }}>
                                    <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
                            {currentPhoto ? (
                                previewLooksLikeVideo(currentPhoto) ? (
                                    <video
                                        src={currentPhoto}
                                        controls
                                        playsInline
                                        muted
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1, background: "#0a0f0f" }}
                                    />
                                ) : (
                                    <img
                                        src={currentPhoto}
                                        alt={service.name}
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}
                                    />
                                )
                            ) : (
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #2E7D6E 0%, #1a4d44 100%)", zIndex: 1 }} />
                            )}
                            <div style={{
                                position: "absolute",
                                inset: 0,
                                background: "linear-gradient(to top, rgba(10, 15, 15, 0.7) 0%, transparent 40%)",
                                pointerEvents: "none",
                                zIndex: 2,
                            }} />
                            {photos.length > 1 && (
                                <>
                                    <button type="button" onClick={prevPhoto} style={arrowBtn("left")} aria-label="Photo précédente">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button type="button" onClick={nextPhoto} style={arrowBtn("right")} aria-label="Photo suivante">
                                        <ChevronRight size={20} />
                                    </button>
                                    <div style={{
                                        position: "absolute",
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        padding: "1.2rem",
                                        display: "flex",
                                        overflowX: "auto",
                                        gap: "0.6rem",
                                        zIndex: 5,
                                    }}>
                                        {photos.map((p, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setActivePhoto(i)}
                                                style={{
                                                    border: i === activePhoto ? "2px solid white" : "1px solid rgba(255,255,255,0.16)",
                                                    padding: 0,
                                                    borderRadius: "14px",
                                                    overflow: "hidden",
                                                    cursor: "pointer",
                                                    minWidth: "64px",
                                                    width: "64px",
                                                    height: "64px",
                                                    flexShrink: 0,
                                                    opacity: i === activePhoto ? 1 : 0.65,
                                                    position: "relative",
                                                }}
                                            >
                                                {previewLooksLikeVideo(p) ? (
                                                    <video src={p} muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} aria-hidden />
                                                ) : (
                                                    <img src={p} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                            </div>
                        </div>
                    </div>

                    <div style={{ background: "#F7F8F7", borderRadius: "24px", padding: "1.15rem", display: "flex", flexDirection: "column", gap: "1rem", minHeight: 0 }}>
                        <div>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.45rem" }}>
                                Fiche prestation
                            </div>
                            <h1 style={{ fontSize: "1.74rem", fontWeight: "700", color: "var(--text-main)", margin: "0 0 0.42rem", lineHeight: 1.12 }}>
                                {service.name}
                            </h1>
                            {service.shortDescription ? (
                                <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", margin: "0 0 0.7rem", lineHeight: 1.5 }}>
                                    {service.shortDescription}
                                </p>
                            ) : null}
                            <div style={{ fontSize: "1.62rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "0.7rem" }}>
                                {formatPrice(service)}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", color: "var(--text-muted)", fontSize: "0.84rem", marginBottom: "1rem" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                    <Tag size={12} /> {service.categoryName || "—"}
                                </span>
                                {service.durationMinutes > 0 ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                        <Clock size={12} /> {service.durationMinutes} min
                                    </span>
                                ) : null}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", padding: "1rem 0", borderTop: "1px solid rgba(35,59,61,0.08)", borderBottom: "1px solid rgba(35,59,61,0.08)", marginBottom: "1rem" }}>
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Public</div>
                                    <div style={{ fontSize: "0.94rem", fontWeight: "600" }}>{formatTargetAudienceLabel(service.targetAudience)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Mode</div>
                                    <div style={{ fontSize: "0.94rem", fontWeight: "600" }}>
                                        {bookingMode === "booking" ? "Réservation" : "Demande"}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Référence</div>
                                    <div style={{ fontSize: "0.94rem", fontWeight: "600" }}>#{String(service.id).padStart(4, "0")}</div>
                                </div>

                            </div>
                        </div>
                        <div style={{ display: "grid", gap: "0.55rem", marginTop: "auto" }}>
                            {readOnly ? (
                                <p style={{
                                    margin: 0,
                                    padding: "0.85rem 1rem",
                                    borderRadius: "14px",
                                    background: "rgba(35,59,61,0.05)",
                                    color: "var(--text-muted)",
                                    fontSize: "0.84rem",
                                    lineHeight: 1.5,
                                }}>
                                    Fiche en lecture seule — la réservation est réservée aux clients.
                                </p>
                            ) : null}
                            {!readOnly && bookingMode === "booking" && hasExistingReservations ? (
                                <div
                                    className="panel"
                                    style={{
                                        padding: "1rem 1.1rem",
                                        borderRadius: "16px",
                                        background: "rgba(198, 255, 0, 0.22)",
                                        border: "1px solid rgba(35, 59, 61, 0.1)",
                                    }}
                                >
                                    <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                                        <CalendarCheck size={20} style={{ flexShrink: 0, marginTop: "0.1rem", color: "var(--forest-deep)" }} />
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)", lineHeight: 1.4 }}>
                                                Vous avez déjà{" "}
                                                {serviceReservations.length === 1
                                                    ? "1 créneau réservé"
                                                    : `${serviceReservations.length} créneaux réservés`}{" "}
                                                pour cette prestation.
                                            </p>
                                            {nextUpcomingReservation ? (
                                                <p style={{ margin: "0.45rem 0 0", fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                                                    <strong style={{ color: "var(--text-main)", fontWeight: 600 }}>Prochain créneau :</strong>{" "}
                                                    {formatNextSlotLabel(nextUpcomingReservation.bookingDate)}
                                                    {nextUpcomingReservation.employeeName
                                                        ? ` · ${nextUpcomingReservation.employeeName}`
                                                        : ""}
                                                </p>
                                            ) : (
                                                <p style={{ margin: "0.45rem 0 0", fontSize: "0.84rem", color: "var(--text-muted)" }}>
                                                    Aucun créneau à venir pour le moment.
                                                </p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => router.push("/prestations/mes-reservations")}
                                                style={{
                                                    marginTop: "0.55rem",
                                                    padding: 0,
                                                    border: "none",
                                                    background: "none",
                                                    color: "var(--forest-deep)",
                                                    fontWeight: 600,
                                                    fontSize: "0.82rem",
                                                    cursor: "pointer",
                                                    fontFamily: "inherit",
                                                    textDecoration: "underline",
                                                }}
                                            >
                                                Voir mes réservations
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            {!readOnly && bookingMode === "booking" ? (
                                <button
                                    type="button"
                                    className="action-cta task-action-btn"
                                    style={{ width: "100%", fontSize: "0.9rem", padding: "0.75rem 1rem" }}
                                    onClick={() => router.push(`/prestations/catalogue/${service.id}/reserver`)}
                                >
                                    {hasExistingReservations ? "Réserver un autre créneau" : "Réserver cette prestation"}
                                </button>
                            ) : !readOnly && !showRequestForm ? (
                                <button
                                    type="button"
                                    className="action-cta task-action-btn"
                                    style={{ width: "100%", fontSize: "0.9rem", padding: "0.75rem 1rem" }}
                                    onClick={() => setShowRequestForm(true)}
                                >
                                    Faire une demande
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: "3rem", paddingTop: "0.8rem" }}>
                    <section>
                        <span style={sectionLabel}>Description</span>
                        {descriptionParts.length > 0 ? (
                            <div style={{ display: "grid", gap: "1rem", maxWidth: "78ch" }}>
                                {descriptionParts.map((part, index) => (
                                    <p key={index} style={{ fontSize: "0.98rem", lineHeight: 1.9, color: "var(--text-main)", margin: 0, whiteSpace: "pre-wrap" }}>
                                        {part}
                                    </p>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: "var(--text-muted)", margin: 0 }}>Aucune description renseignée.</p>
                        )}
                    </section>
                    <section>
                        <span style={sectionLabel}>Détails</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 1.2rem" }}>
                            {[
                                { label: "Catégorie", val: service.categoryName || "—" },
                                { label: "Durée", val: service.durationMinutes > 0 ? `${service.durationMinutes} min` : "—" },
                                { label: "Tarif", val: formatPrice(service) },
                                { label: "Type d'offre", val: bookingMode === "booking" ? "Réservation" : "Demande" },
                                { label: "Public", val: formatTargetAudienceLabel(service.targetAudience) },
                                { label: "Photos", val: `${photos.length} média${photos.length > 1 ? "s" : ""}` },
                            ].map(({ label, val }) => (
                                <div key={label} style={{ paddingBottom: "0.85rem", borderBottom: "1px solid rgba(35,59,61,0.08)" }}>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.38rem" }}>
                                        {label}
                                    </div>
                                    <div style={{ fontSize: "0.94rem", fontWeight: "600", color: "var(--text-main)" }}>{val}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {!readOnly && showRequestForm && bookingMode !== "booking" ? (
                    <div className="panel" style={{ marginTop: "1.5rem", borderRadius: "24px" }}>
                        <span style={sectionLabel}>Ma demande de prestation</span>
                        <form onSubmit={handleRequestSubmit} style={{ maxWidth: "640px", display: "grid", gap: "1rem" }}>
                            <label style={labelStyle}>
                                Message ou précisions pour le professionnel *
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ex. : Je souhaiterais effectuer cette prestation à domicile le week-end…"
                                    required
                                    rows={5}
                                    style={{ ...fieldStyle, resize: "vertical", minHeight: "7rem", lineHeight: 1.5 }}
                                />
                            </label>
                            {bookingError ? <p style={{ color: "var(--state-critical)", fontSize: "0.88rem", margin: 0, fontWeight: 600 }}>{bookingError}</p> : null}
                            {successMessage ? <p style={{ color: "var(--forest-deep)", fontSize: "0.88rem", margin: 0, fontWeight: 600 }}>{successMessage}</p> : null}
                            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="action-cta task-action-btn"
                                    style={{ fontSize: "0.9rem", padding: "0.7rem 1.25rem", opacity: isSubmitting ? 0.7 : 1 }}
                                >
                                    {isSubmitting ? "Envoi en cours…" : "Confirmer ma demande"}
                                </button>
                                <button
                                    type="button"
                                    className="action-btn"
                                    onClick={() => { setShowRequestForm(false); setBookingError(""); setMessage(""); }}
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                ) : null}
            </div>

        </div>
    );
}
