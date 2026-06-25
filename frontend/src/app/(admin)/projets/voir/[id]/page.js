"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../../lib/api";
import { ChevronLeft, ChevronRight, X, ImageIcon, Box, BarChart3, Leaf, Calendar, User, Tag, MapPin, Award, ListChecks } from "lucide-react";

const styles = {
    container: { width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" },
    headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
    title: { fontSize: "2.2rem", fontWeight: "800", color: "var(--text-main)", margin: 0, letterSpacing: "-0.02em" },
    meta: { color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.5rem" },
    grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", alignItems: "start" },
    card: { background: "var(--surface-hover, #F9FAFB)", borderRadius: "24px", padding: "1.5rem", marginBottom: "1rem" },
    sectionTitle: {
        fontSize: "1rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "1.25rem",
        display: "flex", alignItems: "center", gap: "0.6rem",
    },
    description: {
        fontSize: "1rem", color: "var(--text-main)", lineHeight: "1.6", whiteSpace: "pre-wrap",
    },
    stepsWrap: {
        display: "flex",
        flexDirection: "column",
        gap: "0.8rem",
    },
    stepRow: {
        display: "grid",
        gridTemplateColumns: "32px minmax(0, 1fr)",
        gap: "0.75rem",
        alignItems: "start",
    },
    stepBullet: {
        width: "28px",
        height: "28px",
        borderRadius: "10px",
        background: "#E5FFBC",
        color: "#213A2C",
        fontSize: "0.8rem",
        fontWeight: "800",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "0.05rem",
    },
    stepText: {
        margin: 0,
        fontSize: "0.95rem",
        color: "var(--text-main)",
        lineHeight: "1.55",
    },
    stepImage: {
        width: "100%",
        maxWidth: "360px",
        marginTop: "0.55rem",
        borderRadius: "12px",
        border: "1px solid var(--border, #E5E7EB)",
        objectFit: "cover",
    },
    imageGallery: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" },
    imageWrapper: { position: "relative", borderRadius: "16px", overflow: "hidden", aspectRatio: "4/3", background: "#eee", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
    image: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
    itemRow: {
        display: "flex", alignItems: "center", gap: "1rem",
        padding: "0.85rem", borderRadius: "12px", background: "#fff",
        marginBottom: "0.5rem",
    },
    itemThumb: { width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 },
    impactGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem" },
    impactCard: { background: "#fff", borderRadius: "16px", padding: "1rem", border: "1px solid var(--border, #E5E7EB)" },
    impactLabel: { fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" },
    impactValue: { fontSize: "1.25rem", fontWeight: "800", color: "var(--text-main)" },
    analyticsGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.65rem" },
    analyticsCard: { background: "#fff", borderRadius: "14px", padding: "0.85rem", border: "1px solid var(--border, #E5E7EB)" },
    analyticsLabel: { fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" },
    analyticsValue: { fontSize: "1.05rem", fontWeight: "800", color: "var(--text-main)" },
    proCard: {
        background: "#111827",
        color: "#fff",
        borderRadius: "28px",
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        border: "1px solid rgba(255,255,255,0.05)",
    },
    proHeader: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        paddingBottom: "1.25rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    proAvatar: {
        width: "52px",
        height: "52px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
        color: "#111827",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.1rem",
        fontWeight: "800",
    },
    proInfo: { display: "flex", flexDirection: "column" },
    proName: { fontSize: "1.05rem", fontWeight: "700", margin: 0, letterSpacing: "-0.01em" },
    proTag: { fontSize: "0.62rem", fontWeight: "800", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" },
    proStats: { display: "flex", flexDirection: "column", gap: "1.1rem" },
    proStat: { display: "flex", alignItems: "center", gap: "0.85rem" },
    proStatIcon: {
        width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)"
    },
    proStatLabel: { fontSize: "0.75rem", opacity: 0.45, fontWeight: "600", display: "block" },
    proStatValue: { fontSize: "0.9rem", fontWeight: "700", color: "#fff" },
};

export default function ProjectDetailView() {
    return (
        <Suspense fallback={<div style={styles.container}><p style={{ color: "var(--text-muted)" }}>Chargement du projet...</p></div>}>
            <ProjectDetailInner />
        </Suspense>
    );
}

function ProjectDetailInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id;
    const from = searchParams?.get("from") || "";

    const [data, setData] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(null);

    const nextImage = (e) => {
        e?.stopPropagation();
        if (!data?.images) return;
        setLightboxIndex((prev) => (prev + 1) % data.images.length);
    };

    const prevImage = (e) => {
        e?.stopPropagation();
        if (!data?.images) return;
        setLightboxIndex((prev) => (prev - 1 + data.images.length) % data.images.length);
    };

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const suffix = from ? `?from=${encodeURIComponent(from)}` : "";
                let res = await fetch(apiUrl(`/part/projects/${id}${suffix}`), { headers: buildAuthHeaders() });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || "Erreur de chargement");
                setData(json);

				// Le backend décide l'accès (proprio + abonnement), on évite les faux négatifs côté UI.
				const statsRes = await fetch(apiUrl(`/pro/projects/${id}/analytics`), { headers: buildAuthHeaders() });
				const statsData = await statsRes.json().catch(() => ({}));
				if (statsRes.ok) {
					setStats(statsData?.stats || null);
				} else {
					setStats(null);
				}
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchDetail();
    }, [id, from]);

    if (loading) return <div style={styles.container}><p style={{ color: "var(--text-muted)" }}>Chargement du projet...</p></div>;
    if (error) return <div style={styles.container}><p style={{ color: "#B24A4A" }}>Erreur : {error}</p></div>;
    if (!data) return null;

    const { project, items, images, author } = data;
    const normalizedSteps = Array.isArray(project?.steps)
        ? project.steps
            .map((step) => {
                if (typeof step === "string") {
                    return { text: step.trim(), imageUrl: "" };
                }
                return {
                    text: String(step?.text || "").trim(),
                    imageUrl: String(step?.imageUrl || "").trim(),
                };
            })
            .filter((step) => step.text)
        : [];
    const proInitials = (author?.fullName || "?")
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase();

    return (
        <div style={styles.container}>
            <div style={styles.headerRow}>
                <div>
                    <h1 style={styles.title} data-i18n-user-content="true">{project.title}</h1>
                    <div style={styles.meta}>
                        <Tag size={14} style={{ display: "inline", marginRight: "0.4rem", verticalAlign: "middle" }} />
                        <span data-i18n-user-content="true">{project.category}</span> · Mis à jour le {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
                    </div>
                </div>
            </div>

            <div style={styles.grid}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Gallery */}
                    {images && images.length > 0 && (
                        <div style={styles.imageGallery}>
                            {images.map((img, idx) => (
                                <div 
                                    key={img.id} 
                                    style={{ ...styles.imageWrapper, cursor: "zoom-in" }}
                                    onClick={() => setLightboxIndex(idx)}
                                >
                                    <img src={img.url} alt="Projet" style={styles.image} />
                                    <div style={{ position: "absolute", bottom: "12px", right: "12px", background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase" }}>
                                        {img.imageType === "avant" ? "Avant" : img.imageType === "apres" ? "Après" : "Détail"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><Leaf size={18} /> Histoire du projet</h2>
                        <p style={styles.description}>
                            {project.description ? <span data-i18n-user-content="true">{project.description}</span> : "Pas de description pour ce projet."}
                        </p>
                    </div>

                    {normalizedSteps.length > 0 && (
                        <div style={styles.card}>
                            <h2 style={styles.sectionTitle}><ListChecks size={18} /> Étapes de réalisation</h2>
                            <div style={styles.stepsWrap}>
                                {normalizedSteps.map((step, idx) => (
                                    <div key={`step-${idx}`} style={styles.stepRow}>
                                        <div style={styles.stepBullet}>{idx + 1}</div>
                                        <div>
                                            <p style={styles.stepText} data-i18n-user-content="true">{step.text}</p>
                                            {step.imageUrl ? (
                                                <img src={step.imageUrl} alt={`Étape ${idx + 1}`} style={styles.stepImage} />
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    {items && items.length > 0 && (
                        <div style={styles.card}>
                            <h2 style={styles.sectionTitle}><Box size={18} /> Matières premières revalorisées</h2>
                            <div style={{ display: "grid", gap: "0.5rem" }}>
                                {items.map(it => (
                                    <div key={it.id} style={styles.itemRow}>
                                        {it.itemImage ? <img src={it.itemImage} alt={it.itemTitle} style={styles.itemThumb} data-i18n-user-content="true" /> : <div style={{ ...styles.itemThumb, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}><Box size={20} color="#ccc" /></div>}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontWeight: "700", fontSize: "0.95rem" }} data-i18n-user-content="true">{it.itemTitle}</p>
                                            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}><span data-i18n-user-content="true">{it.material}</span> · {it.weightGrams >= 1000 ? (it.weightGrams/1000).toFixed(2) + " kg" : it.weightGrams + " g"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Impact */}
                    <div style={styles.card}>
                        <h2 style={styles.sectionTitle}><BarChart3 size={18} /> Impact Environnemental</h2>
                        <div style={styles.impactGrid}>
                            <div style={styles.impactCard}>
                                <div style={styles.impactLabel}>Masse revalorisée</div>
                                <div style={styles.impactValue}>{project.totalWeightKg?.toFixed(2)} kg</div>
                            </div>
                            <div style={styles.impactCard}>
                                <div style={styles.impactLabel}>Score Upcycling</div>
                                <div style={styles.impactValue}>{project.upcyclingScore?.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    {stats && (
                        <div style={styles.card}>
                            <h2 style={styles.sectionTitle}><BarChart3 size={18} /> Statistiques de diffusion</h2>
                            <div style={styles.analyticsGrid}>
                                <div style={styles.analyticsCard}>
                                    <div style={styles.analyticsLabel}>Passages dans le fil</div>
                                    <div style={styles.analyticsValue}>{Number(stats.impressionCount || 0)}</div>
                                </div>
                                <div style={styles.analyticsCard}>
                                    <div style={styles.analyticsLabel}>Clics sur le projet</div>
                                    <div style={styles.analyticsValue}>{Number(stats.clickCount || 0)}</div>
                                </div>
                                <div style={styles.analyticsCard}>
                                    <div style={styles.analyticsLabel}>Conv. en j'aime</div>
                                    <div style={styles.analyticsValue}>{Number(stats.likeConversionPct || 0).toFixed(1)}%</div>
                                </div>
                                <div style={styles.analyticsCard}>
                                    <div style={styles.analyticsLabel}>Conv. en enregistrement</div>
                                    <div style={styles.analyticsValue}>{Number(stats.bookmarkConversionPct || 0).toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "sticky", top: "1rem" }}>
                    {/* Pro Card */}
                    <div style={styles.proCard}>
                        <div style={styles.proHeader}>
                            <div style={styles.proAvatar}>{proInitials}</div>
                            <div style={styles.proInfo}>
                                <span style={styles.proTag}>Réalisé par</span>
                                <p style={styles.proName} data-i18n-user-content="true">{author?.fullName}</p>
                                {author?.companyName && author.companyName !== "N/A" && (
                                    <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0.15rem 0 0 0", fontStyle: "italic" }}>
                                        <span data-i18n-user-content="true">{author.companyName}</span>
                                    </p>
                                )}
                                {project.lieu && <span style={{ fontSize: "0.8rem", opacity: 0.6, display: "flex", alignItems: "center", gap: "4px", marginTop: "0.4rem" }} data-i18n-user-content="true"><MapPin size={12} /> {project.lieu}</span>}
                            </div>
                        </div>
                        <div style={styles.proStats}>
                            <div style={styles.proStat}>
                                <div style={styles.proStatIcon}><Calendar size={16} /></div>
                                <div>
                                    <span style={styles.proStatLabel}>Membre depuis</span>
                                    <span style={styles.proStatValue}>{new Date(author?.joinedAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
                                </div>
                            </div>
                            <div style={styles.proStat}>
                                <div style={styles.proStatIcon}><Box size={16} /></div>
                                <div>
                                    <span style={styles.proStatLabel}>Projets publiés</span>
                                    <span style={styles.proStatValue}>{author?.totalProjectsSinceSignup} réalisations</span>
                                </div>
                            </div>
                            <div style={styles.proStat}>
                                <div style={styles.proStatIcon}><Award size={16} /></div>
                                <div>
                                    <span style={styles.proStatLabel}>Impact global</span>
                                    <span style={styles.proStatValue}>{author?.totalUCScore?.toFixed(1)} points UC</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category info */}
                    <div style={{ ...styles.card, background: "#E5FFBC", border: "none" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.5rem" }}>Le saviez-vous ?</h3>
                        <p style={{ fontSize: "0.9rem", color: "#166534", lineHeight: "1.5", margin: 0 }}>
                            Chaque objet revalorisé permet d'économiser des ressources naturelles et de réduire les déchets. Ce projet a permis de détourner <strong>{project.totalWeightKg?.toFixed(2)} kg</strong> de la décharge !
                        </p>
                    </div>
                </aside>
            </div>

{/* Lightbox */}
            {lightboxIndex !== null && (
                <div 
                    style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", 
                        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
                        backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out"
                    }}
                    onClick={() => setLightboxIndex(null)}
                >
                    <button 
                        style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "10px", borderRadius: "50%", cursor: "pointer" }}
                        onClick={() => setLightboxIndex(null)}
                    >
                        <X size={24} />
                    </button>

                    <button 
                        style={{ position: "absolute", left: "20px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "15px", borderRadius: "50%", cursor: "pointer" }}
                        onClick={prevImage}
                    >
                        <ChevronLeft size={32} />
                    </button>

                    <img 
                        src={images[lightboxIndex]?.url} 
                        alt="Zoom" 
                        style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }} 
                        onClick={(e) => e.stopPropagation()}
                    />

                    <button 
                        style={{ position: "absolute", right: "20px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "15px", borderRadius: "50%", cursor: "pointer" }}
                        onClick={nextImage}
                    >
                        <ChevronRight size={32} />
                    </button>

                    <div style={{ position: "absolute", bottom: "30px", color: "#fff", fontSize: "0.9rem", fontWeight: "600", opacity: 0.8 }}>
                        {lightboxIndex + 1} / {images.length} — {images[lightboxIndex]?.imageType?.toUpperCase()}
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
