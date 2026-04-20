"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { CreditCard, MapPin, PackageCheck, CheckCircle2, CalendarClock, AlertCircle } from "lucide-react";

const styles = {
    wrapper: {
        width: "100%",
        padding: "0 0 3rem 0",
        animation: "fadeIn 0.45s ease-out",
    },
    subtitle: {
        margin: "0.1rem 0 0.2rem",
        color: "var(--text-muted)",
        fontSize: "0.9rem",
        maxWidth: "66ch",
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
    section: {
        marginBottom: "1.4rem",
        paddingTop: "0.15rem",
    },
    sectionHeader: { marginBottom: "0.7rem" },
    sectionCount: {
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
    },
    list: {
        display: "grid",
        gap: "0.9rem",
    },
    card: {
        borderRadius: "18px",
        padding: "0.95rem 1rem",
        background: "white",
        border: "1px solid rgba(35,59,61,0.09)",
        display: "grid",
        gap: "0.72rem",
    },
    cardMain: {
        display: "grid",
        gridTemplateColumns: "62px minmax(0, 1fr)",
        gap: "0.8rem",
        alignItems: "start",
    },
    cardImageWrap: {
        width: "62px",
        height: "62px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(35,59,61,0.09)",
        background: "#EDF1F0",
        flexShrink: 0,
    },
    cardImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },
    row: {
        display: "flex",
        justifyContent: "space-between",
        gap: "0.7rem",
        flexWrap: "wrap",
        alignItems: "center",
    },
    titleRow: {
        margin: 0,
        fontSize: "1.02rem",
        fontWeight: 700,
        color: "var(--text-main)",
    },
    badge: {
        borderRadius: "999px",
        padding: "5px 12px",
        fontSize: "0.73rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
    },
    line: {
        margin: 0,
        color: "var(--text-muted)",
        fontSize: "0.88rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
    },
    priceRow: (isSale) => ({
        margin: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.55rem",
        width: "fit-content",
        padding: "0.18rem 0",
        color: "var(--text-muted)",
        fontSize: "0.86rem",
        fontWeight: 700,
    }),
    priceDot: (isSale) => ({
        width: "9px",
        height: "9px",
        borderRadius: "999px",
        background: isSale ? "#233B3D" : "transparent",
        border: "1.5px solid rgba(35,59,61,0.55)",
        boxShadow: "0 0 0 5px rgba(35,59,61,0.08)",
        flexShrink: 0,
    }),
    priceValue: {
        color: "var(--text-main)",
        fontWeight: 800,
    },
    transactionLine: {
        margin: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        fontSize: "0.8rem",
        color: "#2b4548",
        fontWeight: 700,
    },
    transactionTag: {
        background: "rgba(43,69,72,0.12)",
        color: "#1f3436",
        borderRadius: "999px",
        padding: "3px 8px",
        fontSize: "0.68rem",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        fontWeight: 800,
    },
    pickupCode: {
        margin: "0.12rem 0 0",
        fontWeight: 700,
        color: "var(--text-main)",
        fontSize: "0.93rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
    },
    pickupSpotCard: {
        marginTop: "0.2rem",
        borderRadius: "16px",
        background: "linear-gradient(160deg, rgba(16,185,129,0.12), rgba(35,59,61,0.03))",
        padding: "0.75rem",
    },
    pickupSpotLayout: {
        display: "grid",
        gridTemplateColumns: "118px minmax(0, 1fr)",
        gap: "0.75rem",
        alignItems: "stretch",
    },
    pickupSpotImage: {
        width: "100%",
        height: "100%",
        minHeight: "118px",
        objectFit: "cover",
        display: "block",
        background: "#EDF1F0",
        borderRadius: "12px",
    },
    pickupSpotBody: {
        display: "grid",
        gap: "0.45rem",
        alignContent: "center",
    },
    pickupSpotEyebrow: {
        margin: 0,
        fontSize: "0.72rem",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#047857",
    },
    pickupSpotTitle: {
        margin: 0,
        fontSize: "1.15rem",
        fontWeight: 800,
        color: "var(--text-main)",
        lineHeight: 1.25,
    },
    pickupSpotAddress: {
        margin: 0,
        color: "var(--text-muted)",
        fontSize: "0.93rem",
        lineHeight: 1.45,
        display: "inline-flex",
        alignItems: "flex-start",
        gap: "0.45rem",
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
        padding: "0.8rem 0.9rem",
        color: "var(--text-muted)",
        fontSize: "0.88rem",
        background: "rgba(255,255,255,0.7)",
    },
};

const STATUS_LABEL = {
    pending_payment: "En attente de paiement",
    reserved: "Prêt à récupérer",
    picked_up: "Recupere",
};

const STATUS_STYLE = {
    pending_payment: { bg: "rgba(217,119,6,0.15)", color: "#b45309" },
    reserved: { bg: "rgba(16,185,129,0.16)", color: "#047857" },
    picked_up: { bg: "rgba(35,59,61,0.14)", color: "#233B3D" },
};

function formatDepositLocation(item) {
    const point = item.depositPointName || "Point UC";
    const container = item.containerName || "Box non assignee";
    return `${point} · ${container}`;
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

function formatDate(value) {
    if (!value) return "Date non renseignee";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date non renseignee";
    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export default function MyRecoveriesPage() {
    const searchParams = useSearchParams();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(0);

    const fetchReservations = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    const stripeState = (searchParams?.get("stripe") || "").toLowerCase();
    const stripeSessionId = (searchParams?.get("session_id") || "").trim();

    useEffect(() => {
        let cancelled = false;

        const confirmStripeSession = async () => {
            if (stripeState !== "success" || !stripeSessionId) return;

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
                fetchReservations();
            }
        };

        confirmStripeSession();

        return () => {
            cancelled = true;
        };
    }, [stripeState, stripeSessionId]);

    const grouped = useMemo(() => {
        const groups = { pending_payment: [], reserved: [], picked_up: [] };
        for (const item of items) {
            if (groups[item.workflowStatus]) {
                groups[item.workflowStatus].push(item);
            }
        }
        return groups;
    }, [items]);

    const paymentNotice =
        stripeState === "success"
            ? { text: "Paiement confirmé. Vérification en cours du statut de réservation.", tone: "success" }
            : stripeState === "cancel"
                ? { text: "Paiement annulé. Vous pouvez relancer le checkout quand vous voulez.", tone: "warning" }
                : null;

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

    const renderEmpty = (text) => <div style={styles.emptyCard}>{text}</div>;

    const renderCard = (item) => {
        const cardImage = item.image || (Array.isArray(item.photos) && item.photos[0]) || "/img/recyclage-materiau.jpg";
        const pickupSpotPhoto = getPickupSpotPhoto(item);
        const pickupSpotName = item.depositPointName || "Point UC";
        const pickupSpotAddress = formatDepositAddress(item);

        return (
        <article key={item.id} style={styles.card}>
            <div style={styles.cardMain}>
                <div style={styles.cardImageWrap}>
                    <img
                        src={cardImage}
                        alt={item.title || "Objet réservé"}
                        style={styles.cardImage}
                        onError={(e) => {
                            e.currentTarget.src = "/img/recyclage-materiau.jpg";
                        }}
                    />
                </div>
                <div>
                    <div style={styles.row}>
                        <h3 style={styles.titleRow}>{item.title}</h3>
                        <span
                            style={{
                                ...styles.badge,
                                background: STATUS_STYLE[item.workflowStatus]?.bg || "rgba(35,59,61,0.12)",
                                color: STATUS_STYLE[item.workflowStatus]?.color || "#233B3D",
                            }}
                        >
                            {STATUS_LABEL[item.workflowStatus] || item.workflowStatus}
                        </span>
                    </div>
                    <p style={styles.line}><MapPin size={14} /> {formatDepositLocation(item)}</p>
                </div>
            </div>
            <p style={styles.line}><CalendarClock size={14} /> Reserve le {formatDate(item.reservedAt || item.reserved_at)}</p>
            {item.transactionRef && (
                <p style={styles.transactionLine}>
                    <span style={styles.transactionTag}>Transaction</span>
                    <span>{item.transactionRef}</span>
                </p>
            )}
            <p style={styles.priceRow(item.type === "vente")}>
                <span style={styles.priceDot(item.type === "vente")} />
                {item.type === "vente" ? (
                    <>
                        <span>Vente</span>
                        <span style={styles.priceValue}>{Number(item.price || 0).toFixed(2)} EUR</span>
                    </>
                ) : (
                    <span style={styles.priceValue}>Don</span>
                )}
            </p>
            {item.workflowStatus === "reserved" && (
                <>
                    <p style={styles.pickupCode}><PackageCheck size={15} /> Code de récupération: {item.pickupCode || "-"}</p>
                    <div style={styles.pickupSpotCard}>
                        <div style={styles.pickupSpotLayout}>
                            <img
                                src={pickupSpotPhoto}
                                alt={`Lieu de récupération: ${pickupSpotName}`}
                                style={styles.pickupSpotImage}
                                onError={(e) => {
                                    e.currentTarget.src = "/img/recyclage-materiau.jpg";
                                }}
                            />
                            <div style={styles.pickupSpotBody}>
                                <p style={styles.pickupSpotEyebrow}>Lieu de récupération</p>
                                <p style={styles.pickupSpotTitle}>{formatDepositLocation(item)}</p>
                                <p style={styles.pickupSpotAddress}><MapPin size={15} /> {pickupSpotAddress}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
            {item.workflowStatus === "pending_payment" && (
                <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => payNow(item.id)}
                    style={{ ...styles.button, background: "#2b4548", color: "#fff", opacity: busyId === item.id ? 0.7 : 1 }}
                    className="pay-btn"
                >
                    <CreditCard size={14} /> {busyId === item.id ? "Paiement..." : "Payer avec Stripe"}
                </button>
            )}
        </article>
    );
    };

    if (loading) return <div style={styles.wrapper}>Chargement...</div>;

    return (
        <div style={styles.wrapper}>
            <div className="header-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div className="title-area">
                    <span className="activities-label">Administration</span>
                    <h1>Mes récupérations</h1>
                    <p style={styles.subtitle}>Suivez vos réservations, paiements et codes de récupération.</p>
                </div>
            </div>

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "1.1rem" }}>
                    <span className="section-title">Suivi professionnel</span>
                    <span className="db-badge">{items.length} récupération{items.length > 1 ? "s" : ""}</span>
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

                <section style={styles.section}>
                    <div className="section-header" style={styles.sectionHeader}>
                        <span className="section-title">En attente de paiement</span>
                        <span style={styles.sectionCount}>{grouped.pending_payment.length} item(s)</span>
                    </div>
                    <div style={styles.list}>
                        {grouped.pending_payment.length ? grouped.pending_payment.map(renderCard) : renderEmpty("Aucun paiement en attente.")}
                    </div>
                </section>
                <section style={styles.section}>
                    <div className="section-header" style={styles.sectionHeader}>
                        <span className="section-title">Prêtes à récupérer</span>
                        <span style={styles.sectionCount}>{grouped.reserved.length} item(s)</span>
                    </div>
                    <div style={styles.list}>
                        {grouped.reserved.length ? grouped.reserved.map(renderCard) : renderEmpty("Aucun objet prêt à récupérer pour le moment.")}
                    </div>
                </section>
                <section style={styles.section}>
                    <div className="section-header" style={styles.sectionHeader}>
                        <span className="section-title">Récupérées</span>
                        <span style={styles.sectionCount}>{grouped.picked_up.length} item(s)</span>
                    </div>
                    <div style={styles.list}>
                        {grouped.picked_up.length ? grouped.picked_up.map(renderCard) : renderEmpty("Aucun historique de récupération pour l'instant.")}
                    </div>
                </section>
            </div>

            <style jsx>{`
                .pay-btn:hover {
                    background: #35585b !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
