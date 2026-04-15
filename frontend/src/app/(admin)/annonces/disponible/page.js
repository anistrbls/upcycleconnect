"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { MapPin } from "lucide-react";
import AdminModal from "../../../components/admin/AdminModal";

const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    header: {
        marginBottom: "2rem",
    },
    title: {
        margin: "0.5rem 0",
        fontSize: "2.5rem",
        fontWeight: 500,
        letterSpacing: "-0.02em",
        color: "var(--text-main)",
    },
    subtitle: {
        margin: "0.4rem 0 0",
        color: "var(--text-muted)",
        fontSize: "1.05rem",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "1.5rem",
    },
    card: {
        position: "relative",
        borderRadius: "28px",
        overflow: "hidden",
        height: "420px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "pointer",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        background: "#111",
    },
    cardImage: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center 80%",
    },
    blurLayer: {
        position: "absolute",
        inset: 0,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)",
        WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)",
        pointerEvents: "none",
    },
    gradientLayer: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.55) 35%, rgba(5,10,5,0.08) 60%, transparent 75%)",
        pointerEvents: "none",
    },
    statusBadge: {
        position: "absolute",
        top: "14px",
        right: "14px",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "0.72rem",
        fontWeight: "700",
        background: "rgba(255,255,255,0.18)",
        color: "white",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.22)",
        letterSpacing: "0.04em",
        zIndex: 2,
    },
    cardOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        zIndex: 2,
    },
    titlePriceRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: "0.75rem",
    },
    cardTitle: {
        fontSize: "1.2rem",
        fontWeight: "700",
        color: "white",
        margin: 0,
        lineHeight: "1.3",
        flex: 1,
    },
    pricePill: {
        padding: "5px 14px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.15)",
        color: "white",
        fontSize: "0.88rem",
        fontWeight: "700",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.25)",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    description: {
        fontSize: "0.82rem",
        color: "rgba(255,255,255,0.72)",
        margin: 0,
        lineHeight: "1.5",
    },
    tagsRow: {
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap",
    },
    tag: {
        padding: "4px 12px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.12)",
        fontSize: "0.75rem",
        color: "rgba(255,255,255,0.85)",
        fontWeight: "500",
        border: "1px solid rgba(255,255,255,0.2)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
    },
    cardActions: {
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
    },
    viewBtn: {
        flex: 1,
        padding: "0.72rem 1rem",
        borderRadius: "999px",
        border: "none",
        background: "white",
        color: "#111",
        fontFamily: "inherit",
        fontSize: "0.9rem",
        fontWeight: "700",
        cursor: "pointer",
        transition: "opacity 0.2s ease",
    },
    reserveBtn: {
        flex: 1,
        padding: "0.72rem 1rem",
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,0.3)",
        background: "rgba(255,255,255,0.12)",
        color: "white",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        fontFamily: "inherit",
        fontSize: "0.9rem",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    emptyState: {
        color: "var(--text-muted)",
        fontSize: "0.95rem",
    },
    error: {
        color: "#b42318",
        fontWeight: 600,
        marginBottom: "1rem",
    },
};

function formatPublishDate(item) {
    const raw = item.createdAt || item.created_at || item.publishedAt || item.published_at;
    if (!raw) return "Date non renseignee";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "Date non renseignee";
    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDepositLocation(item) {
    const point = item.depositPointName || "Point de depot";
    const container = item.containerName || "Box non assignee";
    return `${point} · ${container}`;
}

export default function ProfessionalAvailablePage() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(0);
    const [reserveConfirmItem, setReserveConfirmItem] = useState(null);
    const [reserveSuccess, setReserveSuccess] = useState(null);

    const fetchItems = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(apiUrl("/pro/items"), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Erreur chargement annonces professionnelles");
            }
            setItems(data.items || []);
        } catch (err) {
            setError(err.message || "Erreur inattendue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const reserve = async () => {
        const item = reserveConfirmItem;
        if (!item) return;

        setBusyId(item.id);
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
            const pickupCode = reserveData.pickup_code || "";

            if (wf === "pending_payment") {
                const checkoutRes = await fetch(apiUrl(`/pro/items/${item.id}/checkout-session`), {
                    method: "POST",
                    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({}),
                });
                const checkoutData = await checkoutRes.json();
                if (!checkoutRes.ok || !checkoutData.checkout_url) {
                    throw new Error(checkoutData.error || "Impossible de creer la session de paiement");
                }
                setReserveConfirmItem(null);
                window.location.assign(checkoutData.checkout_url);
                return;
            } else {
                setReserveConfirmItem(null);
                setReserveSuccess({
                    title: item.title,
                    pickupCode,
                });
            }

            await fetchItems();
        } catch (err) {
            setError(err.message || "Erreur lors de la réservation");
        } finally {
            setBusyId(0);
        }
    };

    const content = useMemo(() => {
        if (loading) return <p style={styles.emptyState}>Chargement des annonces disponibles...</p>;
        if (!items.length) return <p style={styles.emptyState}>Aucune annonce disponible pour le moment.</p>;

        return (
            <div style={styles.grid}>
                {items.map((item) => (
                    <article key={item.id} style={styles.card} className="annonce-card">
                        <img
                            src={item.image || (item.photos && item.photos[0]) || "/img/placeholder-object.jpg"}
                            alt={item.title}
                            style={styles.cardImage}
                        />
                        <div style={styles.blurLayer} />
                        <div style={styles.gradientLayer} />
                        <div style={styles.statusBadge}>DISPONIBLE</div>

                        <div style={styles.cardOverlay}>
                            <div style={styles.titlePriceRow}>
                                <h3 style={styles.cardTitle}>{item.title}</h3>
                                <div style={styles.pricePill}>{item.type === "don" ? "GRATUIT" : `${Number(item.price || 0)} EUR`}</div>
                            </div>

                            <p style={styles.description}>Publiée le {formatPublishDate(item)}</p>

                            <div style={styles.tagsRow}>
                                {item.category && <span style={styles.tag}>{item.category}</span>}
                                <span style={styles.tag}>
                                    <MapPin size={13} />
                                    {formatDepositLocation(item)}
                                </span>
                            </div>

                            <div style={styles.cardActions}>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/annonces/disponible/${item.id}`)}
                                    style={styles.viewBtn}
                                    className="view-btn-card"
                                >
                                    Voir détail
                                </button>
                                <button
                                    type="button"
                                    disabled={busyId === item.id}
                                    onClick={() => setReserveConfirmItem(item)}
                                    style={{ ...styles.reserveBtn, opacity: busyId === item.id ? 0.7 : 1 }}
                                    className="reserve-btn-card"
                                >
                                    {busyId === item.id ? "Réservation..." : "Réserver"}
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        );
    }, [items, loading, busyId]);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">Espace Professionnel</p>
                <h1 style={styles.title}>Annonces disponibles</h1>
                <p style={styles.subtitle}>Objets déposés et récupérables par les professionnels.</p>
            </header>

            {error && <p style={styles.error}>{error}</p>}
            {content}

            <AdminModal
                open={Boolean(reserveConfirmItem)}
                title="Confirmation de réservation"
                onClose={() => {
                    if (busyId) return;
                    setReserveConfirmItem(null);
                }}
            >
                <div style={{ display: "grid", gap: "1rem", paddingTop: "0.2rem" }}>
                    <p style={{ margin: 0, color: "var(--text-main)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                        Confirmer la réservation de "{reserveConfirmItem?.title}" ?
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.7rem" }}>
                        <button
                            type="button"
                            onClick={() => setReserveConfirmItem(null)}
                            disabled={Boolean(busyId)}
                            style={{
                                border: "none",
                                borderRadius: "12px",
                                padding: "0.62rem 1rem",
                                background: "#e8ecee",
                                color: "var(--text-main)",
                                fontWeight: 700,
                                cursor: busyId ? "not-allowed" : "pointer",
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={reserve}
                            disabled={Boolean(busyId)}
                            style={{
                                border: "none",
                                borderRadius: "12px",
                                padding: "0.62rem 1rem",
                                background: "#1f3336",
                                color: "#fff",
                                fontWeight: 700,
                                cursor: busyId ? "not-allowed" : "pointer",
                                opacity: busyId ? 0.75 : 1,
                            }}
                        >
                            {busyId ? "Confirmation..." : "Confirmer"}
                        </button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal
                open={Boolean(reserveSuccess)}
                title="Réservation confirmée"
                onClose={() => setReserveSuccess(null)}
            >
                <div style={{ display: "grid", gap: "0.9rem", paddingTop: "0.2rem" }}>
                    <p style={{ margin: 0, color: "var(--text-main)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                        La réservation de "{reserveSuccess?.title}" est confirmée.
                    </p>
                    <div style={{ borderRadius: "12px", background: "#f3f6f5", padding: "0.75rem 0.9rem" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                            Code de récupération
                        </div>
                        <div style={{ fontSize: "1.02rem", color: "var(--text-main)", fontWeight: 800, letterSpacing: "0.06em" }}>
                            {reserveSuccess?.pickupCode || "-"}
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                            type="button"
                            onClick={() => setReserveSuccess(null)}
                            style={{
                                border: "none",
                                borderRadius: "12px",
                                padding: "0.62rem 1rem",
                                background: "#1f3336",
                                color: "#fff",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </AdminModal>

            <style jsx>{`
                .annonce-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                }
                .view-btn-card:hover {
                    background: #e8e8e8 !important;
                }
                .reserve-btn-card:hover {
                    background: rgba(255,255,255,0.24) !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
