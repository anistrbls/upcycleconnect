"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
import {
    Camera,
    Gift,
    Tag,
    Package,
    MapPin,
    FileText,
    Leaf,
    CheckCircle2,
    Info,
    X,
    Plus,
    ChevronLeft,
    ChevronRight,
    Trash2
} from "lucide-react";

// Styles locaux pour la page (en plus des variables globales)
const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: "2rem",
        alignItems: "start",
    },
    card: {
        background: "var(--surface-hover)",
        borderRadius: "28px",
        padding: "2rem",
        border: "none",
        position: "relative",
    },
    header: {
        marginBottom: "2rem",
    },
    sectionTitle: {
        fontSize: "1.1rem",
        fontWeight: "600",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        color: "var(--text-main)",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginBottom: "1.25rem",
    },
    label: {
        fontSize: "0.85rem",
        fontWeight: "500",
        color: "var(--text-muted)",
        marginLeft: "0.2rem",
    },
    input: {
        padding: "0.8rem 1rem",
        borderRadius: "14px",
        border: "none",
        fontSize: "0.95rem",
        outline: "none",
        transition: "all 0.2s ease",
        background: "#FFFFFF",
        color: "var(--text-main)",
        fontFamily: "inherit",
        width: "100%",
    },
    select: {
        padding: "0.8rem 2.5rem 0.8rem 1rem",
        borderRadius: "14px",
        border: "none",
        fontSize: "0.95rem",
        outline: "none",
        transition: "all 0.2s ease",
        background: "#FFFFFF",
        color: "var(--text-main)",
        fontFamily: "inherit",
        width: "100%",
        cursor: "pointer",
        // Suppression de l'apparence native (webkit / Firefox)
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        // Flèche custom via backgroundImage SVG
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234F6163' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.85rem center",
        backgroundSize: "16px",
    },
    textarea: {
        padding: "0.8rem 1rem",
        borderRadius: "14px",
        border: "none",
        fontSize: "0.95rem",
        minHeight: "120px",
        resize: "none",
        outline: "none",
        background: "#FFFFFF",
        color: "var(--text-main)",
    },
    typeSelector: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
        marginBottom: "1.5rem",
    },
    typeBtn: (active) => ({
        padding: "1.25rem",
        borderRadius: "20px",
        border: "none",
        background: active ? "var(--black)" : "#FFFFFF",
        color: active ? "#FFFFFF" : "var(--text-main)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        transition: "all 0.2s ease",
    }),
    photoBox: {
        border: "none",
        borderRadius: "20px",
        padding: "3rem 1rem",
        textAlign: "center",
        cursor: "pointer",
        background: "rgba(255, 255, 255, 0.75)",
        transition: "all 0.2s ease",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
    },
    photoGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: "1rem",
        marginTop: "1.5rem",
    },
    photoThumbnail: {
        position: "relative",
        aspectRatio: "1/1",
        borderRadius: "12px",
        overflow: "hidden",
        border: "none",
    },
    removePhotoBtn: {
        position: "absolute",
        top: "5px",
        right: "5px",
        background: "rgba(0, 0, 0, 0.5)",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: "24px",
        height: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(4px)",
        zIndex: 10,
    },
    coverBadge: {
        position: "absolute",
        bottom: "0",
        left: "0",
        right: "0",
        background: "var(--black)",
        color: "white",
        fontSize: "0.65rem",
        fontWeight: "700",
        textAlign: "center",
        padding: "4px 0",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    },
    thumbnailOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0,
        transition: "opacity 0.2s ease",
        ":hover": {
            opacity: 1
        }
    },
    submitRow: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "1rem",
        marginTop: "1rem",
        padding: "1rem 0",
    },
};

// Utilitaire pour faire correspondre un ancien slug à un label actuel
const getMatch = (items, val, defaultVal = "") => {
    if (!val) return defaultVal;
    const lowerVal = val.toLowerCase().replace(/-/g, " ");
    const match = items.find(i => {
        const itemLabel = i.label.toLowerCase().replace(/[àáâãäå]/g,"a").replace(/[èéêë]/g,"e");
        return itemLabel === lowerVal || i.label.toLowerCase() === val.toLowerCase() || i.label === val;
    });
    return match ? match.label : val;
};

// Valeurs de secours en cas d'erreur de récupération BDD
const DEFAULT_CATEGORIES = [
    { id: "mobilier", label: "Mobilier", emoji: "🪑" },
    { id: "deco", label: "Décoration", emoji: "🖼️" },
    { id: "elec", label: "Électroménager", emoji: "⚡" },
    { id: "jardin", label: "Jardinage", emoji: "🌱" },
];

const DEFAULT_CONDITIONS = [
    { id: "neuf", label: "Neuf" },
    { id: "tres_bon", label: "Très bon état" },
    { id: "bon", label: "Bon état" },
    { id: "usure", label: "Traces d’usure" },
    { id: "restaurer", label: "À restaurer" },
];

const DEFAULT_MATERIALS = [
    { id: "bois", label: "Bois" },
    { id: "metal", label: "Métal" },
    { id: "verre", label: "Verre" },
    { id: "plastique", label: "Plastique" },
    { id: "tissu", label: "Tissu" },
    { id: "ceramique", label: "Céramique" },
    { id: "pierre", label: "Pierre" },
    { id: "cuir", label: "Cuir" },
];

const DEFAULT_COUNTRIES = [
    { id: 1, label: "France", emoji: "🇫🇷", zip_length: 5 },
    { id: 2, label: "Suisse", emoji: "🇨🇭", zip_length: 4 },
    { id: 3, label: "Belgique", emoji: "🇧🇪", zip_length: 4 },
];

export default function DeposerAnnoncePage() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [type, setType] = useState("don"); // 'don' ou 'vente'
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [photos, setPhotos] = useState([]); // Array of { file, preview }
    const [coverIndex, setCoverIndex] = useState(0);
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [conditions, setConditions] = useState(DEFAULT_CONDITIONS);
    const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
    const [countries, setCountries] = useState(DEFAULT_COUNTRIES);

    const [formData, setFormData] = useState({
        title: "",
        category: "",
        description: "",
        condition: "",
        material: "",
        quantity: "1",
        price: "",
        city: "",
        country: "France",
        zip: "",
        deliveryMode: "main_propre",
        dimensions: "",
        confirm: false
    });
    // Charge les catégories et les états depuis l'API
    useEffect(() => {
        fetch(apiUrl("/item-categories"))
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.items?.length) setCategories(data.items); })
            .catch(() => {});
        fetch(apiUrl("/item-conditions"))
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.items?.length) setConditions(data.items); })
            .catch(() => {});
        fetch(apiUrl("/item-materials"))
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.items?.length) setMaterials(data.items); })
            .catch(() => {});
        fetch(apiUrl("/item-countries"))
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.items?.length) setCountries(data.items); })
            .catch(() => {});
    }, []);


    const fileToBase64 = (file) => {

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };


    const searchParams = useSearchParams();
    const editId = searchParams.get("id");


    useEffect(() => {
        if (editId) {
            const existingAnnonces = JSON.parse(localStorage.getItem("user_annonces") || "[]");
            const annonceToEdit = existingAnnonces.find(a => a.id.toString() === editId.toString());

            if (annonceToEdit) {
                setType(annonceToEdit.type);
                setFormData({
                    title: annonceToEdit.title || "",
                    category: annonceToEdit.category || "",
                    description: annonceToEdit.description || "",
                    condition: annonceToEdit.condition || "",
                    material: annonceToEdit.material || "",
                    quantity: annonceToEdit.quantity || "1",
                    price: annonceToEdit.price || "",
                    city: annonceToEdit.city || "",
                    country: annonceToEdit.country || "France",
                    zip: annonceToEdit.zip || "",
                    deliveryMode: annonceToEdit.deliveryMode || "main_propre",
                    dimensions: annonceToEdit.dimensions || "",
                    confirm: true
                });

                // Simuler une photo si elle existe
                if (annonceToEdit.image) {
                    setPhotos([{ preview: annonceToEdit.image, file: null }]);
                    setCoverIndex(0);
                }
            }
        }
    }, [editId]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        addFiles(files);
    };

    const addFiles = async (files) => {
        if (photos.length + files.length > 10) {
            alert("Vous ne pouvez pas ajouter plus de 10 photos.");
            return;
        }

        const newPhotosPromises = files.map(async (file) => {
            const base64 = await fileToBase64(file);
            return {
                file,
                preview: base64
            };
        });

        const newPhotos = await Promise.all(newPhotosPromises);

        setPhotos(prev => {
            const updated = [...prev, ...newPhotos];
            // Si c'est le premier ajout de photos, la première devient la couverture
            if (prev.length === 0 && updated.length > 0) {
                setCoverIndex(0);
            }
            return updated;
        });
    };

    const removePhoto = (index) => {
        setPhotos(prev => {
            const next = [...prev];
            // Plus besoin de revokeObjectURL avec du Base64
            next.splice(index, 1);

            // Ajuster l'index de couverture
            if (coverIndex === index) {
                setCoverIndex(0);
            } else if (coverIndex > index) {
                setCoverIndex(coverIndex - 1);
            }

            return next;
        });
    };

    const onBoxClick = () => {
        fileInputRef.current?.click();
    };

    const onDragOver = (e) => {
        e.preventDefault();
    };

    const onDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    };

    const handleChange = (key, val) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    const handleSubmit = (e, statusText = "en attente") => {
        if (e) e.preventDefault();

        if (!formData.confirm) {
            alert("Veuillez confirmer la charte de qualite avant de continuer.");
            return;
        }

        const payload = {
            ...formData,
            category: getMatch(categories, formData.category),
            condition: getMatch(conditions, formData.condition),
            material: getMatch(materials, formData.material),
            country: getMatch(countries, formData.country, "France"),
            type,
            price: type === "vente" ? parseFloat(formData.price) || 0 : 0,
            image: photos.length > 0 ? photos[coverIndex]?.preview : "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=500&auto=format&fit=crop",
            photos: photos.map(p => p.preview)
        };

        const token = window.localStorage.getItem(TOKEN_KEY);
        
        const method = editId ? "PUT" : "POST";
        const url = editId ? apiUrl(`/admin/items/${editId}`) : apiUrl("/items");

        fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(async res => {
            if (!res.ok) {
                let errMsg = "Failed to save ad";
                try {
                    const errData = await res.json();
                    if (errData.error) errMsg = errData.error;
                } catch(e) {}
                throw new Error(errMsg);
            }
            return res.json();
        })
        .then(() => {
            const target = statusText === "brouillon" ? "/annonces/brouillons" : "/annonces/mes-annonces";
            router.push(`${target}?success=true`);
        })
        .catch(err => {
            alert("Erreur lors de l'enregistrement : " + err.message);
        });
    };

    if (isSubmitted) {
        return (
            <div style={{ padding: "4rem 2rem", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ ...styles.card, padding: "4rem 2rem" }}>
                    <div style={{ marginBottom: "1.5rem", color: "var(--forest-deep)" }}>
                        <CheckCircle2 size={64} strokeWidth={1.5} />
                    </div>
                    <h2 style={{ fontSize: "2rem", color: "var(--text-main)" }}>Annonce transmise !</h2>
                    <p style={{ color: "var(--text-muted)", margin: "1.5rem 0", fontSize: "1.1rem", lineHeight: 1.6 }}>
                        Votre annonce pour <strong>"{formData.title}"</strong> a bien été enregistrée.
                        Elle sera vérifiée par notre équipe sous 24h.
                    </p>
                    <button className="action-btn primary" style={{ padding: "0.8rem 2rem", fontSize: "1rem" }} onClick={() => window.location.reload()}>
                        Déposer une autre annonce
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">Espace Particulier</p>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.5rem 0", letterSpacing: "-0.02em" }}>Déposer une annonce</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Partagez vos objets et participez à l'économie circulaire d'UpcycleConnect.</p>
            </header>

            <form onSubmit={handleSubmit} style={styles.grid}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <section style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            <Camera size={20} strokeWidth={2} />
                            Photos des objets
                        </h2>

                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />

                        <div
                            style={styles.photoBox}
                            onClick={onBoxClick}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                        >
                            <div style={{ marginBottom: "0.5rem", color: "var(--text-muted)" }}>
                                <Camera size={40} strokeWidth={1.5} />
                            </div>
                            <p style={{ fontWeight: "600", color: "var(--text-main)" }}>Glissez vos images ici ou cliquez pour parcourir</p>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Jusqu'à 10 photos • Format JPG ou PNG</p>
                        </div>

                        {photos.length > 0 && (
                            <div style={{ background: "var(--black)", borderRadius: "28px", padding: "1rem", border: "1px solid rgba(35, 59, 61, 0.06)", marginTop: "1rem" }}>
                                <div style={{ borderRadius: "22px", overflow: "hidden", background: "rgb(18, 25, 26)", position: "relative" }}>
                                    <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" }}>
                                        <img
                                            alt="Prévisualisation"
                                            src={photos[coverIndex]?.preview}
                                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}
                                        />

                                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10, 15, 15, 0.7) 0%, rgba(10, 15, 15, 0.2) 20%, rgba(10, 15, 15, 0) 40%)", pointerEvents: "none", zIndex: 2 }}></div>

                                        {photos.length > 1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setCoverIndex(prev => prev > 0 ? prev - 1 : photos.length - 1);
                                                    }}
                                                    style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: "12px", padding: "8px", borderRadius: "50%", border: "1px solid rgba(255, 255, 255, 0.25)", background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setCoverIndex(prev => prev < photos.length - 1 ? prev + 1 : 0);
                                                    }}
                                                    style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: "12px", padding: "8px", borderRadius: "50%", border: "1px solid rgba(255, 255, 255, 0.25)", background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                removePhoto(coverIndex);
                                            }}
                                            style={{ position: "absolute", top: "12px", right: "12px", padding: "8px", borderRadius: "50%", border: "1px solid rgba(255, 255, 255, 0.3)", background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4 }}
                                            title="Supprimer cette photo"
                                        >
                                            <Trash2 size={16} />
                                        </button>

                                        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "1rem", display: "flex", overflowX: "auto", gap: "0.5rem", zIndex: 5 }}>
                                            {photos.map((photo, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setCoverIndex(index);
                                                    }}
                                                    style={{ border: coverIndex === index ? "2px solid white" : "1px solid rgba(255, 255, 255, 0.16)", padding: "0px", borderRadius: "14px", overflow: "hidden", cursor: "pointer", background: "rgba(255, 255, 255, 0.08)", backdropFilter: "blur(8px)", opacity: coverIndex === index ? 1 : 0.6, transition: "0.2s", minWidth: "64px", width: "64px", height: "64px", position: "relative" }}
                                                >
                                                    <img alt="" src={photo.preview} style={{ position: "absolute", inset: "0px", width: "100%", height: "100%", objectFit: "cover" }} />
                                                    {coverIndex === index && (
                                                        <div style={{ position: "absolute", bottom: "4px", left: "0", right: "0", textAlign: "center", fontSize: "0.55rem", fontWeight: "600", color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>Couverture</div>
                                                    )}
                                                </button>
                                            ))}
                                            
                                            {photos.length < 10 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onBoxClick();
                                                    }}
                                                    style={{ border: "1px dashed rgba(255, 255, 255, 0.4)", padding: "0px", borderRadius: "14px", cursor: "pointer", background: "rgba(255, 255, 255, 0.04)", backdropFilter: "blur(8px)", transition: "0.2s", minWidth: "64px", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}
                                                    title="Ajouter une photo"
                                                >
                                                    <Plus size={24} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            <Package size={20} strokeWidth={2} />
                            Informations principales
                        </h2>

                        <div style={styles.typeSelector}>
                            <button
                                type="button"
                                style={styles.typeBtn(type === "don")}
                                onClick={() => setType("don")}
                            >
                                <div style={{ marginBottom: "0.25rem", color: type === "don" ? "#FFFFFF" : "var(--text-main)", opacity: type === "don" ? 1 : 0.6 }}>
                                    <Gift size={24} strokeWidth={2} />
                                </div>
                                <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>Faire un don</span>
                                <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>Gratuit & Solidaire</span>
                            </button>
                            <button
                                type="button"
                                style={styles.typeBtn(type === "vente")}
                                onClick={() => setType("vente")}
                            >
                                <div style={{ marginBottom: "0.25rem", color: type === "vente" ? "#FFFFFF" : "var(--text-main)", opacity: type === "vente" ? 1 : 0.6 }}>
                                    <Tag size={24} strokeWidth={2} />
                                </div>
                                <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>Vendre</span>
                                <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>Fixez votre prix</span>
                            </button>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Titre de votre annonce *</label>
                            <input
                                style={styles.input}
                                placeholder="Ex: Bureau scandinave en teck"
                                required
                                value={formData.title}
                                onChange={e => handleChange("title", e.target.value)}
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Catégorie *</label>
                                <select
                                    style={styles.select}
                                    required
                                    value={getMatch(categories, formData.category)}
                                    onChange={e => handleChange("category", e.target.value)}
                                >
                                    <option value="">Sélectionner...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.label}>
                                            {cat.emoji} {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Quantité</label>
                                <input
                                    type="number"
                                    min="1"
                                    style={styles.input}
                                    value={formData.quantity}
                                    onChange={e => handleChange("quantity", e.target.value)}
                                />
                            </div>
                        </div>

                        {type === "vente" && (
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Prix de vente (€) *</label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type="number"
                                        style={{ ...styles.input, width: "100%", paddingLeft: "2.5rem" }}
                                        placeholder="0.00"
                                        required
                                        value={formData.price}
                                        onChange={e => handleChange("price", e.target.value)}
                                    />
                                    <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: "600" }}>€</span>
                                </div>
                            </div>
                        )}
                    </section>

                    <section style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            <FileText size={20} strokeWidth={2} />
                            Détails & État
                        </h2>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description de l'annonce *</label>
                            <textarea
                                style={styles.textarea}
                                placeholder="Détaillez les caractéristiques, l'état, l'usage..."
                                required
                                value={formData.description}
                                onChange={e => handleChange("description", e.target.value)}
                            />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>État de l'objet</label>
                                <select
                                    style={styles.select}
                                    required
                                    value={getMatch(conditions, formData.condition)}
                                    onChange={e => handleChange("condition", e.target.value)}
                                >
                                    <option value="">Sélectionner...</option>
                                    {conditions.map(cond => (
                                        <option key={cond.id} value={cond.label}>
                                            {cond.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Matériau</label>
                                <select style={styles.select} value={getMatch(materials, formData.material)} onChange={e => handleChange("material", e.target.value)}>
                                    <option value="">Sélectionner...</option>
                                    {materials.map(mat => (
                                        <option key={mat.id} value={mat.label}>
                                            {mat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section style={styles.card}>
                        <h2 style={styles.sectionTitle}>
                            <MapPin size={20} strokeWidth={2} />
                            Localisation
                        </h2>
                        
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Pays *</label>
                            <select style={styles.select} required value={getMatch(countries, formData.country, "France")} onChange={e => handleChange("country", e.target.value)}>
                                {countries.map(c => (
                                    <option key={c.id} value={c.label}>
                                        {c.emoji} {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Ville *</label>
                                <input style={styles.input} placeholder="Avenue, Ville" required value={formData.city} onChange={e => handleChange("city", e.target.value)} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Code postal *</label>
                                <input 
                                    style={{
                                        ...styles.input, 
                                        border: (formData.zip.length > 0 && formData.zip.length !== (countries.find(c => c.label === formData.country)?.zip_length || 5)) ? "1px solid var(--danger)" : "none"
                                    }} 
                                    placeholder={formData.country === "France" ? "75001" : "1234"} 
                                    required 
                                    value={formData.zip} 
                                    maxLength={countries.find(c => c.label === formData.country)?.zip_length || 5}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        handleChange("zip", val);
                                    }} 
                                />
                            </div>
                        </div>

                        {formData.zip && formData.zip.length === (countries.find(c => c.label === formData.country)?.zip_length || 5) && (
                            <div style={{
                                marginTop: "1rem", padding: "0.8rem 1rem", borderRadius: "12px",
                                background: "rgba(224, 158, 25, 0.1)", border: "1px solid rgba(224, 158, 25, 0.3)",
                                color: "#9B6400", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem"
                            }}>
                                <Info size={16} style={{ flexShrink: 0 }} />
                                Aucun point de dépôt UpcycleConnect n'est disponible dans votre zone immédiate pour le moment. Vous pouvez toujours soumettre votre annonce.
                            </div>
                        )}
                        
                        {formData.zip && formData.zip.length !== (countries.find(c => c.label === formData.country)?.zip_length || 5) && (
                            <div style={{ marginTop: "0.2rem", fontSize: "0.75rem", color: "var(--danger)" }}>
                                Le code postal {formData.country} doit comporter {countries.find(c => c.label === formData.country)?.zip_length || 5} chiffres.
                            </div>
                        )}
                    </section>

                    <div style={{ padding: "0 0.2rem" }}>
                        <div
                            className="consent-card"
                            role="checkbox"
                            aria-checked={formData.confirm}
                            tabIndex={0}
                            onClick={() => handleChange("confirm", !formData.confirm)}
                            onKeyDown={(e) => {
                                if (e.key === " " || e.key === "Enter") {
                                    e.preventDefault();
                                    handleChange("confirm", !formData.confirm);
                                }
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.9rem",
                                background: formData.confirm ? "rgba(62,104,108,0.12)" : "rgba(255,255,255,0.72)",
                                borderRadius: "16px",
                                padding: "0.9rem 1rem",
                                cursor: "pointer",
                                transition: "background-color 0.2s ease, box-shadow 0.2s ease",
                                boxShadow: formData.confirm ? "0 0 0 1px rgba(62,104,108,0.2)" : "0 0 0 1px rgba(35,59,61,0.08)",
                            }}
                        >
                            <span
                                style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    background: formData.confirm ? "var(--forest-deep)" : "rgba(35,59,61,0.1)",
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <CheckCircle2 size={14} />
                            </span>
                            <span style={{ fontSize: "0.86rem", color: "var(--text-main)", lineHeight: 1.55 }}>
                                Je confirme que mon objet respecte la charte de qualité UpcycleConnect.
                            </span>
                        </div>
                    </div>

                    <div style={styles.submitRow}>
                        <button
                            type="button"
                            className="action-btn"
                            style={{ padding: "0.8rem 2rem", background: "white", color: "var(--text-main)", border: "none" }}
                            onClick={() => handleSubmit(null, "brouillon")}
                        >
                            Enregistrer en brouillon
                        </button>
                        <button type="submit" className="action-btn primary" style={{ padding: "0.8rem 3rem", fontWeight: "600" }}>
                            {editId ? "Enregistrer les modifications" : "Publier l'annonce"}
                        </button>
                    </div>
                </div>

                <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ ...styles.card, background: "rgb(229, 255, 188)", color: "var(--text-main)" }}>
                        <div style={{ marginBottom: "1rem", color: "var(--forest-deep)" }}>
                            <Leaf size={24} strokeWidth={2} />
                        </div>
                        <h3 style={{ marginBottom: "0.5rem", color: "var(--text-main)", fontSize: "1rem" }}>Impact Économique</h3>
                        <p style={{ fontSize: "0.85rem", opacity: 0.9, lineHeight: 1.5, color: "var(--text-main)" }}>
                            En déposant cette annonce, vous évitez en moyenne 12kg de déchets et soutenez l'économie locale.
                        </p>
                    </div>

                    <div className="panel" style={{ padding: "1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                            <Info size={18} strokeWidth={2} color="var(--forest-deep)" />
                            <h4 style={{ fontSize: "0.9rem", margin: 0 }}>Besoin d'aide ?</h4>
                        </div>
                        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <li style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem" }}>
                                <span>✔</span> <span>Utilisez une lumière naturelle</span>
                            </li>
                            <li style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem" }}>
                                <span>✔</span> <span>Décrivez les défauts</span>
                            </li>
                            <li style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem" }}>
                                <span>✔</span> <span>Précisez les dimensions</span>
                            </li>
                        </ul>
                    </div>

                    <img
                        src="/img/recyclage-materiau.jpg"
                        alt="Document de reference matieres"
                        style={{ width: "100%", display: "block", borderRadius: "20px" }}
                    />
                </aside>
            </form>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .consent-card:hover {
                    background: rgba(62,104,108,0.14);
                }
            `}</style>
        </div>
    );
}

