"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { Save, Send, FileText, Plus, Trash2, Image as ImageIcon, Box, X, BarChart3, Info, Leaf, CheckCircle2 } from "lucide-react";

const CATEGORIES = ["Mobilier", "Textile", "Électronique", "Décoration", "Livres & Culture", "Jouets", "Outillage", "Jardin", "Sport", "Autre"];
const IMAGE_TYPES = [{ value: "avant", label: "Avant" }, { value: "apres", label: "Après" }, { value: "autre", label: "Autre" }];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 20;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const styles = {
    container: { width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" },
    header: { marginBottom: "2rem" },
    title: { margin: "0.5rem 0", fontSize: "2.5rem", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-main)" },
    subtitle: { margin: "0.4rem 0 0", color: "var(--text-muted)", fontSize: "1.05rem" },
    grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "2rem", alignItems: "start" },
    card: { background: "var(--surface-hover)", borderRadius: "28px", padding: "2rem", border: "none", marginBottom: "1.5rem" },
    sectionTitle: {
        fontSize: "1.1rem",
        fontWeight: "600",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        color: "var(--text-main)",
    },
    formGroup: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" },
    label: { fontSize: "0.85rem", fontWeight: "500", color: "var(--text-muted)", marginLeft: "0.2rem" },
    input: {
        width: "100%", padding: "0.8rem 1rem", borderRadius: "14px",
        border: "none", background: "#fff", fontSize: "0.95rem",
        outline: "none", fontFamily: "inherit", color: "var(--text-main)", transition: "all 0.2s ease",
        boxSizing: "border-box",
    },
    textarea: {
        width: "100%", padding: "0.8rem 1rem", borderRadius: "14px",
        border: "none", background: "#fff", fontSize: "0.95rem",
        outline: "none", fontFamily: "inherit", color: "var(--text-main)",
        resize: "none", minHeight: "120px", boxSizing: "border-box",
    },
    select: {
        width: "100%", padding: "0.8rem 1rem", borderRadius: "14px",
        border: "none", background: "#fff", fontSize: "0.95rem",
        outline: "none", fontFamily: "inherit", color: "var(--text-main)",
        cursor: "pointer", transition: "all 0.2s ease", appearance: "none",
    },
    infoColumn: { display: "flex", flexDirection: "column", gap: "1.5rem" },
    tipsList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.7rem" },
    tipsItem: { display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.82rem", color: "var(--text-muted)" },
    submitRow: { display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", padding: "1rem 0" },
    actions: { display: "flex", flexDirection: "column", gap: "0.8rem" },
    btnGhost: {
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        padding: "0.5rem 1rem", borderRadius: "10px",
        border: "1px solid var(--border)", background: "none", cursor: "pointer",
        fontFamily: "inherit", fontSize: "0.85rem", color: "var(--text-muted)",
    },
    btnPrimary: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
        padding: "0.85rem 1.5rem", borderRadius: "14px",
        background: "var(--black)", color: "#fff",
        border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.95rem", fontWeight: "600",
        width: "100%",
    },
    btnSecondary: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
        padding: "0.85rem 1.5rem", borderRadius: "14px",
        background: "#fff", color: "var(--text-main)",
        border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.95rem", fontWeight: "600",
        width: "100%",
    },
    itemRow: {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.7rem 0", borderBottom: "1px solid var(--border)",
    },
    itemThumb: {
        width: "38px",
        height: "38px",
        borderRadius: "8px",
        objectFit: "cover",
        flexShrink: 0,
        background: "#fff",
        border: "1px solid var(--border)",
    },
    imageGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1rem" },
    imageCard: { position: "relative", borderRadius: "12px", overflow: "hidden", aspectRatio: "1", background: "#eee" },
    imageTypePill: {
        position: "absolute", bottom: "6px", left: "6px",
        padding: "2px 8px", borderRadius: "10px", fontSize: "0.68rem", fontWeight: "700",
        background: "rgba(0,0,0,0.55)", color: "#fff",
    },
    removeImgBtn: {
        position: "absolute", top: "6px", right: "6px",
        background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
        width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "#fff",
    },
    impactGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "0.9rem",
    },
    impactCard: {
        background: "#fff",
        borderRadius: "12px",
        padding: "0.9rem 1rem",
    },
    impactLabel: {
        fontSize: "0.8rem",
        color: "var(--text-muted)",
        marginBottom: "0.3rem",
    },
    impactValue: {
        fontSize: "1.2rem",
        fontWeight: "700",
        color: "var(--text-main)",
    },
    success: { background: "rgba(46,125,110,0.1)", borderRadius: "10px", padding: "0.8rem 1rem", color: "#2E7D6E", fontSize: "0.88rem", marginBottom: "1rem" },
    error: { background: "rgba(192,57,43,0.1)", borderRadius: "10px", padding: "0.8rem 1rem", color: "#c0392b", fontSize: "0.88rem", marginBottom: "1rem" },
};

export default function NouveauProjet() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const stepImageInputRefs = useRef({});

    const [form, setForm] = useState({ title: "", description: "", category: "" });
    const [steps, setSteps] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [projectId, setProjectId] = useState(null);
    const [items, setItems] = useState([]);
    const [images, setImages] = useState([]);
    const [recoveredItems, setRecoveredItems] = useState([]);
    const [impact, setImpact] = useState({ totalWeightKg: 0, upcyclingScore: 0 });

    const [showItemSelect, setShowItemSelect] = useState(false);
    const [newImageType, setNewImageType] = useState("autre");
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch(apiUrl("/pro/projects/recovered-items"), { headers: buildAuthHeaders() })
            .then((r) => r.json())
            .then((d) => setRecoveredItems(d.items || []))
            .catch(() => {});
        fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() })
            .then((r) => r.json())
            .then((d) => setUser(d.user || null))
            .catch(() => {});
    }, []);

    const subscriptionType = String(user?.subscriptionType || "decouverte").toLowerCase();
    const canUseDetailImages = subscriptionType === "pro_essentiel" || subscriptionType === "premium_atelier";
    const detailImageLimit = subscriptionType === "pro_essentiel" ? 3 : subscriptionType === "premium_atelier" ? Infinity : 0;
    const detailImageCount = images.filter((img) => img.imageType === "autre").length;
    const remainingDetailImages = Number.isFinite(detailImageLimit) ? Math.max(0, detailImageLimit - detailImageCount) : null;
    const availableImageTypes = IMAGE_TYPES.filter((type) => type.value !== "autre" || canUseDetailImages);

    useEffect(() => {
        if (!canUseDetailImages && newImageType === "autre") {
            setNewImageType("avant");
        }
    }, [canUseDetailImages, newImageType]);

    const flash = (msg, type = "success") => {
        if (type === "success") {
            setSuccess(msg);
            setError(null);
        } else {
            setError(msg);
            setSuccess(null);
        }
    };

    const formatWeight = (grams) => {
        const value = Number(grams || 0);
        if (!Number.isFinite(value) || value <= 0) return "—";
        if (value >= 1000) return `${(value / 1000).toFixed(2)} kg`;
        return `${value.toFixed(0)} g`;
    };

    const formatItemWeight = (item) => {
        const grams = Number(item?.weightGrams || 0);
        if (Number.isFinite(grams) && grams > 0) {
            return formatWeight(grams);
        }
        const rawValue = Number(item?.weightValue || 0);
        const rawUnit = String(item?.weightUnit || "").trim();
        if (Number.isFinite(rawValue) && rawValue > 0 && rawUnit) {
            return `${rawValue} ${rawUnit}`;
        }
        return "Poids non renseigne";
    };

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const normalizeSteps = (raw) => {
        if (!Array.isArray(raw)) return [];
        return raw
            .map((step) => {
                if (typeof step === "string") return { text: step.trim(), imageUrl: "" };
                return {
                    text: String(step?.text || "").trim(),
                    imageUrl: String(step?.imageUrl || "").trim(),
                };
            })
            .filter((step) => step.text)
            .slice(0, 30);
    };

    const addStep = () => {
        setSteps((prev) => {
            if (prev.length >= 30) return prev;
            return [...prev, { text: "", imageUrl: "" }];
        });
    };

    const updateStepText = (idx, text) => {
        setSteps((prev) => prev.map((step, i) => (i === idx ? { ...step, text } : step)));
    };

    const removeStep = (idx) => {
        setSteps((prev) => prev.filter((_, i) => i !== idx));
    };

    const getStepPayload = () => normalizeSteps(steps);

    const loadProject = async (id) => {
        const detail = await fetch(apiUrl(`/pro/projects/${id}`), { headers: buildAuthHeaders() }).then((r) => r.json());
        setItems(detail.items || []);
        setImages(detail.images || []);
        setSteps(normalizeSteps(detail?.project?.steps));
        setImpact({
            totalWeightKg: Number(detail.impact?.totalWeightKg ?? detail.project?.totalWeightKg ?? 0),
            upcyclingScore: Number(detail.impact?.upcyclingScore ?? detail.project?.upcyclingScore ?? 0),
        });
    };

    const ensureDraftProject = async () => {
        if (projectId) return projectId;
        // Permet de démarrer le brouillon même si le titre n'est pas encore saisi.
        // Le titre restera contrôlé lors de l'enregistrement/publikation finale.
        const draftTitle = form.title.trim() || "Projet en cours";
        const payload = { ...form, title: draftTitle, status: "brouillon", steps: getStepPayload() };
        const res = await fetch(apiUrl("/pro/projects"), {
            method: "POST",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur lors de la création du brouillon");
        setProjectId(data.id);
        await loadProject(data.id);
        return data.id;
    };

    const addItem = async (itemId) => {
        try {
            const pid = await ensureDraftProject();
            const res = await fetch(apiUrl(`/pro/projects/${pid}/items`), {
                method: "POST",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ itemId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur");
            await loadProject(pid);
            setShowItemSelect(false);
            flash("Objet ajouté au projet.");
        } catch (e) {
            flash(e.message, "error");
        }
    };

    const removeItem = async (itemId) => {
        if (!projectId) return;
        try {
            await fetch(apiUrl(`/pro/projects/${projectId}/items/${itemId}`), {
                method: "DELETE",
                headers: buildAuthHeaders(),
            });
            await loadProject(projectId);
        } catch {
            flash("Impossible de retirer l'objet.", "error");
        }
    };

    const handleImageFile = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        try {
            if (newImageType === "autre" && !canUseDetailImages) {
                throw new Error("Votre offre Découverte n'autorise pas les images détails. Utilisez seulement Avant ou Après.");
            }
            if (newImageType === "autre" && subscriptionType === "pro_essentiel" && detailImageCount >= detailImageLimit) {
                throw new Error("Votre offre Pro Essentiel est limitée à 3 images détails par projet.");
            }
            const pid = await ensureDraftProject();
            if (images.length >= MAX_IMAGE_COUNT) {
                throw new Error(`Limite atteinte: ${MAX_IMAGE_COUNT} images maximum par projet.`);
            }

            for (const file of files) {
                if (images.length >= MAX_IMAGE_COUNT) break;
                if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                    flash("Format non supporté. Utilisez JPG, PNG ou WEBP.", "error");
                    continue;
                }
                if (file.size > MAX_IMAGE_SIZE) {
                    flash("Image trop volumineuse (max 5 MB).", "error");
                    continue;
                }

                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                });

                const res = await fetch(apiUrl(`/pro/projects/${pid}/images`), {
                    method: "POST",
                    headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ url: base64, imageType: newImageType }),
                });
                const data = await res.json();
                if (!res.ok) {
                    flash(data.error || "Erreur upload image", "error");
                    continue;
                }
                setImages((prev) => [...prev, data]);
            }
            await loadProject(pid);
        } catch (err) {
            flash(err.message, "error");
        }
        e.target.value = "";
    };

    const removeImage = async (imageId) => {
        if (!projectId) return;
        await fetch(apiUrl(`/pro/projects/${projectId}/images/${imageId}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await loadProject(projectId);
    };

    const uploadStepImage = async (idx, file) => {
        if (!file) return;
        try {
            if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
                throw new Error("Format non supporté. Utilisez JPG, PNG ou WEBP.");
            }
            if (file.size > MAX_IMAGE_SIZE) {
                throw new Error("Image trop volumineuse (max 5 MB).");
            }
            if (!canUseDetailImages) {
                throw new Error("Votre offre actuelle n'autorise pas les images d'étape.");
            }

            const pid = await ensureDraftProject();
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
            });

            const res = await fetch(apiUrl(`/pro/projects/${pid}/steps/images`), {
                method: "POST",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ url: base64 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur upload image");

            setSteps((prev) => prev.map((step, i) => (i === idx ? { ...step, imageUrl: data.url } : step)));
        } catch (e) {
            flash(e.message, "error");
        }
    };

    const submit = async (status) => {
        if (!form.title.trim()) {
            flash("Le titre est obligatoire.", "error");
            return;
        }
        if (status === "publie" && !form.description.trim()) {
            flash("La description est obligatoire pour publier.", "error");
            return;
        }
        if (status === "publie" && items.length < 1) {
            flash("Ajoutez au moins un objet utilisé avant publication.", "error");
            return;
        }
        if (status === "publie" && images.length < 1) {
            flash("Ajoutez au moins une image avant publication.", "error");
            return;
        }

        setSaving(true);
        try {
            const pid = await ensureDraftProject();
            const res = await fetch(apiUrl(`/pro/projects/${pid}`), {
                method: "PUT",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    status: "brouillon",
                    steps: getStepPayload(),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur");

            if (status === "publie") {
                const pubRes = await fetch(apiUrl(`/pro/projects/${pid}/publish`), {
                    method: "POST",
                    headers: buildAuthHeaders(),
                });
                const pubData = await pubRes.json();
                if (!pubRes.ok) throw new Error(pubData.error || "Erreur publication");
                flash("Projet soumis à modération. Il sera publié après validation admin.");
                router.push(`/projets/${pid}`);
                return;
            }

            flash("Projet enregistré en brouillon.");
            setProjectId(pid);
            await loadProject(pid);
        } catch (e) {
            flash(e.message, "error");
        }
        setSaving(false);
    };

    const linkedItemIds = new Set(items.map((i) => i.itemId));
    const availableToAdd = recoveredItems.filter((ri) => !linkedItemIds.has(ri.id));

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">Espace Professionnel</p>
                <h1 style={styles.title}>Nouveau projet d'upcycling</h1>
                <p style={styles.subtitle}>Valorisez vos transformations à partir d'objets récupérés.</p>
            </header>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <div style={styles.grid}>
                <div>
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><ImageIcon size={16} /> Images du projet</h2>
                        <div style={styles.imageGrid}>
                            {images.map((img) => (
                                <div key={img.id} style={styles.imageCard}>
                                    <img src={img.url} alt={img.imageType} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <span style={styles.imageTypePill}>
                                        {img.imageType === "avant" ? "Avant" : img.imageType === "apres" ? "Après" : "Autre"}
                                    </span>
                                    <button style={styles.removeImgBtn} onClick={() => removeImage(img.id)}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
                            <select style={{ ...styles.select, width: "auto", padding: "0.5rem 0.8rem" }} value={newImageType} onChange={(e) => setNewImageType(e.target.value)}>
                                {availableImageTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <button style={styles.btnGhost} onClick={() => fileInputRef.current?.click()}>
                                <ImageIcon size={14} /> Ajouter des images
                            </button>
                            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageFile} />
                        </div>
                        <p style={{ marginTop: "0.8rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            Formats: JPG, PNG, WEBP · Taille max: 5 MB · {images.length}/{MAX_IMAGE_COUNT} images · {subscriptionType === "premium_atelier" ? "Images détails illimitées" : subscriptionType === "pro_essentiel" ? `${remainingDetailImages} image(s) détail restante(s)` : "Aucune image détail autorisée"}
                        </p>
                    </div>

                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><FileText size={18} /> Informations du projet</h2>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Titre *</label>
                            <input style={styles.input} name="title" value={form.title}
                                onChange={handleChange} placeholder="Ex: Table de salon en palettes récupérées" />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description</label>
                            <textarea style={styles.textarea} name="description" value={form.description}
                                onChange={handleChange} placeholder="Décrivez votre projet d'upcycling, la transformation réalisée…" />
                        </div>

                        {(subscriptionType === "pro_essentiel" || subscriptionType === "premium_atelier") ? (
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Étapes de réalisation</label>
                                <div style={{ display: "grid", gap: "0.7rem" }}>
                                    {steps.map((step, idx) => (
                                        <div key={`step-${idx}`} style={{ background: "#fff", borderRadius: "14px", border: "1px solid var(--border)", padding: "0.75rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                                                <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>Étape {idx + 1}</strong>
                                                <button type="button" style={{ ...styles.btnGhost, padding: "0.35rem 0.65rem", fontSize: "0.75rem" }} onClick={() => removeStep(idx)}>
                                                    <Trash2 size={12} /> Supprimer
                                                </button>
                                            </div>
                                            <textarea
                                                style={{ ...styles.textarea, minHeight: "88px" }}
                                                value={step.text}
                                                onChange={(e) => updateStepText(idx, e.target.value)}
                                                placeholder={`Décrivez l'étape ${idx + 1}`}
                                            />
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginTop: "0.55rem", flexWrap: "wrap" }}>
                                                <button
                                                    type="button"
                                                    style={styles.btnGhost}
                                                    onClick={() => stepImageInputRefs.current[idx]?.click()}
                                                >
                                                    <ImageIcon size={14} /> Ajouter image à l'étape
                                                </button>
                                                <input
                                                    ref={(el) => { stepImageInputRefs.current[idx] = el; }}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    style={{ display: "none" }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        uploadStepImage(idx, file);
                                                        e.target.value = "";
                                                    }}
                                                />
                                                {step.imageUrl ? (
                                                    <img src={step.imageUrl} alt={`Étape ${idx + 1}`} style={{ width: "54px", height: "54px", borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border)" }} />
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" style={styles.btnGhost} onClick={addStep}>
                                        <Plus size={14} /> Ajouter une étape
                                    </button>
                                </div>
                                <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                    Visible pour les visiteurs. Maximum 30 étapes.
                                </p>
                            </div>
                        ) : (
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "-0.3rem", marginBottom: "1rem" }}>
                                Les étapes de réalisation sont disponibles avec les offres Pro Essentiel et Premium Atelier.
                            </div>
                        )}

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Catégorie</label>
                            <select style={styles.select} name="category" value={form.category} onChange={handleChange}>
                                <option value="">— Sélectionner une catégorie —</option>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><Box size={16} /> {`Objets utilisés (${items.length})`}</h2>
                        {items.length === 0 && (
                            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1rem" }}>
                                Aucun objet associé. Ajoutez des objets récupérés par votre compte professionnel.
                            </p>
                        )}
                        {items.map((item) => (
                            <div key={item.id} style={styles.itemRow}>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.92rem", color: "var(--text-main)" }}>
                                    {item.itemImage ? (
                                        <img src={item.itemImage} alt={item.itemTitle || "Objet"} style={styles.itemThumb} data-i18n-user-content="true" />
                                    ) : null}
                                    <Box size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                                    <span>
                                        {item.itemTitle ? <span data-i18n-user-content="true">{item.itemTitle}</span> : <>Objet #{item.itemId}</>}
                                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                                            {item.material ? <span data-i18n-user-content="true">{item.material}</span> : "Matériau non défini"} · {formatItemWeight(item)}
                                        </span>
                                    </span>
                                </span>
                                <button style={{ ...styles.btnGhost, color: "#c0392b", borderColor: "transparent" }}
                                    onClick={() => removeItem(item.itemId)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}

                        {showItemSelect ? (
                            <div style={{ marginTop: "1rem" }}>
                                {availableToAdd.length === 0 ? (
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                        Tous vos objets récupérés sont déjà associés, ou vous n'avez pas encore récupéré d'objet.
                                    </p>
                                ) : (
                                    <select style={styles.select} onChange={(e) => { if (e.target.value) addItem(Number(e.target.value)); }} defaultValue="">
                                        <option value="">— Choisir un objet récupéré —</option>
                                        {availableToAdd.map((ri) => (
                                            <option key={ri.id} value={ri.id} data-i18n-user-content="true">
                                                {ri.title} · {ri.material || "matériau ?"} · {formatItemWeight(ri)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <button style={{ ...styles.btnGhost, marginTop: "0.5rem" }} onClick={() => setShowItemSelect(false)}>
                                    Annuler
                                </button>
                            </div>
                        ) : (
                            <button style={{ ...styles.btnGhost, marginTop: "1rem" }} onClick={() => setShowItemSelect(true)}>
                                <Plus size={14} /> Ajouter un objet récupéré
                            </button>
                        )}
                    </div>

                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><BarChart3 size={16} /> Impact du projet (lecture seule)</h2>
                        <div style={styles.impactGrid}>
                            <div style={styles.impactCard}>
                                <div style={styles.impactLabel}>Poids total recycle</div>
                                <div style={styles.impactValue}>{impact.totalWeightKg.toFixed(2)} kg</div>
                            </div>
                            <div style={styles.impactCard}>
                                <div style={styles.impactLabel}>Upcycling Score</div>
                                <div style={styles.impactValue}>{impact.upcyclingScore.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><Send size={16} /> Publication</h2>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                            Conditions de publication: titre + description + au moins 1 objet + au moins 1 image.
                        </p>
                        <div style={styles.submitRow}>
                            <button
                                style={{ ...styles.btnSecondary, width: "auto", padding: "0.8rem 2rem", background: "white", color: "var(--text-main)", border: "medium" }}
                                onClick={() => submit("brouillon")}
                                disabled={saving}
                            >
                                <Save size={16} /> Enregistrer en brouillon
                            </button>
                            <button
                                style={{ ...styles.btnPrimary, width: "auto", padding: "0.8rem 3rem", fontWeight: "600" }}
                                onClick={() => submit("publie")}
                                disabled={saving}
                            >
                                <Send size={16} /> Publier le projet
                            </button>
                        </div>
                    </div>
                </div>

                <aside style={styles.infoColumn}>
                    <div style={{ ...styles.card, marginBottom: 0, borderRadius: "28px", border: "medium", background: "rgb(229, 255, 188)", color: "var(--text-main)" }}>
                        <div style={{ marginBottom: "1rem", color: "var(--forest-deep)" }}>
                            <Leaf size={24} strokeWidth={2} />
                        </div>
                        <h3 style={{ marginBottom: "0.5rem", color: "var(--text-main)", fontSize: "1rem" }}>Impact Économique</h3>
                        <p style={{ fontSize: "0.85rem", opacity: 0.9, lineHeight: 1.5, color: "var(--text-main)" }}>
                            Mettez en avant vos transformations pour valoriser vos savoir-faire et votre impact circulaire.
                        </p>
                    </div>

                    <div style={{ ...styles.card, marginBottom: 0, padding: "1.5rem" }}>
                        <h2 style={styles.sectionTitle}><Info size={16} /> Conseils de publication</h2>
                        <ul style={styles.tipsList}>
                            <li style={styles.tipsItem}><CheckCircle2 size={14} /> Ajoutez des photos avant/après nettes</li>
                            <li style={styles.tipsItem}><CheckCircle2 size={14} /> Décrivez les matériaux et la transformation</li>
                            <li style={styles.tipsItem}><CheckCircle2 size={14} /> Associez les objets récupérés utilisés</li>
                        </ul>
                    </div>

                    <div style={{ ...styles.card, marginBottom: 0, padding: "1.5rem" }}>
                        <h2 style={styles.sectionTitle}><BarChart3 size={16} /> Rappel qualité</h2>
                        <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                            Les projets avec un récit clair et des visuels complets ont de meilleures performances de consultation.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
