"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Tag,
    Gift,
    Pencil,
    Share2,
    CheckCircle2,
    Package,
    Eye,
    Bookmark,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    Star,
} from "lucide-react";

const STATUS_LABELS = { actif: "Actif", vendu: "Vendu", "en attente": "En attente", brouillon: "Brouillon", refusee: "Refusee", desactivee: "Desactivee" };
const STATUS_COLORS = {
    actif:        { bg: "rgba(62,104,108,0.12)", color: "var(--forest-deep)" },
    vendu:        { bg: "rgba(35,59,61,0.12)",   color: "var(--text-main)" },
    "en attente": { bg: "rgba(62,104,108,0.12)", color: "var(--forest-deep)" },
    brouillon:    { bg: "rgba(35,59,61,0.08)",   color: "var(--text-main)" },
    refusee:      { bg: "var(--state-critical-bg)",  color: "var(--state-critical)" },
    desactivee:   { bg: "rgba(35,59,61,0.16)",   color: "var(--text-main)" },
};

const normalizeStatus = (status) => {
    if (!status) return "en attente";
    const value = String(status).toLowerCase();
    if (value === "refuse" || value === "refusee" || value === "refusée") return "refusee";
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

const getInitials = (name) => {
    if (!name) return "AU";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "AU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const MOCK_ANNONCES = [
    {
        id: 1,
        title: "Table basse en ch\u00eane massif",
        type: "vente",
        price: 45,
        city: "Paris",
        zip: "75011",
        date: "12 Mars 2026",
        status: "actif",
        category: "Mobilier",
        image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=900&auto=format&fit=crop",
        description: "Belle table basse en ch\u00eane massif, style industriel. Tr\u00e8s bon \u00e9tat g\u00e9n\u00e9ral, quelques l\u00e9g\u00e8res marques d'usage sur le plateau. Dimensions\u00a0: 120\u00a0\u00d7\u00a060\u00a0\u00d7\u00a040 cm. Id\u00e9ale pour un salon moderne ou scandinave. Achet\u00e9e neuve 280\u00a0\u20ac.\n\nPossibilit\u00e9 de remise en main propre \u00e0 Paris 11e, ou envoi en Colissimo (frais \u00e0 la charge de l'acheteur).",
        seller: { name: "Marie D.", rating: 4.8, reviews: 23, since: "2024" },
        views: 142,
        savesCount: 19,
        interestedCount: 6,
        condition: "Bon \u00e9tat",
        photos: [
            "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=500&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=500&auto=format&fit=crop",
        ],
    },
    {
        id: 2,
        title: "V\u00e9lo vintage Peugeot",
        type: "don",
        price: 0,
        city: "Lyon",
        zip: "69003",
        date: "10 Mars 2026",
        status: "actif",
        category: "Sport",
        image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=900&auto=format&fit=crop",
        description: "V\u00e9lo de ville Peugeot ann\u00e9es 80, cadre acier, 5 vitesses. Fonctionnel mais n\u00e9cessite un peu d'entretien (c\u00e2bles de frein \u00e0 v\u00e9rifier). Don contre bonne r\u00e9utilisation, pas de revente.\n\nRemise en main propre uniquement sur Lyon 3e, week-ends uniquement.",
        seller: { name: "Thomas R.", rating: 4.5, reviews: 11, since: "2025" },
        views: 87,
        savesCount: 11,
        interestedCount: 3,
        condition: "\u00c9tat passable",
        photos: [
            "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=900&auto=format&fit=crop",
        ],
    },
    {
        id: 3,
        title: "Lot de chaises scandinaves",
        type: "vente",
        price: 120,
        city: "Bordeaux",
        zip: "33000",
        date: "05 Mars 2026",
        status: "vendu",
        category: "Mobilier",
        image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=900&auto=format&fit=crop",
        description: "Lot de 4 chaises style scandinave, pieds en bois naturel et assise tissu gris clair. Achet\u00e9es il y a 2 ans, tr\u00e8s bon \u00e9tat. Vendues ensemble uniquement.",
        seller: { name: "Sophie M.", rating: 5.0, reviews: 38, since: "2023" },
        views: 210,
        savesCount: 28,
        interestedCount: 9,
        condition: "Tr\u00e8s bon \u00e9tat",
        photos: [
            "https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=900&auto=format&fit=crop",
        ],
    },
    {
        id: 4,
        title: "Plante Monstera XL",
        type: "don",
        price: 0,
        city: "Nantes",
        zip: "44000",
        date: "01 Mars 2026",
        status: "actif",
        category: "Jardin",
        image: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?q=80&w=900&auto=format&fit=crop",
        description: "Monstera Deliciosa en tr\u00e8s belle forme, pot de 30 cm, hauteur approximative 1m20. Elle pousse vite et est en bonne sant\u00e9. Je donne car je d\u00e9m\u00e9nage en appartement plus petit.\n\n\u00c0 r\u00e9cup\u00e9rer \u00e0 Nantes centre, vous devez venir avec votre propre protection pour le transport.",
        seller: { name: "Lucas P.", rating: 4.9, reviews: 7, since: "2025" },
        views: 63,
        savesCount: 8,
        interestedCount: 2,
        condition: "Excellent \u00e9tat",
        photos: [
            "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?q=80&w=900&auto=format&fit=crop",
        ],
    },
];

// -- Shared inline styles ------------------------------------------------------
const card = {
    background: "transparent",
    borderRadius: "0",
    padding: "0",
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
    "--btn-bg": tone === "primary" ? "var(--forest-deep)" : tone === "danger" ? "var(--state-critical-bg)" : "transparent",
    "--btn-hover-bg": tone === "primary" ? "#33575a" : tone === "danger" ? "#FFD6C9" : "rgba(35,59,61,0.06)",
    "--btn-border": tone === "neutral" ? "1px solid rgba(35,59,61,0.12)" : "none",
    "--btn-hover-border": tone === "neutral" ? "1px solid rgba(35,59,61,0.18)" : "none",
    "--btn-color": tone === "primary" ? "white" : tone === "danger" ? "var(--state-critical)" : "var(--text-main)",
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

// -- Component -----------------------------------------------------------------
function AnnonceDetailContent() {
    const params             = useParams();
    const router             = useRouter();
    const [annonce,      setAnnonce]      = useState(null);
    const [activePhoto,  setActivePhoto]  = useState(0);
    const [isAdmin,      setIsAdmin]      = useState(false);
    const [showSoldModal, setShowSoldModal] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [deactivateReason, setDeactivateReason] = useState("");
    const [deactivateDetails, setDeactivateDetails] = useState("");
    const [authorProfile, setAuthorProfile] = useState({
        name: "Auteur inconnu",
        rating: 0,
        annoncesCount: 0,
        registeredAt: "",
        city: "",
        country: "",
        avatar: "",
    });

    // Les données de catégories, états, et matériaux ne sont plus requises 
    // pour le mapping d'affichage puisque les "labels" font maintenant foi en BDD.

    useEffect(() => {
        let isMounted = true;

        const loadRole = async () => {
            const token = window.localStorage.getItem(TOKEN_KEY);
            if (!token) return;
            try {
                const response = await fetch(apiUrl("/auth/me"), {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) return;
                const data = await response.json();
                if (isMounted) {
                    setIsAdmin(data?.user?.role === "admin");
                }
            } catch {
                // Layout gère deja les cas d'auth.
            }
        };

        loadRole();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const fetchDetail = async () => {
            const token = window.localStorage.getItem(TOKEN_KEY);
            try {
                const response = await fetch(apiUrl(`/items/${params.id}`), {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setAnnonce({ ...data, status: normalizeStatus(data.status) });
                }
            } catch (err) {
                console.error("Failed to fetch ad detail", err);
            }
        };

        if (params.id) {
            fetchDetail();
        }
    }, [params.id]);

    useEffect(() => {
        if (!annonce) return;

        const local = JSON.parse(localStorage.getItem("user_annonces") || "[]");
        const allAnnonces = [...local, ...MOCK_ANNONCES];
        const name = getAnnonceAuthor(annonce);
        const authorKey = String(name || "").trim().toLowerCase();

        const related = allAnnonces.filter((item) => String(getAnnonceAuthor(item) || "").trim().toLowerCase() === authorKey);
        const annoncesCount = related.length || 1;

        setAuthorProfile({
            name,
            rating: Number(annonce?.seller?.rating || annonce?.authorRating || 0),
            annoncesCount,
            registeredAt: String(
                annonce?.userRegistrationDate || 
                annonce?.seller?.since || 
                annonce?.authorSince || 
                annonce?.registeredAt || 
                ""
            ),
            city: String(
                annonce?.seller?.city ||
                annonce?.authorCity ||
                annonce?.city ||
                ""
            ),
            country: String(
                annonce?.seller?.country ||
                annonce?.authorCountry ||
                annonce?.country ||
                ""
            ),
            avatar: annonce?.seller?.avatar || annonce?.authorAvatar || "",
        });
    }, [annonce]);

    if (!annonce) return (
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
            Annonce introuvable.
        </div>
    );

    const photos = annonce.photos?.length ? annonce.photos : [annonce.image];
    const isDon  = annonce.type === "don";

    const persistAnnonceUpdate = async (patch) => {
        const normalizedPatch = patch.status ? { ...patch, status: normalizeStatus(patch.status) } : patch;
        const token = window.localStorage.getItem(TOKEN_KEY);
        
        try {
            const response = await fetch(apiUrl(`/admin/items/${annonce.id}/status`), {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: normalizedPatch.status })
            });

            if (response.ok) {
                setAnnonce({ ...annonce, ...normalizedPatch });
            }
        } catch (err) {
            alert("Erreur lors de la mise à jour : " + err.message);
        }
    };

    const setAsDraft = () => {
        if (annonce.status === "brouillon") {
            router.push("/annonces/brouillons");
            return;
        }
        persistAnnonceUpdate({ status: "brouillon" });
        router.push("/annonces/brouillons");
    };

    const markAsSold = () => {
        if (annonce.status === "vendu") return;
        setShowSoldModal(true);
    };

    const confirmSold = () => {
        persistAnnonceUpdate({ status: "vendu" });
        setShowSoldModal(false);
    };

    const setAsActive = () => {
        persistAnnonceUpdate({ status: "actif" });
    };

    const setAsRejected = () => {
        persistAnnonceUpdate({ status: "refusee" });
    };

    const deactivateAnnonce = () => {
        const reason = deactivateReason.trim();
        if (!reason) {
            alert("Veuillez renseigner un motif de desactivation.");
            return;
        }

        persistAnnonceUpdate({
            status: "desactivee",
            moderationNote: reason,
            moderationDetails: deactivateDetails.trim(),
            moderatedAt: new Date().toISOString(),
        });

        setShowDeactivateModal(false);
        setDeactivateReason("");
        setDeactivateDetails("");
    };

    const copyShareLink = async () => {
        const link = typeof window !== "undefined" ? window.location.href : "";
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            alert("Lien de l'annonce copie.");
        } catch {
            alert("Impossible de copier le lien automatiquement.");
        }
    };

    const goToEditAnnonce = () => {
        try {
            const existingAnnonces = JSON.parse(localStorage.getItem("user_annonces") || "[]");
            const alreadyExists = existingAnnonces.some((a) => String(a.id) === String(annonce.id));

            if (!alreadyExists) {
                const normalized = {
                    ...annonce,
                    category: annonce.category || "",
                    condition: annonce.condition || "",
                    material: annonce.material || "",
                    quantity: annonce.quantity || "1",
                    deliveryMode: annonce.deliveryMode || "main_propre",
                    dimensions: annonce.dimensions || "",
                };
                localStorage.setItem("user_annonces", JSON.stringify([normalized, ...existingAnnonces]));
            }
        } catch {}

        router.push(`/annonces/deposer?id=${annonce.id}`);
    };

    const prev = () => setActivePhoto(i => (i - 1 + photos.length) % photos.length);
    const next = () => setActivePhoto(i => (i + 1) % photos.length);
    const statusKey = normalizeStatus(annonce.status);
    const statusLabel = STATUS_LABELS[statusKey] || statusKey;
    const descriptionParts = (annonce.description || "Aucune description fournie.").split("\n\n");
    const savesCount = Number(annonce.savesCount || 0);
    const interestedCount = Number(annonce.interestedCount || 0);
    const authorName = getAnnonceAuthor(annonce);
    const sc = STATUS_COLORS[statusKey] || STATUS_COLORS.actif;
    const authorRating = Math.max(0, Math.min(5, Number(authorProfile.rating || 0)));
    const roundedStars = Math.round(authorRating);
    const registrationDisplay = (() => {
        const raw = String(authorProfile.registeredAt || "").trim();
        if (!raw) return "N/A";
        
        // Si c'est déjà au format JJ/MM/AAAA, on le garde tel quel
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
        
        // Si c'est juste une année (ex: "2024")
        if (/^\d{4}$/.test(raw)) return raw;

        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
        }
        return raw;
    })();
    const locationDisplay = [authorProfile.city, authorProfile.country].filter(Boolean).join(", ") || "N/A";

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
                        <ArrowLeft size={16} /> {isAdmin ? "Retour admin" : "Mes annonces"}
                    </button>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{
                            display: "inline-flex", alignItems: "center", padding: "5px 11px",
                            borderRadius: "999px", fontSize: "0.72rem", letterSpacing: "0.05em",
                            fontWeight: "700", background: sc.bg, color: sc.color,
                        }}>{statusLabel}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            <Eye size={12} /> {annonce.views || 0} vues
                        </span>
                        <button onClick={copyShareLink} style={{
                            display: "inline-flex", alignItems: "center", gap: "0.4rem",
                            background: "var(--surface-hover)", border: "none",
                            color: "var(--text-main)", fontSize: "0.78rem", fontWeight: "600",
                            padding: "6px 12px", borderRadius: "999px", cursor: "pointer",
                            transition: "background 0.2s"
                        }}>
                            <Share2 size={13} /> Copier le lien
                        </button>
                    </div>
                </div>

                <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(360px, 0.8fr)", gap: "1.5rem", alignItems: "stretch" }}>
                    <div style={{ background: "var(--black)", borderRadius: "28px", padding: "1rem", border: "1px solid rgba(18, 25, 26, 0.08)" }}>
                        <div style={{ borderRadius: "22px", overflow: "hidden", background: "#12191A", position: "relative" }}>
                            <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
                                <img
                                    src={photos[activePhoto]}
                                    alt={annonce.title}
                                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}
                                />

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
                                                        position: "relative"
                                                    }}
                                                >
                                                    <img src={p} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gap: "0.85rem", gridTemplateRows: "1fr auto", height: "100%" }}>
                        <div style={{ background: "#F7F8F7", borderRadius: "24px", padding: "1.15rem", border: "none", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
                            <div>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.45rem" }}>{isAdmin ? "Vue administrateur" : "Votre annonce"}</div>
                            <h1 style={{ fontSize: "1.74rem", fontWeight: "700", color: "var(--text-main)", margin: "0 0 0.42rem", lineHeight: "1.12", letterSpacing: "-0.03em" }}>{annonce.title}</h1>
                            <div style={{ fontSize: isDon ? "1.5rem" : "1.62rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "0.7rem" }}>{isDon ? "Gratuit" : `${annonce.price} EUR`}</div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", color: "var(--text-muted)", fontSize: "0.84rem", marginBottom: "1rem" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><MapPin size={12} /> {annonce.city}{annonce.zip ? ` · ${annonce.zip}` : ""}</span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Calendar size={12} /> {annonce.date}</span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><Tag size={12} /> {isDon ? "Don" : "Vente"}</span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", padding: "1rem 0", borderTop: "1px solid rgba(35,59,61,0.08)", borderBottom: "1px solid rgba(35,59,61,0.08)", marginBottom: "1rem" }}>
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Vues</div>
                                    <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--text-main)" }}>{annonce.views || 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                        <Bookmark size={12} /> Sauvegardes
                                    </div>
                                    <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" }}>{savesCount}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                        <MessageCircle size={12} /> Interesses
                                    </div>
                                    <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" }}>{interestedCount}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" }}>Reference</div>
                                    <div style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" }}>#{String(annonce.id).padStart(4, "0")}</div>
                                </div>
                            </div>
                        </div>

                            <div>
                            <div style={{ fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.6rem" }}>{isAdmin ? "Moderation" : "Gestion"}</div>
                            <div style={{ display: "grid", gap: "0.55rem" }}>
                                {isAdmin ? (
                                    <>
                                        {statusKey === "actif" ? (
                                            <button className="action-button action-button-danger" onClick={() => setShowDeactivateModal(true)} style={actionBtn("danger")}>
                                                Desactiver l'annonce
                                            </button>
                                        ) : (
                                            <>
                                                <button className="action-button action-button-primary" onClick={setAsActive} style={actionBtn("primary")}>
                                                    <CheckCircle2 size={16} /> Valider l'annonce
                                                </button>
                                                <button className="action-button action-button-danger" onClick={setAsRejected} style={actionBtn("danger")}>
                                                    Marquer comme refusee
                                                </button>
                                            </>
                                        )}
                                        <button className="action-button action-button-neutral" onClick={() => router.push("/annonces/moderation")} style={actionBtn("neutral")}>
                                            Retour a la moderation
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="action-button action-button-primary" onClick={setAsDraft} style={actionBtn("primary")}>Mettre en brouillon</button>
                                        <button className="action-button action-button-neutral" onClick={goToEditAnnonce} style={actionBtn("neutral")}>
                                            <Pencil size={15} /> Modifier l'annonce
                                        </button>
                                        <button className="action-button action-button-danger" onClick={markAsSold} style={actionBtn("danger")}>
                                            <CheckCircle2 size={16} /> {annonce.status === "vendu" ? "Annonce deja vendue" : "Marquer comme vendue"}
                                        </button>
                                    </>
                                )}
                            </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div style={{
                                background: "#F7F8F7",
                                borderRadius: "20px",
                                padding: "0.95rem 1.05rem",
                                border: "none",
                                display: "grid",
                                gap: "0.7rem",
                            }}>
                                <div style={{ fontSize: "0.68rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                                    Auteur
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                                    {authorProfile.avatar ? (
                                        <img
                                            src={authorProfile.avatar}
                                            alt={authorName}
                                            style={{ width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover", border: "none" }}
                                        />
                                    ) : (
                                        <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "rgba(35,59,61,0.12)", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.82rem", fontWeight: "700" }}>
                                            {getInitials(authorProfile.name)}
                                        </div>
                                    )}

                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: "0.98rem", fontWeight: "700", color: "var(--text-main)", lineHeight: "1.2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {authorProfile.name}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.32rem", marginTop: "0.24rem" }}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={12}
                                                    strokeWidth={2}
                                                    style={{ color: star <= roundedStars ? "#f4b740" : "rgba(35,59,61,0.2)", fill: star <= roundedStars ? "#f4b740" : "transparent" }}
                                                />
                                            ))}
                                            <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", marginLeft: "0.18rem" }}>
                                                {authorRating > 0 ? authorRating.toFixed(1) : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
                                    <div style={{ background: "rgba(255,255,255,0.72)", borderRadius: "12px", padding: "0.55rem 0.65rem", border: "none" }}>
                                        <div style={{ fontSize: "0.64rem", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                                            Nb annonces
                                        </div>
                                        <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)" }}>
                                            {authorProfile.annoncesCount}
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
                        )}
                    </div>
                </div>

                <div className="content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: "3rem", paddingTop: "0.8rem" }}>
                    <section style={{ paddingTop: "0.2rem" }}>
                        <span style={sectionLabel}>Description</span>
                        <div style={{ display: "grid", gap: "1rem", maxWidth: "78ch" }}>
                            <p style={{ fontSize: "0.86rem", lineHeight: "1.7", color: "var(--text-muted)", margin: 0, maxWidth: "62ch" }}>
                                Informations utiles pour la gestion de cette annonce et sa consultation par son proprietaire.
                            </p>
                            {descriptionParts.map((part, index) => (
                                <p key={index} style={{ fontSize: "0.98rem", lineHeight: "1.9", color: "var(--text-main)", margin: 0 }}>
                                    {part}
                                </p>
                            ))}
                        </div>
                    </section>

                    <section style={{ paddingTop: "0.2rem" }}>
                        <span style={sectionLabel}>Details</span>
                        <div className="details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 1.2rem" }}>
                            {[
                                { label: "Categorie", val: annonce.category || "N/A", icon: <Tag size={13} /> },
                                { label: "Type", val: isDon ? "Don" : "Vente", icon: isDon ? <Gift size={13} /> : <Tag size={13} /> },
                                { label: "Etat", val: annonce.condition || "N/A", icon: <CheckCircle2 size={13} /> },
                                { label: "Matiere", val: annonce.material || "N/A", icon: <Package size={13} /> },
                                { label: "Ville", val: `${annonce.city}${annonce.zip ? " · " + annonce.zip : ""}`, icon: <MapPin size={13} /> },
                                { label: "Publiee le", val: annonce.date, icon: <Calendar size={13} /> },
                                { label: "Reference", val: `#${String(annonce.id).padStart(4, "0")}`, icon: <Package size={13} /> },
                            ].map(({ label, val, icon }) => (
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
            </div>

            {showSoldModal && (
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
                            Marquer comme vendue ?
                        </h3>
                        <p style={{ margin: "0 0 2rem", color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                            Cette action confirmera que l'annonce a été vendue. Elle sera archivée et ne sera plus visible.
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => {
                                    setShowSoldModal(false);
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
                                onClick={confirmSold}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: "var(--forest-deep)",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = "#33575a";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = "var(--forest-deep)";
                                }}
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeactivateModal && (
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
                        maxWidth: "520px",
                        width: "92%",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
                        animation: "fadeIn 0.2s ease-out",
                    }}>
                        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: "600", color: "var(--text-main)" }}>
                            Desactiver cette annonce
                        </h3>
                        <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                            Cette annonce n'apparaitra plus dans les annonces actives. Renseignez un motif pour tracer la moderation.
                        </p>

                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-main)", marginBottom: "0.35rem" }}>
                            Motif (obligatoire)
                        </label>
                        <input
                            value={deactivateReason}
                            onChange={(e) => setDeactivateReason(e.target.value)}
                            placeholder="Ex: Non conforme a la charte, contenu trompeur..."
                            style={{
                                width: "100%",
                                border: "1px solid rgba(35, 59, 61, 0.16)",
                                borderRadius: "12px",
                                padding: "0.65rem 0.8rem",
                                fontFamily: "inherit",
                                fontSize: "0.92rem",
                                marginBottom: "0.9rem",
                                outline: "none",
                            }}
                        />

                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-main)", marginBottom: "0.35rem" }}>
                            Details (optionnel)
                        </label>
                        <textarea
                            value={deactivateDetails}
                            onChange={(e) => setDeactivateDetails(e.target.value)}
                            placeholder="Precisions supplementaires pour l'equipe moderation"
                            style={{
                                width: "100%",
                                minHeight: "88px",
                                border: "1px solid rgba(35, 59, 61, 0.16)",
                                borderRadius: "12px",
                                padding: "0.65rem 0.8rem",
                                fontFamily: "inherit",
                                fontSize: "0.92rem",
                                resize: "vertical",
                                marginBottom: "1rem",
                                outline: "none",
                            }}
                        />

                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => {
                                    setShowDeactivateModal(false);
                                    setDeactivateReason("");
                                    setDeactivateDetails("");
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
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={deactivateAnnonce}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: "#233b3d",
                                    color: "white",
                                    fontSize: "0.95rem",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                }}
                            >
                                Confirmer la desactivation
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                .action-button-danger:hover {
                    background: var(--btn-hover-bg);
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

export default function AnnonceDetailPage() {
    return (
        <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>Chargement\u2026</div>}>
            <AnnonceDetailContent />
        </Suspense>
    );
}