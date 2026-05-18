"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Pencil,
    Share2,
    Tag,
    Trash2,
    Users,
} from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { formatDateFR, formatDateTimeFR, formatTargetAudienceLabel } from "../../../lib/formatters";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";
import { useAdminFeedback } from "../useAdminFeedback";

const STATUS_LABELS = { actif: "Actif", inactif: "Inactif", brouillon: "Brouillon" };
const STATUS_COLORS = {
    actif: { bg: "rgba(62,104,108,0.12)", color: "var(--forest-deep)" },
    inactif: { bg: "rgba(35,59,61,0.08)", color: "var(--text-main)" },
    brouillon: { bg: "rgba(245,158,11,0.12)", color: "#B45309" },
};

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

export default function ServiceConsultationView({ serviceId }) {
    const router = useRouter();
    const { showToast, askConfirm, FeedbackUI } = useAdminFeedback();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [activePhoto, setActivePhoto] = useState(0);
    const [serviceBookings, setServiceBookings] = useState([]);

    const photos = useMemo(() => (service ? collectPhotos(service) : []), [service]);
    const bookingMode = service?.bookingMode || service?.type || (service?.isBookable ? "booking" : "inquiry");
    const statusKey = service?.status || "brouillon";
    const sc = STATUS_COLORS[statusKey] || STATUS_COLORS.brouillon;
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
            const res = await fetch(apiUrl(`/admin/services/${serviceId}`), { headers: buildAuthHeaders() });
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

    const loadServiceBookings = useCallback(async () => {
        if (!serviceId) return;
        try {
            const res = await fetch(apiUrl(`/admin/reservations?serviceId=${serviceId}`), { headers: buildAuthHeaders() });
            const data = await res.json();
            if (res.ok) setServiceBookings(data.items ?? []);
        } catch {
            setServiceBookings([]);
        }
    }, [serviceId]);

    useEffect(() => {
        loadService();
    }, [loadService]);

    useEffect(() => {
        if (service) loadServiceBookings();
    }, [service, loadServiceBookings]);

    const providers = useMemo(() => {
        if (!service) return [];
        if (Array.isArray(service.providers) && service.providers.length > 0) return service.providers;
        return (service.employeeIds || []).map((id) => ({ id, name: `Expert #${id}` }));
    }, [service]);

    const linkedBookingsCount = Math.max(
        Number(service?.linkedBookings || 0),
        serviceBookings.length,
    );
    const canDeleteService = linkedBookingsCount === 0;

    const prevPhoto = () => {
        if (photos.length <= 1) return;
        setActivePhoto((i) => (i - 1 + photos.length) % photos.length);
    };
    const nextPhoto = () => {
        if (photos.length <= 1) return;
        setActivePhoto((i) => (i + 1) % photos.length);
    };

    const copyShareLink = () => {
        if (typeof window === "undefined") return;
        const url = window.location.href;
        navigator.clipboard?.writeText(url).then(() => window.alert("Lien copié.")).catch(() => window.alert(url));
    };

    const handleToggleStatus = async (status) => {
        try {
            const res = await fetch(apiUrl(`/admin/services/${serviceId}/status`), {
                method: "PATCH",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Erreur de statut.");
            await loadService();
        } catch (err) {
            window.alert(String(err?.message || "Impossible de modifier le statut."));
        }
    };

    const performDelete = async () => {
        const res = await fetch(apiUrl(`/admin/services/${serviceId}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erreur de suppression.");
        showToast("Prestation supprimée.", "success");
        router.push("/offres-prestations/prestations");
    };

    const handleDeleteClick = () => {
        if (!canDeleteService) {
            showToast(
                "Impossible de supprimer : des réservations sont liées à cette prestation. Désactivez-la à la place.",
                "error",
            );
            return;
        }
        askConfirm({
            title: "Supprimer la prestation",
            message: `Êtes-vous sûr de vouloir supprimer « ${service?.name} » ? Cette action est irréversible.`,
            confirmLabel: "Supprimer",
            tone: "danger",
            onConfirm: async () => {
                try {
                    await performDelete();
                } catch (err) {
                    showToast(String(err?.message || "Impossible de supprimer."), "error");
                    throw err;
                }
            },
        });
    };

    if (loading) {
        return <p style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Chargement de la prestation…</p>;
    }

    if (notFound) {
        return (
            <div>
                <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>Prestation introuvable.</p>
                <button type="button" onClick={() => router.push("/offres-prestations/prestations")} style={actionBtn("primary")}>
                    Retour aux prestations
                </button>
            </div>
        );
    }

    if (fetchError || !service) {
        return (
            <div>
                <p style={{ color: "#a23b3b", marginBottom: "1rem" }}>{fetchError || "Prestation indisponible."}</p>
                <button type="button" onClick={() => router.push("/offres-prestations/prestations")} style={actionBtn("neutral")}>
                    Retour aux prestations
                </button>
            </div>
        );
    }

    const currentPhoto = photos[activePhoto];

    return (
        <>
        {FeedbackUI}
        <div style={{ width: "100%", padding: "1rem 0 4rem", animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", paddingBottom: "0.9rem", borderBottom: "1px solid rgba(35,59,61,0.08)" }}>
                    <button
                        type="button"
                        onClick={() => router.push("/offres-prestations/prestations")}
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
                        <ArrowLeft size={16} /> Prestations
                    </button>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{
                            display: "inline-flex",
                            padding: "5px 11px",
                            borderRadius: "999px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            background: sc.bg,
                            color: sc.color,
                        }}>
                            {STATUS_LABELS[statusKey] || statusKey}
                        </span>
                        <button type="button" onClick={copyShareLink} style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            background: "var(--surface-hover)",
                            border: "none",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                            fontWeight: "600",
                            padding: "6px 12px",
                            borderRadius: "999px",
                            cursor: "pointer",
                        }}>
                            <Share2 size={13} /> Copier le lien
                        </button>
                    </div>
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
                                Consultation prestation
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
                                {Number(service.price || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
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
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                    <Calendar size={12} /> {formatDateFR(service.createdAt)}
                                </span>
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
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Mise à jour</div>
                                    <div style={{ fontSize: "0.94rem", fontWeight: "600" }}>{formatDateTimeFR(service.updatedAt)}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "grid", gap: "0.55rem", marginTop: "auto" }}>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Gestion</div>
                            <button type="button" onClick={() => router.push(`/offres-prestations/prestations/${serviceId}/modifier`)} style={actionBtn("neutral")}>
                                <Pencil size={15} /> Modifier la prestation
                            </button>
                            {statusKey !== "actif" ? (
                                <button type="button" onClick={() => handleToggleStatus("actif")} style={actionBtn("primary")}>
                                    Activer
                                </button>
                            ) : (
                                <button type="button" onClick={() => handleToggleStatus("inactif")} style={actionBtn("neutral")}>
                                    Désactiver
                                </button>
                            )}
                            {canDeleteService ? (
                                <button type="button" onClick={handleDeleteClick} style={actionBtn("danger")}>
                                    <Trash2 size={16} /> Supprimer
                                </button>
                            ) : (
                                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                                    {linkedBookingsCount} réservation{linkedBookingsCount > 1 ? "s" : ""} liée
                                    {linkedBookingsCount > 1 ? "s" : ""} — suppression impossible. Utilisez « Désactiver ».
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={() => router.push("/offres-prestations/reservations")}
                                style={actionBtn("neutral")}
                            >
                                Voir les réservations ({linkedBookingsCount})
                            </button>
                        </div>
                    </div>
                </div>

                {bookingMode === "booking" ? (
                    <div className="panel" style={{ borderRadius: "20px", padding: "1.25rem 1.5rem" }}>
                        <span style={sectionLabel}>Experts assignés</span>
                        {providers.length === 0 ? (
                            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                                Aucun expert assigné — modifiez la prestation pour en ajouter.
                            </p>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                {providers.map((p) => (
                                    <span
                                        key={p.id}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.35rem",
                                            padding: "0.45rem 0.85rem",
                                            borderRadius: "999px",
                                            background: "var(--surface-hover)",
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                        }}
                                    >
                                        <Users size={14} /> {p.name || `Expert #${p.id}`}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}

                {serviceBookings.length > 0 ? (
                    <div className="panel" style={{ borderRadius: "20px", padding: "1.25rem 1.5rem", overflowX: "auto" }}>
                        <span style={sectionLabel}>Réservations liées ({serviceBookings.length})</span>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #E2EAEA", textAlign: "left" }}>
                                    {["Client", "Date", "Expert", "Statut", "Paiement", "Montant"].map((col) => (
                                        <th key={col} style={{ padding: "0.5rem 0.65rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem" }}>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {serviceBookings.slice(0, 8).map((b) => (
                                    <tr key={b.id} style={{ borderBottom: "1px solid #F0F5F5" }}>
                                        <td style={{ padding: "0.55rem 0.65rem" }}>{b.userName}</td>
                                        <td style={{ padding: "0.55rem 0.65rem", whiteSpace: "nowrap" }}>{formatDateTimeFR(b.bookingDate)}</td>
                                        <td style={{ padding: "0.55rem 0.65rem" }}>{b.employeeName || "—"}</td>
                                        <td style={{ padding: "0.55rem 0.65rem" }}>{b.status}</td>
                                        <td style={{ padding: "0.55rem 0.65rem" }}>{b.paymentStatus}</td>
                                        <td style={{ padding: "0.55rem 0.65rem", fontWeight: 600 }}>{Number(b.amount).toFixed(2)} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {serviceBookings.length > 8 ? (
                            <p style={{ margin: "0.75rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                                + {serviceBookings.length - 8} autre(s) — voir toutes les réservations.
                            </p>
                        ) : null}
                    </div>
                ) : null}

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
                                { label: "Statut", val: STATUS_LABELS[statusKey] || statusKey },
                                { label: "Durée", val: service.durationMinutes > 0 ? `${service.durationMinutes} min` : "—" },
                                { label: "Type d'offre", val: bookingMode === "booking" ? "Réservation" : "Demande" },
                                { label: "Créée le", val: formatDateTimeFR(service.createdAt) },
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
            </div>

        </div>
        </>
    );
}
