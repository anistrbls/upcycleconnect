"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TOKEN_KEY, apiUrl, buildAuthHeaders } from "../../../lib/api";
import { formatBuyerCardPrice } from "../../../lib/salePrice";
import DepositCodeQrPanel from "../../../components/DepositCodeQrPanel";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";
import { useI18n } from "../../../components/i18n/I18nProvider";
import {
    CreditCard,
    MapPin,
    CheckCircle2,
    CalendarClock,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Star,
    FileDown,
} from "lucide-react";
const DISABLE_RATING = true; // Rating updates disabled per request

const styles = {
    wrapper: {
        width: "100%",
        padding: "0 0 3rem 0",
        animation: "fadeIn 0.45s ease-out",
    },
    message: {
        borderRadius: "14px",
        padding: "0.72rem 0.9rem",
        fontSize: "0.9rem",
        fontWeight: 600,
        marginBottom: "1rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
    },
    toolbar: {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.65rem 1rem",
        alignItems: "center",
        marginBottom: "1rem",
    },
    searchWrap: {
        position: "relative",
        flex: "1 1 0%",
        minWidth: "min(100%, 160px)",
        width: "auto",
    },
    searchInput: {
        width: "100%",
        border: "none",
        borderRadius: "999px",
        background: "rgb(229, 255, 188)",
        color: "var(--text-main)",
        padding: "0.6rem 1.2rem",
        fontSize: "0.9rem",
        fontFamily: "inherit",
        outline: "none",
    },
    filterBar: {
        display: "flex",
        flexWrap: "wrap",
        gap: "0.45rem",
        alignItems: "center",
        flex: "0 1 auto",
        minWidth: 0,
    },
    filterChip: (active) => ({
        border: active ? "1px solid #233B3D" : "1px solid rgba(35,59,61,0.14)",
        borderRadius: "999px",
        padding: "0.45rem 0.85rem",
        fontSize: "0.82rem",
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        background: active ? "rgba(35,59,61,0.1)" : "#fff",
        color: active ? "#1a2d2f" : "var(--text-main)",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        transition: "background 0.15s ease, border-color 0.15s ease",
    }),
    filterChipCount: {
        fontSize: "0.74rem",
        fontWeight: 800,
        color: "var(--text-muted)",
        minWidth: "1.1em",
        textAlign: "center",
    },
    listPanel: {
        borderRadius: "14px",
        border: "1px solid rgba(35,59,61,0.08)",
        background: "#fafcfc",
        overflow: "hidden",
    },
    listHeading: {
        margin: "0 0 0.65rem",
        fontSize: "0.88rem",
        fontWeight: 700,
        color: "var(--text-muted)",
    },
    row: {
        display: "grid",
        gridTemplateColumns: "52px minmax(0, 1fr) auto auto",
        gap: "0.65rem",
        alignItems: "center",
        padding: "0.65rem 0.75rem",
        borderBottom: "1px solid rgba(35,59,61,0.06)",
        background: "#fff",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        fontFamily: "inherit",
        borderLeft: "none",
        borderRight: "none",
        borderTop: "none",
    },
    rowLast: {
        borderBottom: "none",
    },
    rowImgWrap: {
        width: "52px",
        height: "52px",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid rgba(35,59,61,0.09)",
        background: "#EDF1F0",
        flexShrink: 0,
    },
    rowImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },
    rowTitle: {
        margin: 0,
        fontSize: "0.92rem",
        fontWeight: 700,
        color: "var(--text-main)",
        lineHeight: 1.25,
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
    },
    rowMeta: {
        margin: "0.2rem 0 0",
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        flexWrap: "wrap",
    },
    badge: {
        borderRadius: "999px",
        padding: "4px 10px",
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        maxWidth: "140px",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    rowRight: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "0.35rem",
        flexShrink: 0,
    },
    pricePill: {
        fontSize: "0.82rem",
        fontWeight: 800,
        color: "var(--text-main)",
    },
    expandHint: {
        fontSize: "0.7rem",
        fontWeight: 600,
        color: "var(--text-muted)",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.2rem",
    },
    detailPanel: {
        padding: "1rem 1rem 1.15rem",
        background: "#f3f7f6",
        borderBottom: "1px solid rgba(35,59,61,0.08)",
    },
    detailStack: {
        display: "grid",
        gap: "0.85rem",
    },
    detailCard: {
        background: "#fff",
        borderRadius: "12px",
        border: "1px solid rgba(35,59,61,0.1)",
        padding: "0.9rem 1rem",
    },
    detailLabel: {
        margin: "0 0 0.5rem",
        fontSize: "0.7rem",
        fontWeight: 800,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
    },
    /** Ligne icône + colonne texte (cartes détail) */
    detailRow: {
        display: "flex",
        alignItems: "flex-start",
        gap: "0.5rem",
    },
    detailIcon: {
        flexShrink: 0,
        color: "#2b4548",
        marginTop: "0.1rem",
    },
    /** Titre / valeur principale sous l’icône */
    detailPrimary: {
        margin: 0,
        fontSize: "0.95rem",
        fontWeight: 700,
        color: "var(--text-main)",
        lineHeight: 1.45,
    },
    /** Texte secondaire sous la valeur (p ou span) — unique spec pour tout le panneau */
    detailMuted: {
        margin: "0.35rem 0 0",
        padding: 0,
        fontSize: "0.8125rem",
        fontWeight: 500,
        color: "var(--text-muted)",
        lineHeight: 1.45,
    },
    detailMutedEm: {
        fontWeight: 700,
        color: "var(--text-main)",
    },
    detailMutedFlush: {
        marginTop: 0,
    },
    /** Même typo que detailMuted, en ligne avec icône (adresse) */
    detailMutedRow: {
        margin: "0.25rem 0 0",
        padding: 0,
        fontSize: "0.8125rem",
        fontWeight: 500,
        color: "var(--text-muted)",
        lineHeight: 1.45,
        display: "flex",
        alignItems: "flex-start",
        gap: "0.4rem",
    },
    detailMono: {
        margin: 0,
        fontSize: "0.875rem",
        fontWeight: 700,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        letterSpacing: "0.02em",
        color: "#1f3436",
        wordBreak: "break-all",
        lineHeight: 1.45,
    },
    detailErrorText: {
        margin: 0,
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "#b91c1c",
        lineHeight: 1.45,
    },
    priceHighlight: {
        margin: "0.35rem 0 0",
        fontSize: "1.15rem",
        fontWeight: 800,
        color: "var(--text-main)",
        letterSpacing: "-0.02em",
        lineHeight: 1.25,
    },
    priceHighlightDon: {
        margin: "0.35rem 0 0",
        fontSize: "1.02rem",
        fontWeight: 800,
        color: "var(--text-main)",
        lineHeight: 1.25,
    },
    pickupSpotCard: {
        marginTop: "0.55rem",
        borderRadius: "14px",
        background: "linear-gradient(160deg, rgba(16,185,129,0.12), rgba(35,59,61,0.03))",
        padding: "0.65rem",
    },
    pickupSpotLayout: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 100px) minmax(0, 1fr)",
        gap: "0.65rem",
        alignItems: "stretch",
    },
    pickupSpotImage: {
        width: "100%",
        height: "100%",
        minHeight: "96px",
        objectFit: "cover",
        display: "block",
        background: "#EDF1F0",
        borderRadius: "10px",
    },
    pickupSpotBody: {
        display: "grid",
        gap: "0.35rem",
        alignContent: "center",
    },
    button: {
        border: "none",
        borderRadius: "999px",
        padding: "0.58rem 1rem",
        cursor: "pointer",
        fontWeight: 700,
        fontFamily: "inherit",
        fontSize: "0.85rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.42rem",
    },
    emptyCard: {
        borderRadius: "14px",
        border: "1px dashed rgba(35,59,61,0.2)",
        padding: "0.85rem 1rem",
        color: "var(--text-muted)",
        fontSize: "0.88rem",
        background: "rgba(255,255,255,0.7)",
    },
};

const STATUS_LABEL = {
    pending_payment: "En attente de paiement",
    reserved: "En attente du vendeur",
    assigned: "En attente du vendeur",
    deposit_code_sent: "En attente du vendeur",
    deposited: "Prêt à récupérer",
    ready_for_pickup: "Prêt à récupérer",
    picked_up: "Récupéré",
    cancelled: "Annulé",
};

const STATUS_STYLE = {
    pending_payment: { bg: "rgba(217,119,6,0.15)", color: "#b45309" },
    reserved: { bg: "rgba(99,102,241,0.12)", color: "#4f46e5" },
    assigned: { bg: "rgba(99,102,241,0.12)", color: "#4f46e5" },
    deposit_code_sent: { bg: "rgba(99,102,241,0.12)", color: "#4f46e5" },
    deposited: { bg: "rgba(16,185,129,0.16)", color: "#047857" },
    ready_for_pickup: { bg: "rgba(16,185,129,0.16)", color: "#047857" },
    picked_up: { bg: "rgb(229, 255, 188)", color: "var(--text-main)" },
    cancelled: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
};

const STATUS_FILTER_TABS = [
    { value: "all", label: "Tous" },
    { value: "pending_payment", label: "Paiement" },
    { value: "in_progress", label: "Chez le vendeur" },
    { value: "ready", label: "À récupérer" },
    { value: "picked_up", label: "Récupérées" },
    { value: "cancelled", label: "Annulées" },
];

const BUCKET_SORT_ORDER = { pending_payment: 0, in_progress: 1, ready: 2, picked_up: 3, cancelled: 4 };

function sortItemsForDisplay(list) {
    return [...list].sort((a, b) => {
        const da = BUCKET_SORT_ORDER[itemBucket(a)] ?? 9;
        const db = BUCKET_SORT_ORDER[itemBucket(b)] ?? 9;
        if (da !== db) return da - db;
        const ta = new Date(a.reservedAt || a.reserved_at || 0).getTime();
        const tb = new Date(b.reservedAt || b.reserved_at || 0).getTime();
        return tb - ta;
    });
}

function formatDepositAddress(item) {
    const parts = [
        item.depositPointAddress,
        [item.depositPointZipCode, item.depositPointCity].filter(Boolean).join(" "),
        item.depositPointCountry,
    ].filter(Boolean);

    if (!parts.length) return "Adresse du point non renseignée";
    return parts.join(", ");
}

function getPickupSpotPhoto(item) {
    if (Array.isArray(item.depositPointPhotos) && item.depositPointPhotos.length > 0) {
        return item.depositPointPhotos[0];
    }
    if (item.image) return item.image;
    if (Array.isArray(item.photos) && item.photos.length > 0) return item.photos[0];
    return "/img/recyclage-materiau.jpg";
}

async function generatePickupReceiptPDF(item) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const margin = 18;
    const W = 210;
    const accentGreen = [35, 90, 72];
    const darkText = [28, 35, 38];
    const mutedText = [105, 115, 120];

    // ── Header band ─────────────────────────────────────────────────────
    doc.setFillColor(35, 90, 72);
    doc.rect(0, 0, W, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("UpcycleConnect", margin, 13);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Justificatif de récupération", margin, 21);
    doc.setFontSize(8.5);
    const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    doc.text(`Généré le ${now}`, W - margin, 21, { align: "right" });

    let y = 50;

    const drawSection = (title, rows) => {
        doc.setFillColor(245, 249, 247);
        doc.roundedRect(margin, y - 3, W - margin * 2, 7, 2, 2, "F");
        doc.setTextColor(...accentGreen);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(title.toUpperCase(), margin + 4, y + 2);
        y += 10;

        rows.forEach(([label, value]) => {
            if (!value) return;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(...mutedText);
            doc.text(label, margin + 2, y);
            doc.setTextColor(...darkText);
            doc.setFont("helvetica", "bold");
            const lines = doc.splitTextToSize(String(value), W - margin * 2 - 62);
            doc.text(lines, W - margin, y, { align: "right" });
            y += lines.length * 5.2 + 1.5;
        });
        y += 4;
    };

    // Status badge
    const statusLabel = STATUS_LABEL[item.workflowStatus] || item.workflowStatus || "—";
    const statusColors = {
        picked_up: [22, 130, 80],
        cancelled: [180, 35, 35],
        pending_payment: [180, 120, 30],
    };
    const sc = statusColors[item.workflowStatus] || accentGreen;
    doc.setFillColor(...sc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const sbW = doc.getTextWidth(statusLabel) + 10;
    doc.roundedRect(W - margin - sbW, 36, sbW, 6.5, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(statusLabel, W - margin - sbW / 2, 40.5, { align: "center" });

    const price = item.type === "vente"
        ? (item.buyerPrice != null ? `${(Number(item.buyerPrice) / 100).toFixed(2)} €` : item.formattedPrice || "—")
        : "Don (gratuit)";

    const address = [
        item.depositPointAddress,
        [item.depositPointZipCode, item.depositPointCity].filter(Boolean).join(" "),
        item.depositPointCountry,
    ].filter(Boolean).join(", ") || "—";

    const reservedAt = (() => {
        const v = item.reservedAt || item.reserved_at;
        if (!v) return "—";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    })();

    const pickedUpAt = (() => {
        const v = item.pickedUpAt || item.picked_up_at;
        if (!v) return null;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    })();

    drawSection("Objet récupéré", [
        ["Titre", item.title || "Sans titre"],
        ["Catégorie", item.category || null],
        ["Type", item.type === "vente" ? "Vente" : "Don"],
        ["Montant payé", price],
    ]);

    drawSection("Transaction", [
        ["Référence", item.transactionRef || "—"],
        ["Date de réservation", reservedAt],
        ...(pickedUpAt ? [["Date de récupération", pickedUpAt]] : []),
        ["Statut", statusLabel],
    ]);

    drawSection("Point de récupération", [
        ["Nom du point", item.depositPointName || "—"],
        ["Adresse", address],
        ["Conteneur / box", item.containerName || null],
    ]);

    drawSection("Vendeur / donateur", [
        ["Nom", item.sellerName || "—"],
    ]);

    // Separator
    doc.setDrawColor(220, 230, 225);
    doc.line(margin, y, W - margin, y);
    y += 7;

    // Footer
    doc.setTextColor(...mutedText);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("Ce document est un justificatif non contractuel généré par la plateforme UpcycleConnect.", margin, y);
    y += 5;
    doc.text("Conservez-le en cas de litige ou pour vos déclarations de traçabilité matière.", margin, y);

    const safeRef = (item.transactionRef || item.id || "recuperation").replace(/[^a-z0-9]/gi, "_");
    doc.save(`justificatif_recuperation_${safeRef}.pdf`);
}

function formatDate(value, locale = "fr") {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function itemBucket(item) {
    const s = item.workflowStatus;
    const isDeposited = item.depositedAt || item.deposited_at || s === "deposited" || s === "ready_for_pickup";

    if (s === "pending_payment") return "pending_payment";
    if (s === "picked_up") return "picked_up";
    if (s === "cancelled") return "cancelled";
    if (isDeposited) return "ready";
    return "in_progress";
}

function matchesSearch(item, q) {
    if (!q.trim()) return true;
    const n = q.toLowerCase().trim();
    const hay = [
        item.title,
        item.transactionRef,
        item.depositPointName,
        item.containerName,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return hay.includes(n);
}

function SellerRatingBlock({ item, busy, onSubmit }) {
    const [hover, setHover] = useState(0);
    const my = item.mySellerRating;
    const [draft, setDraft] = useState(() => my || 0);

    useEffect(() => {
        setDraft(my || 0);
        setHover(0);
    }, [item.id, my]);

    const avg = item.sellerRatingAvg;
    const cnt = Number(item.sellerRatingCount) || 0;
    const sellerLabel = (item.sellerName || "").trim() || "Vendeur";

    const displayAvg =
        avg != null && !Number.isNaN(Number(avg))
            ? Number(avg).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
            : null;

    const effective = hover || draft || 0;
    const unchanged = my != null && my > 0 && draft === my;

    return (
        <div style={styles.detailCard}>
            <p style={styles.detailLabel}>Évaluation du vendeur</p>
            <p style={styles.detailMuted}>
                <span style={styles.detailMutedEm} data-i18n-user-content="true">{sellerLabel}</span>
                {displayAvg != null ? (
                    <>
                        {" "}
                        — note moyenne sur les avis des professionnels :{" "}
                        <strong style={{ color: "var(--text-main)" }}>{displayAvg} / 5</strong>
                        {cnt > 0 ? ` (${cnt} avis)` : ""}
                    </>
                ) : (
                    <> — pas encore d&apos;avis cumulés sur ce vendeur.</>
                )}
            </p>
            <div
                style={{ display: "flex", gap: "0.08rem", marginTop: "0.65rem", flexWrap: "wrap" }}
                role="group"
                aria-label="Attribuer une note sur 5"
                onMouseLeave={() => setHover(0)}
            >
                {[1, 2, 3, 4, 5].map((n) => {
                    const on = effective >= n;
                    return (
                        <button
                            key={n}
                            type="button"
                            disabled={busy}
                            onMouseEnter={() => setHover(n)}
                            onClick={() => setDraft(n)}
                            aria-pressed={draft === n}
                            aria-label={`${n} étoile${n > 1 ? "s" : ""} sur 5`}
                            style={{
                                background: "none",
                                border: "none",
                                padding: "0.2rem",
                                cursor: busy ? "wait" : "pointer",
                                lineHeight: 0,
                                opacity: busy ? 0.55 : 1,
                            }}
                        >
                            <Star
                                size={26}
                                aria-hidden
                                fill={on ? "#ca8a04" : "none"}
                                color={on ? "#ca8a04" : "rgba(35,59,61,0.28)"}
                                strokeWidth={on ? 0 : 1.65}
                            />
                        </button>
                    );
                })}
            </div>
            <button
                type="button"
                disabled={busy || draft < 1 || unchanged}
                onClick={(e) => {
                    e.stopPropagation();
                    if (draft >= 1 && !unchanged) onSubmit(draft);
                }}
                style={{
                    ...styles.button,
                    marginTop: "0.75rem",
                    background: "#2b4548",
                    color: "#fff",
                    opacity: busy || draft < 1 || unchanged ? 0.55 : 1,
                }}
            >
                {busy ? "Envoi…" : my != null && my > 0 ? "Mettre à jour la note" : "Envoyer la note"}
            </button>
        </div>
    );
}

export default function MyRecoveriesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { locale } = useI18n();
    const stripeState = (searchParams?.get("stripe") || "").toLowerCase();
    const stripeSessionId = (searchParams?.get("session_id") || "").trim();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(0);
    const [accessChecked, setAccessChecked] = useState(false);
    const [forbidden, setForbidden] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [listSearch, setListSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sellerRatingBusyId, setSellerRatingBusyId] = useState(0);

    useEffect(() => {
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) {
                setAccessChecked(true);
                return;
            }
            const payload = JSON.parse(atob(token.split(".")[1] || ""));
            const role = String(payload?.role || "").toLowerCase();
            if (role === "particulier") {
                setForbidden(true);
                if (stripeState === "success" && stripeSessionId) {
                    router.replace(`/evenements/activites?stripe=success&session_id=${encodeURIComponent(stripeSessionId)}`);
                } else if (stripeState === "cancel") {
                    router.replace("/evenements/activites?stripe=cancel");
                } else {
                    router.replace("/evenements/activites");
                }
            }
        } catch {
            // Ignore parsing errors and fallback to normal guard behavior.
        } finally {
            setAccessChecked(true);
        }
    }, [router, stripeState, stripeSessionId]);

    const fetchReservations = async (silent = false) => {
        if (!silent) setLoading(true);
        setError("");
        try {
            const res = await fetch(apiUrl("/pro/my-reservations"), { headers: buildAuthHeaders() });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Impossible de charger vos récupérations");
            }
            setItems(data.items || []);
        } catch (err) {
            setError(err.message || "Erreur inattendue");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (!accessChecked || forbidden) {
            return;
        }
        fetchReservations();
    }, [accessChecked, forbidden]);

    useEffect(() => {
        let cancelled = false;

        const confirmStripeSession = async () => {
            if (stripeState !== "success" || !stripeSessionId) return;

            try {
                const eventRes = await fetch(apiUrl(`/events/confirm-payment?session_id=${encodeURIComponent(stripeSessionId)}`), {
                    method: "GET",
                    headers: buildAuthHeaders(),
                });
                const eventData = await eventRes.json().catch(() => ({}));
                if (!cancelled && eventRes.ok && eventData?.eventId) {
                    router.replace(`/evenements/activites?id=${eventData.eventId}&payment=success`);
                    return;
                }
            } catch {
                // Ignore: ce n'est probablement pas une session d'evenement.
            }

            for (let attempt = 0; attempt < 5; attempt += 1) {
                try {
                    const res = await fetch(apiUrl("/pro/stripe/confirm-session"), {
                        method: "POST",
                        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({ session_id: stripeSessionId }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && data.confirmed) break;
                } catch {
                    // Ignore transient network/API errors while polling.
                }

                if (attempt < 4) {
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                }
            }

            if (!cancelled) {
                fetchReservations(true);
            }
        };

        confirmStripeSession();

        return () => {
            cancelled = true;
        };
    }, [stripeState, stripeSessionId, router]);

    const filteredItems = useMemo(() => {
        return items.filter((it) => matchesSearch(it, listSearch));
    }, [items, listSearch]);

    const grouped = useMemo(() => {
        const groups = { pending_payment: [], in_progress: [], ready: [], picked_up: [], cancelled: [] };
        for (const item of filteredItems) {
            const b = itemBucket(item);
            if (b === "pending_payment") groups.pending_payment.push(item);
            else if (b === "picked_up") groups.picked_up.push(item);
            else if (b === "cancelled") groups.cancelled.push(item);
            else if (b === "ready") groups.ready.push(item);
            else groups.in_progress.push(item);
        }
        return groups;
    }, [filteredItems]);

    const displayedItems = useMemo(() => {
        if (statusFilter === "all") return sortItemsForDisplay(filteredItems);
        const slice = grouped[statusFilter] || [];
        return sortItemsForDisplay(slice);
    }, [filteredItems, grouped, statusFilter]);

    const tabCounts = useMemo(() => {
        return {
            all: filteredItems.length,
            pending_payment: grouped.pending_payment.length,
            in_progress: grouped.in_progress.length,
            ready: grouped.ready.length,
            picked_up: grouped.picked_up.length,
            cancelled: grouped.cancelled.length,
        };
    }, [filteredItems, grouped]);

    const submitSellerRating = async (itemId, stars) => {
        setSellerRatingBusyId(itemId);
        setError("");
        try {
            const res = await fetch(apiUrl(`/pro/items/${itemId}/rate-seller`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ stars }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "Impossible d'enregistrer la note");
            }
            await fetchReservations(true);
        } catch (err) {
            setError(err.message || "Erreur inattendue");
        } finally {
            setSellerRatingBusyId(0);
        }
    };

    const payNow = async (itemId) => {
        setBusyId(itemId);
        setError("");
        try {
            const res = await fetch(apiUrl(`/pro/items/${itemId}/checkout-session`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok || !data.checkout_url) {
                throw new Error(data.error || "Impossible de démarrer le paiement");
            }
            window.location.assign(data.checkout_url);
        } catch (err) {
            setError(err.message || "Erreur paiement");
        } finally {
            setBusyId(0);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const renderEmpty = (text) => <div style={styles.emptyCard}>{text}</div>;

    const renderDetailBlock = (item) => {
        const pickupSpotPhoto = getPickupSpotPhoto(item);
        const pickupSpotName = item.depositPointName || "Point à assigner";
        const pickupSpotAddress = formatDepositAddress(item);
        const isDeposited =
            item.depositedAt || item.deposited_at || item.workflowStatus === "deposited" || item.workflowStatus === "ready_for_pickup";
        const pointName = (item.depositPointName || "").trim() || "À confirmer";
        const boxName = (item.containerName || "").trim() || "Non assignée";

        return (
            <div style={styles.detailPanel}>
                <div style={styles.detailStack}>
                    <div style={styles.detailCard}>
                        <p style={styles.detailLabel}>Lieu de retrait prévu</p>
                        <div style={styles.detailRow}>
                            <MapPin size={18} style={styles.detailIcon} aria-hidden />
                            <div style={{ minWidth: 0 }}>
                                <p style={styles.detailPrimary} data-i18n-user-content="true">{pointName}</p>
                                <p style={styles.detailMuted}>
                                    Conteneur / box : <span style={styles.detailMutedEm} data-i18n-user-content="true">{boxName}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={styles.detailCard}>
                        <p style={styles.detailLabel}>Réservation</p>
                        <div style={styles.detailRow}>
                            <CalendarClock size={18} style={styles.detailIcon} aria-hidden />
                            <div style={{ minWidth: 0 }}>
                                <p style={styles.detailPrimary}>{formatDate(item.reservedAt || item.reserved_at, locale)}</p>
                                <p style={styles.detailMuted}>Date à laquelle vous avez réservé cet objet.</p>
                            </div>
                        </div>
                    </div>

                    {item.transactionRef ? (
                        <div style={styles.detailCard}>
                            <p style={styles.detailLabel}>Référence de transaction</p>
                            <p style={styles.detailMono} data-i18n-user-content="true">{item.transactionRef}</p>
                            <p style={styles.detailMuted}>À conserver pour vos échanges avec le support ou le point de dépôt.</p>
                        </div>
                    ) : null}

                    <div style={styles.detailCard}>
                        <p style={styles.detailLabel}>Montant</p>
                        {item.type === "vente" ? (
                            <>
                                <p style={styles.priceHighlight}>{formatBuyerCardPrice(item)}</p>
                                <p style={styles.detailMuted}>Commission plateforme incluse.</p>
                            </>
                        ) : (
                            <>
                                <p style={styles.priceHighlightDon}>Don</p>
                                <p style={styles.detailMuted}>Aucun paiement pour cet objet.</p>
                            </>
                        )}
                    </div>

                    {item.workflowStatus === "picked_up" ? (
    DISABLE_RATING ? (
        <div style={{ padding: "0.8rem", background: "rgba(255,255,255,0.85)", borderRadius: "12px", border: "1px solid rgba(35,59,61,0.08)" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.45rem" }}>Note au professionnel</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                {[1,2,3,4,5].map((n) => (
                    <Star key={n} size={26} aria-hidden fill={item.mySellerRating >= n ? "#ca8a04" : "none"} color={item.mySellerRating >= n ? "#ca8a04" : "rgba(35,59,61,0.28)"} strokeWidth={item.mySellerRating >= n ? 0 : 1.65} />
                ))}
            </div>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Vous avez attribué {item.mySellerRating ?? "aucune"} étoile{item.mySellerRating === 1 ? "" : "s"}.
            </p>
        </div>
    ) : (
        <SellerRatingBlock item={item} busy={sellerRatingBusyId === item.id} onSubmit={(stars) => submitSellerRating(item.id, stars)} />
    )
    ) : null}



                    {isDeposited && item.workflowStatus !== "picked_up" && (
                        <div style={styles.detailCard}>
                            <p style={styles.detailLabel}>Code de récupération</p>
                            {item.pickupCode ? (
                                <DepositCodeQrPanel
                                    code={item.pickupCode}
                                    purpose="pickup"
                                    variant="light"
                                    qrSize={176}
                                    expiresText={(() => {
                                        const raw = item.pickupCodeExpiresAt || item.pickup_code_expires_at;
                                        if (!raw) return undefined;
                                        const d = formatDate(raw, locale);
                                        return d === "—" ? undefined : `Expire le : ${d}`;
                                    })()}
                                />
                            ) : (
                                <p style={{ ...styles.detailPrimary, marginTop: "0.05rem" }}>—</p>
                            )}
                            <p style={{ ...styles.detailMuted, marginTop: "0.65rem" }}>À communiquer ou à présenter au moment du retrait.</p>
                            <div style={{ ...styles.pickupSpotCard, marginTop: "0.75rem" }}>
                                <div style={styles.pickupSpotLayout}>
                                    <img
                                        src={pickupSpotPhoto}
                                        alt={`Lieu de récupération : ${pickupSpotName}`}
                                        style={styles.pickupSpotImage}
                                        data-i18n-user-content="true"
                                        onError={(e) => {
                                            e.currentTarget.src = "/img/recyclage-materiau.jpg";
                                        }}
                                    />
                                    <div style={styles.pickupSpotBody}>
                                        <p style={{ ...styles.detailLabel, color: "#047857", margin: "0 0 0.35rem 0" }}>Adresse du point</p>
                                        <p style={styles.detailPrimary} data-i18n-user-content="true">{pickupSpotName}</p>
                                        <p style={styles.detailMutedRow}>
                                            <MapPin size={14} style={{ ...styles.detailIcon, marginTop: "0.05rem" }} aria-hidden />
                                            <span data-i18n-user-content="true">{pickupSpotAddress}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {item.workflowStatus === "pending_payment" && (
                        <div style={{ ...styles.detailCard, borderStyle: "dashed", background: "rgba(43,69,72,0.04)" }}>
                            <p style={styles.detailLabel}>Paiement</p>
                            <p style={{ ...styles.detailMuted, ...styles.detailMutedFlush }}>
                                Finalisez le paiement pour que le vendeur puisse préparer le dépôt.
                            </p>
                            <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    payNow(item.id);
                                }}
                                style={{ ...styles.button, marginTop: "0.75rem", background: "#2b4548", color: "#fff", opacity: busyId === item.id ? 0.7 : 1 }}
                                className="pay-btn"
                            >
                                <CreditCard size={14} /> {busyId === item.id ? "Paiement..." : "Payer avec Stripe"}
                            </button>
                        </div>
                    )}

                    {item.workflowStatus === "cancelled" && item.cancelReason && (
                        <div
                            style={{
                                ...styles.detailCard,
                                background: "#fef2f2",
                                borderColor: "#fecaca",
                            }}
                        >
                            <p style={{ ...styles.detailLabel, color: "#991b1b" }}>Annulation</p>
                            <p style={styles.detailErrorText} data-i18n-user-content="true">{item.cancelReason}</p>
                        </div>
                    )}

                    {/* Bouton téléchargement justificatif */}
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.25rem" }}>
                        <button
                            type="button"
                            className="receipt-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                generatePickupReceiptPDF(item);
                            }}
                            style={{
                                ...styles.button,
                                background: "#2b4548",
                                color: "#fff",
                                fontSize: "0.83rem",
                                padding: "0.55rem 1.1rem",
                            }}
                        >
                            <FileDown size={14} />
                            Télécharger le justificatif
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderRecoveryRow = (item, index, total) => {
        const cardImage = item.image || (Array.isArray(item.photos) && item.photos[0]) || "/img/recyclage-materiau.jpg";
        const expanded = expandedId === item.id;
        const st = STATUS_STYLE[item.workflowStatus] || { bg: "rgba(35,59,61,0.12)", color: "#233B3D" };
        return (
            <div key={item.id}>
                <button
                    type="button"
                    style={{
                        ...styles.row,
                        ...(index === total - 1 && !expanded ? styles.rowLast : {}),
                    }}
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={expanded}
                >
                    <div style={styles.rowImgWrap}>
                        {previewLooksLikeVideo(cardImage) ? (
                            <video
                                src={cardImage}
                                muted
                                playsInline
                                preload="metadata"
                                style={styles.rowImg}
                                aria-hidden
                            />
                        ) : (
                            <img
                                src={cardImage}
                                alt=""
                                style={styles.rowImg}
                                onError={(e) => {
                                    e.currentTarget.src = "/img/recyclage-materiau.jpg";
                                }}
                            />
                        )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <h3 style={styles.rowTitle}>
                            {item.title ? <span data-i18n-user-content="true">{item.title}</span> : "Sans titre"}
                        </h3>
                        <p style={styles.rowMeta}>
                            <CalendarClock size={12} />
                            {formatDate(item.reservedAt || item.reserved_at, locale)}
                            {item.transactionRef ? (
                                <>
                                    <span aria-hidden>·</span>
                                    <span style={{ fontFamily: "monospace", fontSize: "0.72rem" }} data-i18n-user-content="true">{item.transactionRef}</span>
                                </>
                            ) : null}
                        </p>
                    </div>
                    <span style={{ ...styles.badge, background: st.bg, color: st.color }} title={STATUS_LABEL[item.workflowStatus] || item.workflowStatus}>
                        {(STATUS_LABEL[item.workflowStatus] || item.workflowStatus).replace(/^En attente du vendeur$/, "Chez vendeur")}
                    </span>
                    <div style={styles.rowRight}>
                        <span style={styles.pricePill}>{item.type === "vente" ? formatBuyerCardPrice(item) : "Don"}</span>
                        <span style={styles.expandHint}>
                            {expanded ? (
                                <>
                                    Masquer <ChevronUp size={14} />
                                </>
                            ) : (
                                <>
                                    Détails <ChevronDown size={14} />
                                </>
                            )}
                        </span>
                    </div>
                </button>
                {expanded ? renderDetailBlock(item) : null}
            </div>
        );
    };

    const emptyMessageForFilter = () => {
        if (items.length === 0) return "Vous n'avez aucune réservation pour le moment.";
        if (filteredItems.length === 0) return "Aucun résultat pour cette recherche.";
        const tab = STATUS_FILTER_TABS.find((t) => t.value === statusFilter);
        return `Aucune réservation dans « ${tab?.label || statusFilter} » pour cette recherche.`;
    };

    if (!accessChecked || forbidden) {
        return <div style={{ padding: "2rem 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>Redirection...</div>;
    }

    const paymentNotice =
        stripeState === "success"
            ? { text: "Paiement confirmé. Vérification en cours du statut de réservation.", tone: "success" }
            : stripeState === "cancel"
              ? { text: "Paiement annulé. Vous pouvez relancer le checkout quand vous voulez.", tone: "warning" }
              : null;

    if (loading) return <div style={styles.wrapper}>Chargement...</div>;

    const listTitle =
        statusFilter === "all"
            ? "Toutes les réservations"
            : (STATUS_FILTER_TABS.find((t) => t.value === statusFilter)?.label ?? "Liste");

    return (
        <div style={styles.wrapper}>
            <div className="header-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "static" }}>
                <div className="title-area">
                    <span className="activities-label">Administration</span>
                    <h1>Mes récupérations</h1>
                </div>
            </div>

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "1rem" }}>
                    <span className="section-title">Suivi professionnel</span>
                    <span
                        className="db-badge"
                        style={{
                            background: "rgb(229, 255, 188)",
                            color: "var(--text-main)",
                        }}
                    >
                        {items.length} réservation{items.length > 1 ? "s" : ""}
                        {listSearch.trim() ? ` · ${filteredItems.length} affichée(s)` : ""}
                    </span>
                </div>

                <div style={styles.toolbar}>
                    <div style={styles.searchWrap}>
                        <input
                            type="text"
                            placeholder="Rechercher (titre, transaction, point…)"
                            value={listSearch}
                            onChange={(e) => setListSearch(e.target.value)}
                            style={styles.searchInput}
                            aria-label="Filtrer la liste"
                        />
                    </div>
                    <div style={styles.filterBar} role="tablist" aria-label="Filtrer par statut">
                        {STATUS_FILTER_TABS.map((tab) => {
                            const active = statusFilter === tab.value;
                            const count = tabCounts[tab.value] ?? 0;
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => {
                                        setStatusFilter(tab.value);
                                        setExpandedId(null);
                                    }}
                                    style={styles.filterChip(active)}
                                >
                                    {tab.label}
                                    <span style={styles.filterChipCount}>({count})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {paymentNotice && (
                    <div
                        style={{
                            ...styles.message,
                            background: paymentNotice.tone === "success" ? "rgba(16,185,129,0.14)" : "rgba(217,119,6,0.14)",
                            color: paymentNotice.tone === "success" ? "#047857" : "#b45309",
                        }}
                    >
                        {paymentNotice.tone === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        {paymentNotice.text}
                    </div>
                )}

                {error && (
                    <div style={{ ...styles.message, background: "rgba(180,35,24,0.11)", color: "#b42318" }}>
                        <AlertCircle size={15} /> {error}
                    </div>
                )}

                <p style={styles.listHeading}>
                    {listTitle} — {displayedItems.length} affichée{displayedItems.length > 1 ? "s" : ""}
                </p>

                {displayedItems.length === 0 ? (
                    renderEmpty(emptyMessageForFilter())
                ) : (
                    <div style={styles.listPanel}>
                        {displayedItems.map((item, idx) => renderRecoveryRow(item, idx, displayedItems.length))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .pay-btn:hover {
                    background: #35585b !important;
                }
                .receipt-btn:hover {
                    background: #35585b !important;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(35,69,72,0.25);
                }
                .receipt-btn {
                    transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
