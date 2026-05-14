"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../../lib/api";
import { previewLooksLikeVideo } from "../../../../lib/mediaUploadLimits";
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Tag,
    Gift,
    CheckCircle2,
    Package,
    ChevronLeft,
    ChevronRight,
    Box,
    Star,
} from "lucide-react";

const sectionLabel = {
    fontSize: "0.72rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    margin: "0 0 1rem",
    display: "block",
};

const actionBtn = (tone = "neutral") => ({
    "--btn-bg": tone === "primary" ? "var(--forest-deep)" : tone === "soft" ? "rgba(35,59,61,0.06)" : "transparent",
    "--btn-hover-bg": tone === "primary" ? "#33575a" : "rgba(35,59,61,0.1)",
    "--btn-border": tone === "primary" ? "none" : "1px solid rgba(35,59,61,0.12)",
    "--btn-hover-border": tone === "primary" ? "none" : "1px solid rgba(35,59,61,0.18)",
    "--btn-color": tone === "primary" ? "white" : "var(--text-main)",
    padding: "0.82rem 1rem",
    borderRadius: "999px",
    fontFamily: "inherit",
    fontSize: "0.88rem",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
});

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

function formatDate(value) {
    if (!value) return "Date non renseignee";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getDepositLocation(item) {
    if (!item.depositPointName) {
        return `Ville : ${item.city || item.ItemCity || "Non renseignée"}`;
    }
    const point = item.depositPointName;
    const container = item.containerName || "Box non assignee";
    return `${point} · ${container}`;
}

function getDepositAddress(item) {
    if (!item.depositPointName) {
        return "Le point de retrait exact vous sera communiqué une fois l'objet déposé par le particulier.";
    }
    const address = item.depositPointAddress || item.deposit_point_address || "";
    const zip = item.depositPointZipCode || item.deposit_point_zip_code || "";
    const city = item.depositPointCity || item.deposit_point_city || "";
    const country = item.depositPointCountry || item.deposit_point_country || "";

    const locality = [zip, city].filter(Boolean).join(" ");
    return [address, locality, country].filter(Boolean).join(", ") || "Adresse non renseignee";
}

function formatWeight(item) {
    const rawValue = item?.weightValue ?? item?.weight_value;
    const rawUnit = item?.weightUnit ?? item?.weight_unit;
    const value = Number(rawValue);
    const unit = String(rawUnit || "").trim().toLowerCase();

    if (Number.isFinite(value) && value > 0 && (unit === "mg" || unit === "g" || unit === "kg")) {
        return `${value} ${unit}`;
    }

    const grams = Number(item?.weightGrams ?? item?.weight_grams);
    if (Number.isFinite(grams) && grams > 0) {
        return `${grams} g`;
    }

    return "Non renseigne";
}

function getInitials(name) {
    const s = String(name || "").trim();
    if (!s) return "?";
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${(parts[0][0] || "").toUpperCase()}${(parts[parts.length - 1][0] || "").toUpperCase()}`;
    }
    return s.slice(0, 2).toUpperCase();
}

const fmtEur = (amount) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(amount) || 0);

/** Même logique que l’API Go (saleCommissionFeeCents) : arrondi au centime sur le prix annonce. */
function saleCommissionFeeCents(priceEuros, percent) {
    const baseCents = Math.round(Number(priceEuros) * 100);
    if (!Number.isFinite(baseCents) || baseCents <= 0) return 0;
    const p = Number(percent);
    if (!Number.isFinite(p) || p <= 0) return 0;
    return Math.round((baseCents * p) / 100);
}

export default function ProfessionalAvailableDetailPage() {
    const router = useRouter();
    const params = useParams();
    const itemId = params?.id;

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [activePhoto, setActivePhoto] = useState(0);

    const fetchItem = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(apiUrl(`/pro/items/${itemId}`), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Annonce inaccessible");
            }
            const norm = (v, alt) => (v !== undefined && v !== null ? v : alt);
            setItem({
                ...data,
                sellerName: norm(data.sellerName, data.seller_name) ?? "",
                sellerRatingAvg: data.sellerRatingAvg ?? data.seller_rating_avg,
                sellerRatingCount: Number(data.sellerRatingCount ?? data.seller_rating_count ?? 0),
                sellerItemsCount: Number(data.sellerItemsCount ?? data.seller_items_count ?? 0),
                sellerCity: data.sellerCity ?? data.seller_city ?? "",
                sellerRegisteredAt: data.sellerRegisteredAt ?? data.seller_registered_at,
            });
        } catch (err) {
            setError(err.message || "Erreur inattendue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!itemId) return;
        fetchItem();
    }, [itemId]);

    useEffect(() => {
        setActivePhoto(0);
    }, [item?.id]);

    const reserve = async () => {
        if (!item) return;
        setBusy(true);
        setError("");
        try {
            const reserveRes = await fetch(apiUrl(`/pro/items/${item.id}/reserve`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({}),
            });
            const reserveData = await reserveRes.json();
            if (!reserveRes.ok) {
                throw new Error(reserveData.error || "Reservation impossible");
            }

            const wf = reserveData.logistics?.workflow_status || reserveData.logistics?.workflowStatus;
            if (wf === "pending_payment") {
                const checkoutRes = await fetch(apiUrl(`/pro/items/${item.id}/checkout-session`), {
                    method: "POST",
                    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({}),
                });
                const checkoutData = await checkoutRes.json();
                if (!checkoutRes.ok || !checkoutData.checkout_url) {
                    throw new Error(checkoutData.error || "Impossible de créer la session de paiement");
                }
                window.location.assign(checkoutData.checkout_url);
                return;
            } else {
                window.alert("L'objet a été réservé ! Le code de récupération vous sera fourni une fois l'objet déposé par le particulier.");
            }
            router.push("/annonces/mes-recuperations");
        } catch (err) {
            setError(err.message || "Erreur lors de la reservation");
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>Chargement de l'annonce...</div>;
    }

    if (!item) {
        return <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>Annonce introuvable.</div>;
    }

    const photos = item.photos?.length ? item.photos : [item.image || "/img/placeholder-object.jpg"];
    const isDon = item.type === "don";
    const saleModeRaw = String(item.saleCommissionMode ?? item.sale_commission_mode ?? "").toLowerCase();
    const saleModeAdded = !isDon && saleModeRaw === "added";
    const salePctRaw = item.saleCommissionPercent ?? item.sale_commission_percent;
    const salePct = typeof salePctRaw === "number" ? salePctRaw : parseFloat(String(salePctRaw ?? "").replace(",", "."));
    const salePercent = Number.isFinite(salePct) ? salePct : 0;
    const feeCents = saleModeAdded ? saleCommissionFeeCents(item.price, salePercent) : 0;
    const baseCents = Math.round(Number(item.price || 0) * 100);
    const displayBuyerCents = saleModeAdded && feeCents > 0 ? baseCents + feeCents : baseCents;
    const displayDate = formatDate(
        item.availableAt ||
        item.available_at ||
        item.createdAt ||
        item.created_at ||
        item.publishedAt ||
        item.published_at
    );
    const depositLocation = getDepositLocation(item);
    const depositAddress = getDepositAddress(item);
    const estimatedWeight = formatWeight(item);
    const depositPointPhoto =
        (Array.isArray(item.depositPointPhotos) && item.depositPointPhotos[0]) ||
        (Array.isArray(item.deposit_point_photos) && item.deposit_point_photos[0]) ||
        item.depositPointImage ||
        item.deposit_point_image ||
        item.depositPointPhoto ||
        item.deposit_point_photo ||
        item.depositPointCover ||
        item.deposit_point_cover ||
        "/img/recyclage-materiau.jpg";

    const prev = () => setActivePhoto((i) => (i - 1 + photos.length) % photos.length);
    const next = () => setActivePhoto((i) => (i + 1) % photos.length);

    const sellerDisplayName = String(item.sellerName || "").trim() || "Non renseigné";
    const authorRating = Math.max(0, Math.min(5, Number(item.sellerRatingAvg ?? 0)));
    const roundedStars = Math.round(authorRating);
    const sellerRatingCount = Number(item.sellerRatingCount ?? 0);
    const sellerRatingLabel =
        sellerRatingCount > 0
            ? `${authorRating.toFixed(1)} · ${sellerRatingCount} avis`
            : "Pas encore d'avis";
    const registrationDisplay = item.sellerRegisteredAt
        ? new Date(item.sellerRegisteredAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
          })
        : "Non renseignée";
    const locationDisplay =
        [item.sellerCity || item.city, item.country].filter(Boolean).join(", ") || "N/A";

    const detailRows = [
        { label: "Catégorie", val: item.category || "N/A", icon: <Tag size={13} /> },
        { label: "Type", val: isDon ? "Don" : "Vente", icon: isDon ? <Gift size={13} /> : <Tag size={13} /> },
        { label: "État", val: item.condition || "N/A", icon: <CheckCircle2 size={13} /> },
        { label: "Matière", val: item.material || "N/A", icon: <Package size={13} /> },
        { label: "Poids estime", val: estimatedWeight, icon: <Package size={13} /> },
        { label: "Publiée le", val: displayDate, icon: <Calendar size={13} /> },
        { label: "Point de dépôt", val: item.depositPointName || "À assigner", icon: <Box size={13} /> },
        { label: "Conteneur", val: item.containerName || "À assigner", icon: <Box size={13} /> },
    ];

    return (
        <div style={{ width: "100%", padding: "1rem 0 4rem 0", animation: "fadeIn 0.4s ease-out" }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", paddingBottom: "0.9rem", borderBottom: "1px solid rgba(35,59,61,0.08)" }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: "0.45rem",
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", fontSize: "0.86rem",
                            fontFamily: "inherit", fontWeight: "600", padding: "0.25rem 0",
                        }}
                    >
                        <ArrowLeft size={16} /> Annonces disponibles
                    </button>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 11px", borderRadius: "999px", fontSize: "0.72rem", letterSpacing: "0.05em", fontWeight: "700", background: "rgba(16,185,129,0.12)", color: "#059669" }}>
                            DISPONIBLE
                        </span>
                    </div>
                </div>

                {error && (
                    <div style={{ background: "var(--state-critical-bg)", color: "var(--state-critical)", borderRadius: "14px", padding: "0.8rem 1rem", fontSize: "0.9rem", fontWeight: "600" }}>
                        {error}
                    </div>
                )}

                <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(360px, 0.8fr)", gap: "1.5rem", alignItems: "stretch" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
                    <div style={{ background: "var(--black)", borderRadius: "28px", padding: "1rem", border: "1px solid rgba(18, 25, 26, 0.08)" }}>
                        <div style={{ borderRadius: "22px", overflow: "hidden", background: "#12191A", position: "relative" }}>
                            <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
                                {previewLooksLikeVideo(photos[activePhoto]) ? (
                                    <video
                                        src={photos[activePhoto]}
                                        controls
                                        playsInline
                                        muted
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1, background: "#0a0f0f" }}
                                    />
                                ) : (
                                    <img
                                        src={photos[activePhoto]}
                                        alt={item.title}
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}
                                    />
                                )}

                                <div style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "linear-gradient(to top, rgba(10, 15, 15, 0.7) 0%, rgba(10, 15, 15, 0.2) 20%, rgba(10, 15, 15, 0) 40%)",
                                    pointerEvents: "none",
                                    zIndex: 2,
                                }} />

                                {photos.length > 1 && (
                                    <>
                                        <button onClick={prev} style={arrowBtn("left")}><ChevronLeft size={20} /></button>
                                        <button onClick={next} style={arrowBtn("right")}><ChevronRight size={20} /></button>

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
                                            scrollbarWidth: "none",
                                            WebkitOverflowScrolling: "touch",
                                        }}>
                                            {photos.map((p, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setActivePhoto(i)}
                                                    style={{
                                                        border: i === activePhoto ? "2px solid white" : "1px solid rgba(255,255,255,0.16)",
                                                        padding: 0,
                                                        borderRadius: "14px",
                                                        overflow: "hidden",
                                                        cursor: "pointer",
                                                        background: "rgba(255,255,255,0.08)",
                                                        backdropFilter: "blur(8px)",
                                                        minWidth: "64px",
                                                        width: "64px",
                                                        height: "64px",
                                                        flexShrink: 0,
                                                        opacity: i === activePhoto ? 1 : 0.65,
                                                        transition: "all 0.2s ease",
                                                        position: "relative",
                                                    }}
                                                >
                                                    {previewLooksLikeVideo(p) ? (
                                                        <video
                                                            src={p}
                                                            muted
                                                            playsInline
                                                            preload="metadata"
                                                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                            aria-hidden
                                                        />
                                                    ) : (
                                                        <img src={p} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <section style={{ paddingTop: "0.2rem" }}>
                        <span style={sectionLabel}>Détails</span>
                        <div className="details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 1.2rem" }}>
                            {detailRows.map(({ label, val, icon }) => (
                                <div key={label} style={{ paddingBottom: "0.85rem", borderBottom: "1px solid rgba(35,59,61,0.08)" }}>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.38rem" }}>{label}</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.94rem", fontWeight: "600", color: "var(--text-main)", lineHeight: "1.45" }}>
                                        <span style={{ color: "var(--forest-deep)", display: "flex", flexShrink: 0 }}>{icon}</span>
                                        <span>{val}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                    </div>

                    <div style={{ display: "grid", gap: "0.85rem", gridTemplateRows: "auto auto auto", alignContent: "start" }}>
                        <div style={{ background: "#F7F8F7", borderRadius: "24px", padding: "1rem", border: "none", display: "flex", flexDirection: "column", justifyContent: "flex-start", minHeight: 0 }}>
                            <div>
                                <div style={{ fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.45rem" }}>Vue professionnel</div>
                                <h1 style={{ fontSize: "1.74rem", fontWeight: "700", color: "var(--text-main)", margin: "0 0 0.42rem", lineHeight: "1.12", letterSpacing: "-0.03em" }}>{item.title}</h1>
                                {isDon ? (
                                    <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "0.7rem" }}>Gratuit</div>
                                ) : saleModeAdded && feeCents > 0 ? (
                                    <div style={{ marginBottom: "0.7rem" }}>
                                        <div style={{ fontSize: "1.62rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "0.35rem" }}>
                                            {fmtEur(displayBuyerCents / 100)}
                                        </div>
                                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                                            dont <strong>{fmtEur(feeCents / 100)}</strong> de frais plateforme
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: "1.62rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "0.7rem" }}>
                                        {fmtEur(Number(item.price || 0))}
                                    </div>
                                )}

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", color: "var(--text-muted)", fontSize: "0.84rem", marginBottom: "1rem" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><MapPin size={12} /> {depositLocation}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Calendar size={12} /> {displayDate}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Tag size={12} /> {isDon ? "Don" : "Vente"}</span>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", padding: "0.85rem 0", borderTop: "1px solid rgba(35,59,61,0.08)", borderBottom: "1px solid rgba(35,59,61,0.08)", marginBottom: "0.8rem" }}>
                                    <div>
                                        <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Reference</div>
                                        <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" }}>#{String(item.id).padStart(4, "0")}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Quantite</div>
                                        <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" }}>{item.quantity || 1}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: "0.1rem" }}>
                                <div style={{ fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.6rem" }}>Actions</div>
                                <div style={{ display: "grid", gap: "0.55rem" }}>
                                    <button
                                        className="action-button action-button-primary"
                                        onClick={reserve}
                                        disabled={busy}
                                        style={{ ...actionBtn("primary"), opacity: busy ? 0.7 : 1 }}
                                    >
                                        {busy ? "Réservation..." : "Réserver cet objet"}
                                    </button>
                                    <button
                                        className="action-button action-button-neutral"
                                        onClick={() => router.push("/annonces/mes-recuperations")}
                                        style={actionBtn("neutral")}
                                    >
                                        Voir mes récupérations
                                    </button>
                                    <button
                                        className="action-button action-button-neutral"
                                        onClick={() => router.push("/annonces/disponible")}
                                        style={actionBtn("soft")}
                                    >
                                        Retour à la liste
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div
                            style={{
                                background: "#F7F8F7",
                                borderRadius: "20px",
                                padding: "0.95rem 1.05rem",
                                border: "none",
                                display: "grid",
                                gap: "0.7rem",
                            }}
                        >
                            <div style={{ fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                                Auteur
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                                <div
                                    style={{
                                        width: "46px",
                                        height: "46px",
                                        borderRadius: "50%",
                                        background: "rgba(35,59,61,0.12)",
                                        color: "var(--text-main)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.82rem",
                                        fontWeight: "700",
                                    }}
                                >
                                    {getInitials(sellerDisplayName)}
                                </div>

                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: "0.98rem",
                                            fontWeight: "700",
                                            color: "var(--text-main)",
                                            lineHeight: "1.2",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {sellerDisplayName}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.32rem", marginTop: "0.24rem" }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                size={12}
                                                strokeWidth={2}
                                                style={{
                                                    color: star <= roundedStars ? "#f4b740" : "rgba(35,59,61,0.2)",
                                                    fill: star <= roundedStars ? "#f4b740" : "transparent",
                                                }}
                                            />
                                        ))}
                                        <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", marginLeft: "0.18rem" }}>
                                            {sellerRatingLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
                                <div style={{ background: "rgba(255,255,255,0.72)", borderRadius: "12px", padding: "0.55rem 0.65rem", border: "none" }}>
                                    <div style={{ fontSize: "0.64rem", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                                        Nb annonces
                                    </div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)", lineHeight: 1.25 }}>
                                        {Number(item.sellerItemsCount ?? 0)}
                                    </div>
                                </div>

                                <div style={{ background: "rgba(255,255,255,0.72)", borderRadius: "12px", padding: "0.55rem 0.65rem", border: "none" }}>
                                    <div style={{ fontSize: "0.64rem", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                                        Date inscription
                                    </div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)" }}>
                                        {registrationDisplay}
                                    </div>
                                </div>

                                <div style={{ background: "rgba(255,255,255,0.72)", borderRadius: "12px", padding: "0.55rem 0.65rem", border: "none", gridColumn: "1 / -1" }}>
                                    <div style={{ fontSize: "0.64rem", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                                        Localisation
                                    </div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)" }}>
                                        {locationDisplay}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: "#F7F8F7",
                            borderRadius: "20px",
                            padding: "1.05rem 1.1rem",
                            border: "none",
                            display: "grid",
                            gap: "0.85rem",
                            alignContent: "start",
                        }}>
                            <div style={{ fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                                Point de depot
                            </div>
                            <div style={{
                                width: "100%",
                                height: "190px",
                                borderRadius: "14px",
                                overflow: "hidden",
                                background: "#E8ECEB",
                                border: "1px solid rgba(35,59,61,0.1)",
                            }}>
                                <img
                                    src={depositPointPhoto}
                                    alt={`Point de depot ${item.depositPointName || ""}`}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(35,59,61,0.12)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Box size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)" }}>{item.depositPointName ? item.depositPointName : `Ville : ${item.city || "Non renseignée"}`}</div>
                                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{item.containerName || "Point à assigner après réservation"}</div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.18rem", lineHeight: "1.45" }}>{depositAddress}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "3rem", paddingTop: "0.8rem" }}>
                    <section style={{ paddingTop: "0.2rem" }}>
                        <span style={sectionLabel}>Description</span>
                        <div style={{ display: "grid", gap: "1rem", maxWidth: "78ch" }}>
                            <p style={{ fontSize: "0.98rem", lineHeight: "1.9", color: "var(--text-main)", margin: 0 }}>
                                {item.description || "Aucune description fournie."}
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .action-button {
                    background: var(--btn-bg);
                    border: var(--btn-border);
                    color: var(--btn-color);
                }

                .action-button-primary:hover {
                    background: var(--btn-hover-bg);
                }

                .action-button-neutral:hover {
                    background: var(--btn-hover-bg);
                    border: var(--btn-hover-border);
                }

                @media (max-width: 1040px) {
                    .hero-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 920px) {
                    .content-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 640px) {
                    .details-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
