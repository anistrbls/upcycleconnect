"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Search, Leaf, Box, BarChart3 } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";

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
    searchInputWrap: {
        display: "flex",
        alignItems: "center",
        background: "rgb(229, 255, 188)",
        borderRadius: "999px",
        paddingLeft: "0.9rem",
        minWidth: "280px",
        maxWidth: "430px",
        width: "100%",
        flex: "0 1 430px",
    },
    searchInput: {
        width: "100%",
        border: "none",
        borderRadius: "999px",
        padding: "0.7rem 1.2rem",
        background: "transparent",
        color: "var(--text-main)",
        outline: "none",
        fontSize: "0.92rem",
    },
    kpiGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
    feed: {
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
    },
    card: {
        position: "relative",
        width: "100%",
        borderRadius: "28px",
        overflow: "hidden",
        minHeight: "560px",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.14)",
        background: "#111",
    },
    mediaSplit: {
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        zIndex: 0,
    },
    mediaPane: {
        position: "relative",
        overflow: "hidden",
        background: "#101718",
    },
    paneImage: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center center",
    },
    paneFallback: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #1f3a3d 0%, #2f5a5f 60%, #6ea1a8 100%)",
        color: "rgba(255,255,255,0.92)",
        fontSize: "1.1rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
    },
    paneLabel: {
        position: "absolute",
        top: "12px",
        left: "12px",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: "700",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: "white",
        background: "rgba(0,0,0,0.5)",
        border: "1px solid rgba(255,255,255,0.2)",
        zIndex: 3,
    },
    mediaDivider: {
        position: "absolute",
        top: "8%",
        bottom: "8%",
        left: "50%",
        width: "1px",
        transform: "translateX(-0.5px)",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.35), rgba(255,255,255,0.05))",
        zIndex: 3,
    },
    cardFallback: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #1f3a3d 0%, #2f5a5f 60%, #6ea1a8 100%)",
        color: "rgba(255,255,255,0.92)",
        fontSize: "1.45rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
    },
    gradientLayer: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.68) 34%, rgba(5,10,5,0.16) 63%, transparent 80%)",
        pointerEvents: "none",
        zIndex: 2,
    },
    gradientSideLeft: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "18%",
        background: "linear-gradient(to right, rgba(0,0,0,0.65), rgba(0,0,0,0))",
        pointerEvents: "none",
        zIndex: 2,
    },
    gradientSideRight: {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: "18%",
        background: "linear-gradient(to left, rgba(0,0,0,0.65), rgba(0,0,0,0))",
        pointerEvents: "none",
        zIndex: 2,
    },
    statusBadge: {
        position: "absolute",
        top: "14px",
        right: "14px",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "0.72rem",
        fontWeight: "700",
        background: "rgba(46,125,110,0.30)",
        color: "white",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.22)",
        letterSpacing: "0.04em",
        zIndex: 2,
        textTransform: "uppercase",
    },
    cardOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "1.35rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
        zIndex: 2,
    },
    cardTitle: {
        margin: 0,
        color: "white",
        fontSize: "1.4rem",
        fontWeight: "700",
        lineHeight: "1.28",
    },
    meta: {
        margin: 0,
        color: "rgba(255,255,255,0.76)",
        fontSize: "0.84rem",
        lineHeight: "1.5",
    },
    contentGrid: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 300px)",
        gap: "0.9rem",
        alignItems: "start",
    },
    descriptionWrap: {
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
    },
    description: {
        margin: 0,
        color: "rgba(255,255,255,0.9)",
        fontSize: "0.9rem",
        lineHeight: "1.55",
        maxWidth: "min(92%, 900px)",
    },
    authorLine: {
        margin: 0,
        color: "rgba(255,255,255,0.93)",
        fontSize: "0.86rem",
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
        background: "rgba(255,255,255,0.13)",
        fontSize: "0.75rem",
        color: "rgba(255,255,255,0.9)",
        fontWeight: "500",
        border: "1px solid rgba(255,255,255,0.2)",
    },
    proPanel: {
        background: "rgba(255, 255, 255, 0.12)",
        border: "1px solid rgba(255,255,255,0.26)",
        borderRadius: "16px",
        padding: "0.72rem 0.78rem",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
    },
    proHeader: {
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
    },
    proAvatar: {
        width: "42px",
        height: "42px",
        borderRadius: "50%",
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.45)",
        background: "linear-gradient(145deg, rgba(189, 234, 220, 0.95), rgba(121, 188, 174, 0.95))",
        color: "#0f393c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.78rem",
        fontWeight: "700",
        overflow: "hidden",
    },
    proHeading: {
        margin: "0 0 0.1rem 0",
        fontSize: "0.62rem",
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        fontWeight: "700",
        color: "rgba(231, 255, 248, 0.78)",
    },
    proName: {
        margin: 0,
        fontSize: "0.92rem",
        fontWeight: "700",
        color: "#ffffff",
        lineHeight: "1.2",
    },
    proStatsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "0.42rem",
    },
    proStatCard: {
        background: "rgba(12, 30, 34, 0.32)",
        border: "1px solid rgba(228, 255, 246, 0.16)",
        borderRadius: "11px",
        padding: "0.45rem 0.52rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
    },
    proStatLabel: {
        fontSize: "0.64rem",
        color: "rgba(225, 248, 240, 0.82)",
        lineHeight: "1.2",
    },
    proStatValue: {
        fontSize: "0.78rem",
        fontWeight: "700",
        color: "white",
        lineHeight: "1.2",
    },
};

function ProjetsPostesContent() {
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(apiUrl("/part/projects"), {
                    method: "GET",
                    headers: buildAuthHeaders(),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error || "Erreur lors du chargement");
                setProjects(data.projects || []);
            } catch (err) {
                alert(`Erreur lors du chargement des projets: ${err.message}`);
            }
        };
        fetchProjects();
    }, []);

    const filtered = useMemo(() => {
        return projects.filter((project) => {
            const text = `${project.title || ""} ${project.category || ""} ${project.proDisplayName || ""}`.toLowerCase();
            return text.includes(searchTerm.toLowerCase());
        });
    }, [projects, searchTerm]);

    const totalScore = filtered.reduce((acc, p) => acc + Number(p.upcyclingScore || 0), 0);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">Espace Particulier</p>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.45rem 0", letterSpacing: "-0.02em" }}>Projets postés</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>Découvrez les projets upcycling validés et publiés par les professionnels.</p>
            </header>

            <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}><Leaf size={18} color="#2E7D6E" /><div><strong>{filtered.length}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Projets affichés</div></div></div>
                <div style={styles.kpiCard}><BarChart3 size={18} color="#34585b" /><div><strong>{totalScore.toFixed(1)}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Points UC cumulés</div></div></div>
                <div style={styles.kpiCard}><Box size={18} color="#3f6c70" /><div><strong>{projects.reduce((acc, p) => acc + Number(p.itemCount || 0), 0)}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Objets revalorisés</div></div></div>
            </div>

            <div style={styles.searchRow}>
                <div style={styles.searchInputWrap}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        style={styles.searchInput}
                        placeholder="Rechercher titre, catégorie ou professionnel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div style={styles.feed}>
                {filtered.map((project) => {
                    const beforeSrc = project.beforeImage || "";
                    const afterSrc = project.afterImage || "";
                    const hasAnyImage = Boolean(beforeSrc || afterSrc);
                    const joinedLabel = project.proJoinedAt
                        ? new Date(project.proJoinedAt).toLocaleDateString("fr-FR")
                        : "N/A";
                    const proName = (project.proDisplayName || "N/A").trim();
                    const proInitials = proName === "N/A"
                        ? "NA"
                        : proName
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() || "")
                            .join("");
                    const proAvatarUrl = project.proAvatarUrl || "";

                    return (
                    <article key={project.id} style={styles.card}>
                        {hasAnyImage ? (
                            <>
                                <div style={styles.mediaSplit}>
                                    <div style={styles.mediaPane}>
                                        {beforeSrc ? (
                                            <img src={beforeSrc} alt={`Avant - ${project.title || "Projet"}`} style={styles.paneImage} />
                                        ) : (
                                            <div style={styles.paneFallback}>Avant</div>
                                        )}
                                        <div style={styles.paneLabel}>Avant</div>
                                    </div>
                                    <div style={styles.mediaPane}>
                                        {afterSrc ? (
                                            <img src={afterSrc} alt={`Après - ${project.title || "Projet"}`} style={styles.paneImage} />
                                        ) : (
                                            <div style={styles.paneFallback}>Apres</div>
                                        )}
                                        <div style={styles.paneLabel}>Apres</div>
                                    </div>
                                </div>
                                <div style={styles.mediaDivider} />
                            </>
                        ) : (
                            <div style={styles.cardFallback}>UpcycleConnect</div>
                        )}
                        <div style={styles.gradientSideLeft} />
                        <div style={styles.gradientSideRight} />
                        <div style={styles.gradientLayer} />
                        <div style={styles.statusBadge}>PUBLIE</div>

                        <div style={styles.cardOverlay}>
                            <h3 style={styles.cardTitle}>{project.title || `Projet #${project.id}`}</h3>
                            <p style={styles.meta}>
                                {project.category || "Catégorie non définie"} · Mis à jour le {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
                            </p>
                            <div style={styles.contentGrid} className="card-content-grid">
                                <div style={styles.descriptionWrap}>
                                    <p style={styles.description}>{project.description || "Description non renseignée."}</p>
                                    <div style={styles.tagsRow}>
                                        {project.category ? <span style={styles.tag}>{project.category}</span> : null}
                                        <span style={styles.tag}>{project.itemCount || 0} objet(s)</span>
                                        <span style={styles.tag}>{Number(project.upcyclingScore || 0).toFixed(1)} points UC</span>
                                        <span style={styles.tag}>{Number(project.totalWeightKg || 0).toFixed(1)} kg revalorisés</span>
                                    </div>
                                </div>

                                <aside style={styles.proPanel}>
                                    <div style={styles.proHeader}>
                                        <div style={styles.proAvatar}>
                                            {proAvatarUrl ? (
                                                <img src={proAvatarUrl} alt={proName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span>{proInitials}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p style={styles.proHeading}>Professionnel</p>
                                            <p style={styles.proName}>{proName}</p>
                                        </div>
                                    </div>
                                    <div style={styles.proStatsGrid}>
                                        <div style={styles.proStatCard}>
                                            <span style={styles.proStatLabel}>Inscription</span>
                                            <span style={styles.proStatValue}>{joinedLabel}</span>
                                        </div>
                                        <div style={styles.proStatCard}>
                                            <span style={styles.proStatLabel}>Projets créés</span>
                                            <span style={styles.proStatValue}>{Number(project.proProjectsSinceSignup || 0)}</span>
                                        </div>
                                        <div style={styles.proStatCard}>
                                            <span style={styles.proStatLabel}>Score UC total</span>
                                            <span style={styles.proStatValue}>{Number(project.proTotalUCScore || 0).toFixed(1)}</span>
                                        </div>
                                        <div style={styles.proStatCard}>
                                            <span style={styles.proStatLabel}>UC du projet</span>
                                            <span style={styles.proStatValue}>{Number(project.upcyclingScore || 0).toFixed(1)}</span>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </article>
                )})}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 980px) {
                    .card-content-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default function ProjetsPostesPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <ProjetsPostesContent />
        </Suspense>
    );
}
