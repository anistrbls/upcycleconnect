"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { ChevronLeft, Save, Send, Plus, X, Trash2, Image as ImageIcon, Box, BarChart3, FileText, Info, Leaf, CheckCircle2 } from "lucide-react";

const STATUS_LABELS = { brouillon: "Brouillon", publie: "Publié" };
const MODERATION_LABELS = { pending: "En validation", approved: "Validé", rejected: "Refusé" };
const CATEGORIES = ["Mobilier", "Textile", "Électronique", "Décoration", "Livres & Culture", "Jouets", "Outillage", "Jardin", "Sport", "Autre"];
const IMAGE_TYPES = [{ value: "avant", label: "Avant" }, { value: "apres", label: "Après" }, { value: "autre", label: "Autre" }];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 20;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const styles = {
    container: { width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" },
    backBtn: {
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem", padding: 0,
    },
    headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
    title: { fontSize: "1.8rem", fontWeight: "700", color: "var(--text-main)", margin: 0 },
    badge: (status, moderationStatus) => ({
        padding: "4px 14px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700", marginTop: "0.5rem", display:"inline-block",
        ...(moderationStatus === "rejected"
            ? { background: "rgba(178,74,74,0.15)", color: "#B24A4A" }
            : moderationStatus === "pending"
            ? { background: "rgba(180,140,60,0.15)", color: "#9A7520" }
            : status === "publie"
            ? { background: "rgba(46,125,110,0.15)", color: "#2E7D6E" }
            : { background: "rgba(180,140,60,0.15)", color: "#9A7520" }),
    }),
    grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "2rem", alignItems: "start" },
    card: { background: "var(--surface-hover)", borderRadius: "20px", padding: "2rem", marginBottom: "1.5rem" },
    sectionTitle: {
        fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "1.5rem",
        display: "flex", alignItems: "center", gap: "0.65rem",
    },
    formGroup: { marginBottom: "1.25rem" },
    label: { display: "block", fontSize: "0.85rem", fontWeight: "500", color: "var(--text-muted)", marginBottom: "0.4rem" },
    input: {
        width: "100%", padding: "0.8rem 1rem", borderRadius: "12px",
        border: "none", background: "#fff", fontSize: "0.95rem",
        outline: "none", fontFamily: "inherit", color: "var(--text-main)", boxSizing: "border-box",
    },
    textarea: {
        width: "100%", padding: "0.8rem 1rem", borderRadius: "12px",
        border: "none", background: "#fff", fontSize: "0.95rem",
        outline: "none", fontFamily: "inherit", color: "var(--text-main)",
        resize: "vertical", minHeight: "120px", boxSizing: "border-box",
    },
    select: {
        width: "100%", padding: "0.8rem 1rem", borderRadius: "12px",
        border: "none", background: "#fff", fontSize: "0.95rem",
        outline: "none", fontFamily: "inherit", color: "var(--text-main)", cursor: "pointer", appearance: "none",
    },
    btnPrimary: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
        padding: "0.85rem 1.5rem", borderRadius: "12px",
        background: "var(--accent)", color: "#fff",
        border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.95rem", fontWeight: "600", width: "100%",
    },
    btnSecondary: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
        padding: "0.85rem 1.5rem", borderRadius: "12px",
        background: "var(--surface-hover)", color: "var(--text-main)",
        border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.95rem", fontWeight: "600", width: "100%",
    },
    btnGhost: {
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        padding: "0.5rem 1rem", borderRadius: "10px",
        border: "1px solid var(--border)", background: "none", cursor: "pointer",
        fontFamily: "inherit", fontSize: "0.85rem", color: "var(--text-muted)",
    },
    error: { background: "rgba(192,57,43,0.1)", borderRadius: "10px", padding: "0.8rem 1rem", color: "#c0392b", fontSize: "0.88rem", marginBottom: "1rem" },
    success: { background: "rgba(46,125,110,0.1)", borderRadius: "10px", padding: "0.8rem 1rem", color: "#2E7D6E", fontSize: "0.88rem", marginBottom: "1rem" },
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
    infoColumn: { display: "flex", flexDirection: "column", gap: "1.5rem" },
    tipsList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.7rem" },
    tipsItem: { display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.82rem", color: "var(--text-muted)" },
    submitRow: { display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", padding: "1rem 0" },
};

export default function ProjetDetail() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id;
    const fileInputRef = useRef(null);

    const [project, setProject] = useState(null);
    const [items, setItems] = useState([]);
    const [images, setImages] = useState([]);
    const [recoveredItems, setRecoveredItems] = useState([]);
    const [form, setForm] = useState({ title: "", description: "", category: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [newImageType, setNewImageType] = useState("autre");
    const [showItemSelect, setShowItemSelect] = useState(false);

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

    const load = () => {
        Promise.all([
            fetch(apiUrl(`/pro/projects/${projectId}`), { headers: buildAuthHeaders() }).then((r) => r.json()),
            fetch(apiUrl("/pro/projects/recovered-items"), { headers: buildAuthHeaders() }).then((r) => r.json()),
        ]).then(([detail, recovered]) => {
            setProject(detail.project);
            setItems(detail.items || []);
            setImages(detail.images || []);
            setRecoveredItems(recovered.items || []);
            setForm({ title: detail.project.title, description: detail.project.description, category: detail.project.category });
            setLoading(false);
        }).catch(() => { setError("Impossible de charger le projet"); setLoading(false); });
    };

    useEffect(() => { load(); }, [projectId]);

    const flash = (msg, type = "success") => {
        if (type === "success") { setSuccess(msg); setError(null); }
        else { setError(msg); setSuccess(null); }
        setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    };

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const save = async (status) => {
        if (!form.title.trim()) { flash("Le titre est obligatoire.", "error"); return; }
        if (status === "publie" && !form.description.trim()) { flash("La description est obligatoire pour publier.", "error"); return; }
        setSaving(true);
        try {
            const res = await fetch(apiUrl(`/pro/projects/${projectId}`), {
                method: "PUT",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, status }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur");
            setProject(data);
            flash("Projet sauvegardé.");
        } catch (e) { flash(e.message, "error"); }
        setSaving(false);
    };

    const publish = async () => {
        if (!form.description.trim()) { flash("La description est obligatoire pour publier.", "error"); return; }
        if (items.length < 1) { flash("Ajoutez au moins un objet utilisé avant publication.", "error"); return; }
        if (images.length < 1) { flash("Ajoutez au moins une image avant publication.", "error"); return; }
        setSaving(true);
        try {
            // Save as draft first, then submit to moderation
            await fetch(apiUrl(`/pro/projects/${projectId}`), {
                method: "PUT",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, status: "brouillon" }),
            });
            const res = await fetch(apiUrl(`/pro/projects/${projectId}/publish`), {
                method: "POST", headers: buildAuthHeaders(),
            });
            if (!res.ok) throw new Error("Erreur lors de la publication");
            setProject((p) => ({ ...p, status: "brouillon", moderationStatus: "pending" }));
            flash("Projet soumis à modération. Publication après validation admin.");
        } catch (e) { flash(e.message, "error"); }
        setSaving(false);
    };

    const addItem = async (itemId) => {
        const res = await fetch(apiUrl(`/pro/projects/${projectId}/items`), {
            method: "POST",
            headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ itemId }),
        });
        const data = await res.json();
        if (!res.ok) { flash(data.error || "Erreur", "error"); return; }
        setShowItemSelect(false);
        load();
    };

    const removeItem = async (itemId) => {
        await fetch(apiUrl(`/pro/projects/${projectId}/items/${itemId}`), {
            method: "DELETE", headers: buildAuthHeaders(),
        });
        setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    };

    const handleImageFile = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (images.length >= MAX_IMAGE_COUNT) {
            flash(`Limite atteinte: ${MAX_IMAGE_COUNT} images maximum par projet.`, "error");
            e.target.value = "";
            return;
        }

        let processed = 0;
        for (const file of files) {
            if (images.length + processed >= MAX_IMAGE_COUNT) break;
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

            const res = await fetch(apiUrl(`/pro/projects/${projectId}/images`), {
                method: "POST",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ url: base64, imageType: newImageType }),
            });
            const data = await res.json();
            if (!res.ok) {
                flash(data.error || "Erreur upload image", "error");
                continue;
            }
            processed += 1;
            setImages((prev) => [...prev, data]);
        }
        e.target.value = "";
    };

    const removeImage = async (imageId) => {
        await fetch(apiUrl(`/pro/projects/${projectId}/images/${imageId}`), {
            method: "DELETE", headers: buildAuthHeaders(),
        });
        setImages((prev) => prev.filter((img) => img.id !== imageId));
    };

    if (loading) return <div style={styles.container}><p style={{ color: "var(--text-muted)" }}>Chargement…</p></div>;
    if (!project) return <div style={styles.container}><p style={{ color: "#c0392b" }}>Projet introuvable.</p></div>;

    const moderationStatus = String(project.moderationStatus || "").toLowerCase();
    const displayStatusLabel = moderationStatus === "approved"
        ? (STATUS_LABELS[project.status] || project.status)
        : (MODERATION_LABELS[moderationStatus] || STATUS_LABELS[project.status] || project.status);

    const linkedItemIds = new Set(items.map((i) => i.itemId));
    const availableToAdd = recoveredItems.filter((ri) => !linkedItemIds.has(ri.id));

    return (
        <div style={styles.container}>
            <button style={styles.backBtn} onClick={() => router.push("/projets/mes-projets")}>
                <ChevronLeft size={16} /> Mes projets
            </button>

            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.title}>{project.title}</h1>
                    <span style={styles.badge(project.status, moderationStatus)}>{displayStatusLabel}</span>
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <div style={styles.grid}>
                {/* Colonne principale */}
                <div>
                    {/* Images */}
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
                            <select style={{ ...styles.select, width: "auto", padding: "0.5rem 0.8rem" }}
                                value={newImageType} onChange={(e) => setNewImageType(e.target.value)}>
                                {IMAGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <button style={styles.btnGhost} onClick={() => fileInputRef.current?.click()}>
                                <ImageIcon size={14} /> Ajouter une image
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFile} />
                        </div>
                        <p style={{ marginTop: "0.8rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            Formats: JPG, PNG, WEBP · Taille max: 5 MB · {images.length}/{MAX_IMAGE_COUNT} images
                        </p>
                    </div>

                    {/* Informations */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><FileText size={16} /> Informations</h2>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Titre *</label>
                            <input style={styles.input} name="title" value={form.title} onChange={handleChange} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description</label>
                            <textarea style={styles.textarea} name="description" value={form.description} onChange={handleChange}
                                placeholder="Décrivez la transformation réalisée…" />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Catégorie</label>
                            <select style={styles.select} name="category" value={form.category} onChange={handleChange}>
                                <option value="">— Sélectionner —</option>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Objets récupérés */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><Box size={16} /> Objets récupérés liés ({items.length})</h2>
                        {items.length === 0 && (
                            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1rem" }}>
                                Aucun objet associé. Ajoutez des objets que vous avez récupérés.
                            </p>
                        )}
                        {items.map((item) => (
                            <div key={item.id} style={styles.itemRow}>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.92rem", color: "var(--text-main)" }}>
                                    {item.itemImage ? (
                                        <img src={item.itemImage} alt={item.itemTitle || "Objet"} style={styles.itemThumb} />
                                    ) : null}
                                    <Box size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                                    <span>
                                        {item.itemTitle || `Objet #${item.itemId}`}
                                        <span style={{ display: "block", color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                                            {item.material || "Matériau non défini"} · {formatItemWeight(item)}
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
                                    <select style={styles.select} onChange={(e) => { if (e.target.value) addItem(Number(e.target.value)); }}
                                        defaultValue="">
                                        <option value="">— Choisir un objet —</option>
                                        {availableToAdd.map((ri) => (
                                            <option key={ri.id} value={ri.id}>{ri.title} ({ri.category})</option>
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

                    {/* Impact */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><BarChart3 size={16} /> Impact du projet (lecture seule)</h2>
                        <div style={styles.impactGrid}>
                            <div style={styles.impactCard}>
                                <div style={styles.impactLabel}>Poids total recycle</div>
                                <div style={styles.impactValue}>{(Number(project.totalWeightKg || 0)).toFixed(2)} kg</div>
                            </div>
                            <div style={styles.impactCard}>
                                <div style={styles.impactLabel}>Upcycling Score</div>
                                <div style={styles.impactValue}>{(Number(project.upcyclingScore || 0)).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={styles.submitRow}>
                            <button
                                type="button"
                                className="action-btn"
                                style={{ padding: "0.8rem 2rem", background: "white", color: "var(--text-main)", border: "medium" }}
                                onClick={() => save("brouillon")}
                                disabled={saving}
                            >
                                <Save size={16} /> Enregistrer en brouillon
                            </button>
                            <button
                                type="button"
                                className="action-btn primary"
                                style={{ padding: "0.8rem 3rem", fontWeight: "600" }}
                                onClick={publish}
                                disabled={saving}
                            >
                                <Send size={16} /> {project.status === "publie" ? "Mettre à jour" : "Publier le projet"}
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
                            Continuez à documenter vos transformations pour valoriser votre expertise d'upcycling.
                        </p>
                    </div>

                    <div style={{ ...styles.card, marginBottom: 0, padding: "1.5rem" }}>
                        <h2 style={styles.sectionTitle}><Info size={16} /> Conseils de publication</h2>
                        <ul style={styles.tipsList}>
                            <li style={styles.tipsItem}><CheckCircle2 size={14} /> Ajoutez des visuels de bonne qualité</li>
                            <li style={styles.tipsItem}><CheckCircle2 size={14} /> Mettez à jour la description après chaque avancée</li>
                            <li style={styles.tipsItem}><CheckCircle2 size={14} /> Vérifiez les objets associés au projet</li>
                        </ul>
                    </div>

                    <div style={{ ...styles.card, marginBottom: 0, padding: "1.5rem" }}>
                        <h2 style={styles.sectionTitle}><BarChart3 size={16} /> Rappel qualité</h2>
                        <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                            Un projet complet (images avant/après, objets liés, description précise) améliore la confiance des visiteurs.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
