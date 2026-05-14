"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
import { formatBuyerCardPrice } from "../../../lib/salePrice";
import {
    Tag,
    Gift,
    MapPin,
    Calendar,
    MoreHorizontal,
    ExternalLink,
    Pencil,
    Trash2,
    Search,
    Filter,
    Plus,
    Check,
    FileText
} from "lucide-react";

// Styles locaux
const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    header: {
        marginBottom: "2.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    filtersRow: {
        display: "flex",
        gap: "1rem",
        marginBottom: "2rem",
        alignItems: "center",
    },
    searchContainer: {
        position: "relative",
        flex: 1,
        maxWidth: "300px",
    },
    searchInput: {
        width: "100%",
        padding: "0.6rem 1.2rem",
        borderRadius: "999px",
        border: "none",
        background: "rgb(229, 255, 188)",
        fontSize: "0.9rem",
        outline: "none",
        color: "var(--text-main)",
        fontFamily: "inherit",
    },
    filterSelect: {
        border: "none",
        borderRadius: "999px",
        padding: "0.6rem 2.4rem 0.6rem 1.2rem",
        background: "rgb(229, 255, 188)",
        color: "var(--text-main)",
        fontFamily: "inherit",
        fontSize: "0.9rem",
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232b4548%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.9rem center",
        backgroundSize: "0.65rem auto",
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
        background: "#E5FFBC",
        color: "var(--forest-deep)",
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
        color: "rgba(255,255,255,0.7)",
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
    actionBtn: {
        padding: "9px",
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "white",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    toast: {
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        background: "var(--black)",
        color: "white",
        padding: "1rem 1.5rem",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        zIndex: 1000,
        animation: "slideUp 0.3s ease-out",
    }
};

function BrouillonsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [annonces, setAnnonces] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return () => {
            isMounted = false;
        };

        const loadUserRole = async () => {
            try {
                const response = await fetch(apiUrl("/auth/me"), {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) return;
                const data = await response.json();
                const admin = data?.user?.role === "admin";
                if (!isMounted) return;

                setIsAdmin(admin);
                if (admin) {
                    router.replace("/annonces/moderation");
                }
            } catch {
                // Le layout gère déjà l'auth, on reste silencieux ici.
            }
        };

        loadUserRole();
        return () => {
            isMounted = false;
        };
    }, [router]);

    const fetchAnnonces = async () => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            const response = await fetch(apiUrl("/my-items"), {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                const allItems = data.items || [];
                // Ne garder que les brouillons
                const draftsOnly = allItems.filter(a => a.status === "brouillon");
                setAnnonces(draftsOnly);
            }
        } catch (err) {
            console.error("Failed to fetch drafts", err);
        }
    };

    // Charger les annonces au montage du composant
    useEffect(() => {
        if (!isAdmin) {
            fetchAnnonces();
        }
    }, [isAdmin]);

    useEffect(() => {
        if (searchParams.get("success") === "true") {
            setShowToast(true);
            const timer = setTimeout(() => {
                setShowToast(false);
                router.replace("/annonces/brouillons");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, router]);

    const handleDelete = (id) => {
        setDeleteTargetId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;

        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            const response = await fetch(apiUrl(`/items/${deleteTargetId}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                setAnnonces(prev => prev.filter(a => a.id !== deleteTargetId));
                setShowDeleteModal(false);
                setDeleteTargetId(null);
            } else {
                alert("Erreur lors de la suppression du brouillon.");
            }
        } catch (err) {
            alert("Erreur réseau: " + err.message);
        }
    };

    const handleEdit = (id) => {
        router.push(`/annonces/deposer?id=${id}`);
    };

    const filteredAnnonces = annonces.filter(annonce =>
        annonce.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={styles.container}>
            {showToast && (
                <div style={styles.toast}>
                    <div style={{ background: "var(--green-leaf)", borderRadius: "50%", padding: "2px", display: "flex" }}>
                        <Check size={16} color="var(--black)" />
                    </div>
                    <span style={{ fontWeight: "500", fontSize: "0.95rem" }}>Votre brouillon a bien été enregistré !</span>
                </div>
            )}
            <header style={styles.header}>
                <div>
                    <p className="activities-label">{isAdmin ? "Espace Admin" : "Espace Particulier"}</p>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.5rem 0", letterSpacing: "-0.02em" }}>Mes brouillons</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Annonces en cours de rédaction.</p>
                </div>
                <button
                    className="action-btn primary"
                    style={{ padding: "0.8rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}
                    onClick={() => window.location.href = "/annonces/deposer"}
                >
                    <Plus size={20} />
                    <span>Nouveau brouillon</span>
                </button>
            </header>

            <div style={styles.filtersRow}>
                <div style={styles.searchContainer}>
                    <input
                        style={styles.searchInput}
                        placeholder="Rechercher dans mes brouillons..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredAnnonces.length === 0 ? (
                <div className="panel" style={{ textAlign: "center", padding: "4rem 2rem", background: "white" }}>
                    <div style={{ marginBottom: "1rem", color: "var(--text-muted)" }}><FileText size={48} strokeWidth={1.5} /></div>
                    <h3 style={{ marginBottom: "0.5rem" }}>Aucun brouillon</h3>
                    <p style={{ color: "var(--text-muted)" }}>Vous n'avez pas de brouillons en cours de rédaction.</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredAnnonces.map((annonce) => (
                        <div
                            key={annonce.id}
                            className="annonce-card"
                            style={{ ...styles.card, cursor: "pointer" }}
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
                            <img
                                src={annonce.image}
                                alt={annonce.title}
                                style={styles.cardImage}
                            />
                            <div style={styles.blurLayer} />
                            <div style={styles.gradientLayer} />
                            <div style={styles.statusBadge}>
                                BROUILLON
                            </div>
                            <div style={styles.cardOverlay}>
                                <div style={styles.titlePriceRow}>
                                    <h3 style={styles.cardTitle}>{annonce.title}</h3>
                                    <div style={styles.pricePill}>
                                        {annonce.type === "don" ? "GRATUIT" : formatBuyerCardPrice(annonce)}
                                    </div>
                                </div>
                                <p style={styles.description}>
                                    {annonce.city || "Ville non définie"} · Créé le {annonce.date}
                                </p>
                                {annonce.category && (
                                    <div style={styles.tagsRow}>
                                        <span style={styles.tag}>{annonce.category}</span>
                                        <span style={styles.tag}>{annonce.type === "don" ? "Don" : "Vente"}</span>
                                    </div>
                                )}
                                <div style={styles.cardActions}>
                                    <button
                                        className="action-btn-card"
                                        style={styles.actionBtn}
                                        title="Éditer"
                                        onClick={(e) => { e.stopPropagation(); handleEdit(annonce.id); }}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        className="action-btn-card"
                                        style={styles.actionBtn}
                                        title="Supprimer"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(annonce.id); }}
                                    >
                                        <Trash2 size={16} color="#ff8080" />
                                    </button>
                                    <button
                                        className="view-btn-card"
                                        style={styles.viewBtn}
                                        onClick={(e) => { e.stopPropagation(); handleEdit(annonce.id); }}
                                    >
                                        Continuer l'edition
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showDeleteModal && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: "white",
                        borderRadius: "20px",
                        padding: "2rem",
                        maxWidth: "420px",
                        width: "90%",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
                        animation: "fadeIn 0.2s ease-out",
                    }}>
                        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: "600", color: "var(--text-main)" }}>
                            Supprimer ce brouillon ?
                        </h3>
                        <p style={{ margin: "0 0 2rem", color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                            Cette action est irréversible. Le brouillon sera supprimé définitivement.
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteTargetId(null);
                                }}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "12px",
                                    border: "1px solid rgba(35, 59, 61, 0.2)",
                                    background: "#FFFFFF",
                                    color: "var(--text-main)",
                                    fontSize: "0.95rem",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = "#F7F8F7";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = "#FFFFFF";
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDelete}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: "#ff8080",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = "#ff6666";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = "#ff8080";
                                }}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .annonce-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                }
                .action-btn-card:hover {
                    background: rgba(255,255,255,0.24) !important;
                }
                .view-btn-card:hover {
                    background: #e8e8e8 !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default function BrouillonsPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <BrouillonsContent />
        </Suspense>
    );
}
