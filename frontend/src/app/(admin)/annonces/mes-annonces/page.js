"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
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
    Check
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
    statusBadge: (status) => ({
        position: "absolute",
        top: "14px",
        right: "14px",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "0.72rem",
        fontWeight: "700",
        background: status === "vendu" ? "rgba(0,0,0,0.65)" :
            status === "actif" ? "rgba(255,255,255,0.18)" :
            status === "en attente" ? "rgba(62,104,108,0.2)" :
            "rgba(35,59,61,0.22)",
        color: status === "vendu" ? "white" :
            status === "actif" ? "white" :
            status === "en attente" ? "#EAF5F4" :
            status === "refusee" ? "#ff8080" :
            "#EAF5F4",
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
    thumbnailsRow: {
        display: "flex",
        gap: "8px",
        marginTop: "4px",
        marginBottom: "6px",
        width: "100%",
    },
    thumbnail: {
        width: "42px",
        height: "42px",
        borderRadius: "10px",
        objectFit: "cover",
        border: "1px solid rgba(255,255,255,0.3)",
        background: "rgba(0,0,0,0.2)",
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
    },
    kpiStrip: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.5rem",
    },
    kpiCard: {
        background: "#F7F8F7",
        borderRadius: "16px",
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
    },
    kpiLabel: {
        margin: 0,
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        lineHeight: "1.2",
    },
    kpiValue: {
        margin: "0.1rem 0 0",
        fontSize: "1.05rem",
        fontWeight: "700",
        color: "var(--text-main)",
    }
};

const MOCK_ANNONCES = [
    {
        id: 1,
        title: "Table basse en chêne massif",
        type: "vente",
        price: 45,
        city: "Paris",
        date: "12 Mars 2026",
        status: "actif",
        authorName: "Marie Dubois",
        category: "Mobilier",
        image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=500&auto=format&fit=crop"
    },
    {
        id: 2,
        title: "Vélo vintage Peugeot",
        type: "don",
        price: 0,
        city: "Lyon",
        date: "10 Mars 2026",
        status: "en attente",
        authorName: "Thomas Renaud",
        category: "Sport",
        image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=500&auto=format&fit=crop"
    },
    {
        id: 3,
        title: "Lot de chaises scandinaves",
        type: "vente",
        price: 120,
        city: "Bordeaux",
        date: "05 Mars 2026",
        status: "refusee",
        authorName: "Sophie Martin",
        category: "Mobilier",
        image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=500&auto=format&fit=crop"
    },
    {
        id: 4,
        title: "Plante Monstera XL",
        type: "don",
        price: 0,
        city: "Nantes",
        date: "01 Mars 2026",
        status: "actif",
        authorName: "Lucas Petit",
        category: "Jardin",
        image: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?q=80&w=500&auto=format&fit=crop"
    }
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

function MesAnnoncesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [annonces, setAnnonces] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastVariant, setToastVariant] = useState("success");
    const [isAdmin, setIsAdmin] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [tokenChecked, setTokenChecked] = useState(false);

    const loadUserRole = async () => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            const response = await fetch(apiUrl("/auth/me"), {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setIsAdmin(data?.user?.role === "admin");
            }
        } catch (err) {}
        setTokenChecked(true);
    };

    const fetchAnnonces = async () => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        try {
            const url = isAdmin ? apiUrl("/admin/items?status=actif") : apiUrl("/my-items");
            const response = await fetch(url, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                const allItems = data.items || [];
                // Ne pas afficher les brouillons dans "Mes annonces"
                const filtered = isAdmin ? allItems : allItems.filter(a => a.status !== "brouillon");
                setAnnonces(filtered);
            }
        } catch (err) {
            console.error("Failed to fetch ads", err);
        }
    };

    useEffect(() => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        const init = async () => {
            await loadUserRole();
            // Le rôle est maintenant connu, on peut fetch
        };
        init();

        // Vérifier le paramètre de succès
        if (searchParams.get("success") === "true") {
            setToastVariant("success");
            setToastMessage("Votre annonce a bien été mise en ligne !");
            setShowToast(true);
            const timer = setTimeout(() => {
                setShowToast(false);
                router.replace("/annonces/mes-annonces");
            }, 5000);
            return () => clearTimeout(timer);
        }
        if (searchParams.get("info") === "no_changes") {
            setToastVariant("info");
            setToastMessage("Aucune modification enregistrée.");
            setShowToast(true);
            const timer = setTimeout(() => {
                setShowToast(false);
                router.replace("/annonces/mes-annonces");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, router]);

    useEffect(() => {
        if (tokenChecked) {
            fetchAnnonces();
        }
    }, [isAdmin, tokenChecked]);


    const handleDelete = (id) => {
        setDeleteTargetId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;

        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            const url = isAdmin ? apiUrl(`/admin/items/${deleteTargetId}`) : apiUrl(`/items/${deleteTargetId}`);
            const response = await fetch(url, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                // Supprimer localement du state
                setAnnonces(prev => prev.filter(a => a.id !== deleteTargetId));

                // Supprimer du localStorage si elle y était
                const localData = JSON.parse(localStorage.getItem("user_annonces") || "[]");
                const nextLocalData = localData.filter(a => a.id !== deleteTargetId);
                localStorage.setItem("user_annonces", JSON.stringify(nextLocalData));

                // Fermer la modal
                setShowDeleteModal(false);
                setDeleteTargetId(null);
            } else {
                alert("Erreur lors de la suppression de l'annonce.");
            }
        } catch (err) {
            alert("Erreur réseau: " + err.message);
        }
    };

    const handleEdit = (id) => {
        router.push(`/annonces/deposer?id=${id}`);
    };

    const filteredAnnonces = annonces.filter(annonce => {
        const matchesSearch = (annonce.title || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === "" || annonce.type === filterType;
        const matchesStatus = filterStatus === "" || normalizeStatus(annonce.status) === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    const activeAnnonces = annonces.filter((annonce) => normalizeStatus(annonce.status) === "actif");
    const activeVentes = activeAnnonces.filter((annonce) => annonce.type === "vente").length;
    const activeDons = activeAnnonces.filter((annonce) => annonce.type === "don").length;
    const activeCities = new Set(activeAnnonces.map((annonce) => annonce.city).filter(Boolean)).size;
    const avgPrice = activeVentes > 0
        ? Math.round(
            activeAnnonces
                .filter((annonce) => annonce.type === "vente")
                .reduce((sum, annonce) => sum + (Number(annonce.price) || 0), 0) / activeVentes
        )
        : 0;

    return (
        <div style={styles.container}>
            {showToast && (
                <div style={{
                    ...styles.toast,
                    background: toastVariant === "info" ? "rgba(35,59,61,0.92)" : "var(--black)",
                }}>
                    <div style={{
                        background: toastVariant === "info" ? "rgba(255,255,255,0.15)" : "var(--green-leaf)",
                        borderRadius: "50%",
                        padding: "2px",
                        display: "flex",
                    }}>
                        <Check size={16} color={toastVariant === "info" ? "rgba(255,255,255,0.85)" : "var(--black)"} />
                    </div>
                    <span style={{ fontWeight: "500", fontSize: "0.95rem" }}>{toastMessage}</span>
                </div>
            )}
            <header style={styles.header}>
                <div>
                    <p className="activities-label">{isAdmin ? "Espace Admin" : "Espace Particulier"}</p>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.5rem 0", letterSpacing: "-0.02em" }}>{isAdmin ? "Annonces actives" : "Mes annonces"}</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>{isAdmin ? "Vue des annonces actuellement actives sur la plateforme." : "Gérez vos publications et suivez vos échanges."}</p>
                </div>
                {!isAdmin && (
                    <button
                        className="action-btn primary"
                        style={{ padding: "0.8rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}
                        onClick={() => router.push("/annonces/deposer")}
                    >
                        <Plus size={20} />
                        <span>Placer une annonce</span>
                    </button>
                )}
            </header>

            {isAdmin && (
                <section style={styles.kpiStrip}>
                    <article style={styles.kpiCard}>
                        <Check size={18} color="var(--forest-deep)" />
                        <div>
                            <p style={styles.kpiLabel}>Annonces actives</p>
                            <p style={styles.kpiValue}>{activeAnnonces.length}</p>
                        </div>
                    </article>
                    <article style={styles.kpiCard}>
                        <Tag size={18} color="var(--forest-deep)" />
                        <div>
                            <p style={styles.kpiLabel}>Ventes actives</p>
                            <p style={styles.kpiValue}>{activeVentes}</p>
                        </div>
                    </article>
                    <article style={styles.kpiCard}>
                        <Gift size={18} color="var(--forest-deep)" />
                        <div>
                            <p style={styles.kpiLabel}>Dons actifs</p>
                            <p style={styles.kpiValue}>{activeDons}</p>
                        </div>
                    </article>
                    <article style={styles.kpiCard}>
                        <MapPin size={18} color="var(--forest-deep)" />
                        <div>
                            <p style={styles.kpiLabel}>Villes couvertes</p>
                            <p style={styles.kpiValue}>{activeCities}</p>
                        </div>
                    </article>
                    <article style={styles.kpiCard}>
                        <Calendar size={18} color="var(--forest-deep)" />
                        <div>
                            <p style={styles.kpiLabel}>Prix moyen vente</p>
                            <p style={styles.kpiValue}>{avgPrice} €</p>
                        </div>
                    </article>
                </section>
            )}

            <div style={styles.filtersRow}>
                <div style={styles.searchContainer}>
                    <input
                        style={styles.searchInput}
                        placeholder="Rechercher une annonce..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    style={styles.filterSelect}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="">Tous les types</option>
                    <option value="don">Don</option>
                    <option value="vente">Vente</option>
                </select>

                {!isAdmin && (
                    <select
                        style={styles.filterSelect}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">Tous les statuts</option>
                        <option value="actif">Actif</option>
                        <option value="vendu">Vendu</option>
                        <option value="en attente">En attente</option>
                    </select>
                )}
            </div>

            <div style={styles.grid}>
                {filteredAnnonces.map((annonce) => {
                    const statusKey = normalizeStatus(annonce.status);
                    const workflowKey = String(annonce.workflowStatus || "").toLowerCase();
                    const isAfterDeposit = ["deposited", "available", "pending_payment", "reserved", "picked_up"].includes(workflowKey);
                    const isCancelled = workflowKey === "cancelled";
                    const canEdit = !isAdmin && !isCancelled && statusKey !== "vendu" && !isAfterDeposit;
                    const canDelete = !isAdmin && ["brouillon", "refusee", "desactivee", "desactive"].includes(statusKey) && !isCancelled;

                    return (
                    <div
                        key={annonce.__listKey || annonce.id}
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
                        <div style={styles.statusBadge(annonce.status)}>
                            {annonce.status.toUpperCase()}
                        </div>
                        <div style={styles.cardOverlay}>
                            <div style={styles.titlePriceRow}>
                                <h3 style={styles.cardTitle}>{annonce.title}</h3>
                                <div style={styles.pricePill}>
                                    {annonce.type === "don" ? "GRATUIT" : `${annonce.price} €`}
                                </div>
                            </div>
                            <p style={styles.description}>
                                {annonce.city} · Publiée le {annonce.date}
                            </p>
                            {isAdmin && (
                                <p style={{ ...styles.description, color: "rgba(255,255,255,0.86)" }}>
                                    Par {getAnnonceAuthor(annonce)}
                                </p>
                            )}
                            <div style={styles.tagsRow}>
                                <span style={styles.tag}>{annonce.type === "don" ? "Don" : "Vente"}</span>
                                {annonce.workflowStatus && (() => {
                                    const wfColor =
                                        annonce.workflowStatus === 'validated'         ? '#6366f1' :
                                        annonce.workflowStatus === 'assigned'          ? '#8b5cf6' :
                                        annonce.workflowStatus === 'deposit_code_sent' ? '#f59e0b' :
                                        annonce.workflowStatus === 'deposited'         ? '#10b981' :
                                        annonce.workflowStatus === 'available'         ? '#059669' :
                                        annonce.workflowStatus === 'pending_payment'   ? '#d97706' :
                                        annonce.workflowStatus === 'reserved'          ? '#ec4899' :
                                        annonce.workflowStatus === 'collected'         ? '#2563eb' :
                                        annonce.workflowStatus === 'picked_up'         ? '#475569' :
                                        annonce.workflowStatus === 'deposit_expired'   ? '#ef4444' :
                                        '#94a3b8';
                                    const wfLabel =
                                        annonce.workflowStatus === 'validated'         ? 'Sortie modération' :
                                        annonce.workflowStatus === 'assigned'          ? 'Génération du code de dépôt' :
                                        annonce.workflowStatus === 'deposit_code_sent' ? `À déposer (${annonce.depositCode})` :
                                        annonce.workflowStatus === 'deposited'         ? 'Déposé' :
                                        annonce.workflowStatus === 'available'         ? 'Disponible' :
                                        annonce.workflowStatus === 'pending_payment'   ? 'Paiement en attente' :
                                        annonce.workflowStatus === 'reserved'          ? 'Réservé' :
                                        annonce.workflowStatus === 'collected'         ? 'Récupéré' :
                                        annonce.workflowStatus === 'picked_up'         ? 'Terminé' : 'En transit';
                                    return (
                                        <span style={{ ...styles.tag, background: `${wfColor}28`, color: wfColor, border: `1px solid ${wfColor}50` }}>
                                            {wfLabel}
                                        </span>
                                    );
                                })()}
                            </div>

                            {isAdmin && annonce.photos && annonce.photos.length > 0 && (
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
                                {canEdit && (
                                    <button
                                        className="action-btn-card"
                                        style={styles.actionBtn}
                                        title="Éditer"
                                        onClick={(e) => { e.stopPropagation(); handleEdit(annonce.id); }}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        className="action-btn-card"
                                        style={styles.actionBtn}
                                        title="Supprimer"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(annonce.id); }}
                                    >
                                        <Trash2 size={16} color="#ff8080" />
                                    </button>
                                )}
                                <button
                                    className="view-btn-card"
                                    style={styles.viewBtn}
                                    onClick={(e) => { e.stopPropagation(); router.push(`/annonces/${annonce.id}`); }}
                                >
                                    Voir l'annonce
                                </button>
                            </div>
                        </div>
                    </div>
                )})}
            </div>

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
                            Supprimer cette annonce ?
                        </h3>
                        <p style={{ margin: "0 0 2rem", color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                            Cette action est irréversible. L'annonce sera supprimée de vos publications et du site.
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

export default function MesAnnoncesPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <MesAnnoncesContent />
        </Suspense>
    );
}
