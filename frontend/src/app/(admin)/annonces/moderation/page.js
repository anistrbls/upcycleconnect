"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Search, XCircle, Clock3, ShieldAlert } from "lucide-react";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";

const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    header: {
        marginBottom: "2rem",
    },
    searchRow: {
        display: "flex",
        gap: "1rem",
        alignItems: "center",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
    },
    searchInput: {
        width: "100%",
        border: "none",
        borderRadius: "999px",
        padding: "0.7rem 1.2rem",
        background: "rgb(229, 255, 188)",
        color: "var(--text-main)",
        outline: "none",
        fontSize: "0.92rem",
    },
    statusBtn: (active) => ({
        border: "none",
        borderRadius: "999px",
        padding: "0.55rem 1rem",
        background: active ? "var(--black)" : "rgb(229, 255, 188)",
        color: active ? "white" : "var(--text-main)",
        cursor: "pointer",
        fontSize: "0.82rem",
        fontWeight: "600",
        transition: "background-color 0.2s ease",
    }),
    kpiGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "0.8rem",
        marginBottom: "1.5rem",
    },
    kpiCard: {
        background: "#F7F8F7",
        borderRadius: "16px",
        padding: "0.9rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.7rem",
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
    statusBadge: () => ({
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
    }),
    cardOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.72rem",
        zIndex: 2,
    },
    titlePriceRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: "0.75rem",
    },
    cardTitle: {
        margin: 0,
        color: "white",
        fontSize: "1.2rem",
        fontWeight: "700",
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
    thumbnailsRow: {
        display: "flex",
        gap: "8px",
        marginTop: "2px",
        marginBottom: "4px",
        width: "100%",
    },
    thumbnail: {
        width: "44px",
        height: "44px",
        borderRadius: "10px",
        objectFit: "cover",
        border: "1px solid rgba(255,255,255,0.3)",
        background: "rgba(0,0,0,0.2)",
        flexShrink: 0,
    },
    description: {
        margin: 0,
        color: "rgba(255,255,255,0.75)",
        fontSize: "0.82rem",
        lineHeight: "1.5",
    },
    authorLine: {
        margin: 0,
        color: "rgba(255,255,255,0.9)",
        fontSize: "0.82rem",
        fontWeight: "600",
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
    },
    cardActions: {
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
    },
    actionBtn: (tone) => ({
        "--btn-bg": tone === "accept" ? "var(--forest-deep)" : tone === "reject" ? "#f6c8c8" : "white",
        "--btn-hover-bg": tone === "accept" ? "#1f3537" : tone === "reject" ? "#e9b4b4" : "#ececec",
        flex: 1,
        border: "none",
        borderRadius: "999px",
        padding: "0.72rem 0.85rem",
        background: "var(--btn-bg)",
        color: tone === "accept" ? "white" : "#111",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "0.88rem",
        fontWeight: "700",
        transition: "background-color 0.2s ease",
    }),
};

const MODERATION_MOCK = [
    {
        id: 1201,
        title: "Bureau en bois récupéré",
        type: "vente",
        city: "Paris",
        date: "14 Mars 2026",
        status: "en attente",
        authorName: "Ines Trabelsi",
        image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=900&auto=format&fit=crop",
    },
    {
        id: 1202,
        title: "Lot de carrelage ancien",
        type: "don",
        city: "Lille",
        date: "13 Mars 2026",
        status: "refusee",
        authorName: "Nora Benali",
        image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=900&auto=format&fit=crop",
    },
    {
        id: 1203,
        title: "Commode restaurée",
        type: "vente",
        city: "Nantes",
        date: "11 Mars 2026",
        status: "en attente",
        authorName: "Lina Moreau",
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=900&auto=format&fit=crop",
    },
];

const normalizeStatus = (status) => {
    if (!status) return "en attente";
    const value = String(status).toLowerCase();
    if (value === "refuse" || value === "refusée" || value === "refusee") return "refusee";
    return value;
};

const getAnnonceAuthor = (annonce) => {
    return (
        annonce?.authorName ||
        annonce?.seller?.name ||
        annonce?.ownerName ||
        annonce?.userName ||
        annonce?.userEmail ||
        annonce?.email ||
        "Auteur inconnu"
    );
};

function ModerationContent() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("en attente");
    const [annonces, setAnnonces] = useState([]);

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            const token = window.localStorage.getItem(TOKEN_KEY);
            if (!token) return;

            try {
                const response = await fetch(apiUrl("/auth/me"), {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) return;

                const data = await response.json();
                const admin = data?.user?.role === "admin";
                if (!admin) {
                    router.replace("/annonces/mes-annonces");
                    return;
                }

                if (isMounted) {
                    setIsAdmin(true);
                }
            } catch {
                // Le layout gère déjà les cas d'auth.
            }
        };

        init();
        return () => {
            isMounted = false;
        };
    }, [router]);
    const fetchAnnonces = async () => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            const url = apiUrl(`/admin/items?status=${statusFilter === "all" ? "" : statusFilter}&q=${searchTerm}`);
            const response = await fetch(url, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setAnnonces(data.items || []);
            }
        } catch (err) {
            console.error("Failed to fetch ads", err);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchAnnonces();
        }
    }, [isAdmin, statusFilter, searchTerm]);

    const setStatus = async (id, status) => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            const response = await fetch(apiUrl(`/admin/items/${id}/status`), {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                fetchAnnonces();
            }
        } catch (err) {
            alert("Erreur lors de la modération : " + err.message);
        }
    };

    if (!isAdmin) {
        return <div style={{ padding: "1.5rem", color: "var(--text-muted)" }}>Chargement...</div>;
    }

    const filtered = annonces.filter((annonce) => {
        const text = `${annonce.title || ""} ${annonce.city || ""} ${getAnnonceAuthor(annonce)}`.toLowerCase();
        const matchesSearch = text.includes(searchTerm.toLowerCase());
        const moderationStatuses = ["en attente", "refusee"];
        const currentStatus = normalizeStatus(annonce.status);
        const isInModerationQueue = moderationStatuses.includes(currentStatus);
        const matchesStatus = statusFilter === "all" ? isInModerationQueue : currentStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = annonces.filter((a) => normalizeStatus(a.status) === "en attente").length;
    const refusedCount = annonces.filter((a) => normalizeStatus(a.status) === "refusee").length;
    const moderationCount = annonces.filter((a) => ["en attente", "refusee"].includes(normalizeStatus(a.status))).length;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">Espace Admin</p>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.45rem 0", letterSpacing: "-0.02em" }}>Modération des annonces</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>Validez, refusez et suivez les annonces sensibles en un coup d'oeil.</p>
            </header>

            <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}><Clock3 size={18} color="#8a6d1f" /><div><strong>{pendingCount}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>En attente</div></div></div>
                <div style={styles.kpiCard}><XCircle size={18} color="#b24a4a" /><div><strong>{refusedCount}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Refusées</div></div></div>
                <div style={styles.kpiCard}><ShieldAlert size={18} color="#34585b" /><div><strong>{moderationCount}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>A modérer</div></div></div>
            </div>

            <div style={styles.searchRow}>
                <div style={{ display: "flex", alignItems: "center", background: "rgb(229, 255, 188)", borderRadius: "999px", paddingLeft: "0.9rem", minWidth: "280px", maxWidth: "430px", width: "100%", flex: "0 1 430px" }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        style={styles.searchInput}
                        placeholder="Rechercher titre, ville ou auteur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button style={styles.statusBtn(statusFilter === "all")} onClick={() => setStatusFilter("all")}>Toutes</button>
                <button style={styles.statusBtn(statusFilter === "en attente")} onClick={() => setStatusFilter("en attente")}>En attente</button>
                <button style={styles.statusBtn(statusFilter === "refusee")} onClick={() => setStatusFilter("refusee")}>Refusées</button>
            </div>

            <div style={styles.grid}>
                {annonces.map((annonce) => (
                    <div
                        key={annonce.id}
                        className="annonce-card"
                        style={styles.card}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/annonces/${annonce.id}`)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(`/annonces/${annonce.id}`);
                            }
                        }}
                    >
                        <img src={annonce.image} alt={annonce.title} style={styles.cardImage} />
                        <div style={styles.blurLayer} />
                        <div style={styles.gradientLayer} />
                        <div style={styles.statusBadge(normalizeStatus(annonce.status))}>{String(annonce.status).toUpperCase()}</div>
                        <div style={styles.cardOverlay}>
                            <div style={styles.titlePriceRow}>
                                <h3 style={styles.cardTitle}>{annonce.title}</h3>
                                <div style={styles.pricePill}>
                                    {annonce.type === "don" ? "GRATUIT" : `${annonce.price || 0} €`}
                                </div>
                            </div>
                            <p style={styles.description}>{annonce.city || "Ville non définie"} · Publiée le {annonce.date || "date inconnue"}</p>
                            <p style={styles.authorLine}>Par {getAnnonceAuthor(annonce)}</p>
                            <div style={styles.tagsRow}>
                                {annonce.category && <span style={styles.tag}>{annonce.category}</span>}
                                <span style={styles.tag}>{annonce.type === "don" ? "Don" : "Vente"}</span>
                            </div>
                            
                            {annonce.photos && annonce.photos.length > 0 && (
                                <div style={styles.thumbnailsRow}>
                                    {annonce.photos.slice(0, 5).map((photo, i) => (
                                        <img 
                                            key={i} 
                                            src={photo} 
                                            alt={`Thumbnail ${i}`} 
                                            style={styles.thumbnail} 
                                        />
                                    ))}
                                    {annonce.photos.length > 5 && (
                                        <div style={{ ...styles.thumbnail, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.1)", fontSize: "0.75rem", color: "white", fontWeight: "700" }}>
                                            +{annonce.photos.length - 5}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={styles.cardActions}>
                                <button
                                    className="moderation-action-btn"
                                    style={styles.actionBtn("accept")}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setStatus(annonce.id, "actif");
                                    }}
                                >
                                    Valider
                                </button>
                                <button
                                    className="moderation-action-btn"
                                    style={styles.actionBtn("reject")}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setStatus(annonce.id, "refusee");
                                    }}
                                >
                                    Refuser
                                </button>
                                <button
                                    className="moderation-action-btn"
                                    style={styles.actionBtn("view")}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/annonces/${annonce.id}`);
                                    }}
                                >
                                    Détail
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .annonce-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                }

                .moderation-action-btn:hover {
                    background: var(--btn-hover-bg);
                }
            `}</style>
        </div>
    );
}

export default function ModerationPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <ModerationContent />
        </Suspense>
    );
}
