"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Heart, Bookmark } from "lucide-react";
import { apiUrl, buildAuthHeaders, getRoleFromToken } from "../../../lib/api";

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
        background: "rgb(240, 244, 248)",
        borderRadius: "999px",
        paddingLeft: "0.9rem",
        minWidth: "280px",
        maxWidth: "430px",
        width: "100%",
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
        cursor: "pointer",
        transition: "transform 0.3s ease",
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
    description: {
        margin: 0,
        color: "rgba(255,255,255,0.9)",
        fontSize: "0.9rem",
        lineHeight: "1.55",
        maxWidth: "900px",
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
};

function FavoritesContent() {
    const router = useRouter();
    const spaceLabel = getRoleFromToken() === "professionnel" ? "Espace Professionnel" : "Espace Particulier";
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all"); // 'all', 'liked', 'bookmarked'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const response = await fetch(apiUrl("/part/projects/favorites"), {
                    method: "GET",
                    headers: buildAuthHeaders(),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error || "Erreur");
                setProjects(data.projects || []);
            } catch (err) {
                console.error("Erreur:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFavorites();
    }, []);

    const filtered = useMemo(() => {
        return projects.filter((project) => {
            const matchesSearch = `${project.title || ""} ${project.category || ""} ${project.proDisplayName || ""}`.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesFilter = true;
            if (filterType === "liked") matchesFilter = project.isLiked;
            if (filterType === "bookmarked") matchesFilter = project.isBookmarked;

            return matchesSearch && matchesFilter;
        });
    }, [projects, searchTerm, filterType]);

    const handleToggleLike = async (e, p) => {
        e.stopPropagation();
        try {
            const resp = await fetch(apiUrl(`/part/projects/${p.id}/like`), {
                method: "POST",
                headers: buildAuthHeaders(),
            });
            const data = await resp.json();
            if (resp.ok) {
                setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, isLiked: data.isLiked, likeCount: data.likeCount } : proj));
            }
        } catch (err) { console.error(err); }
    };

    const handleToggleBookmark = async (e, p) => {
        e.stopPropagation();
        try {
            const resp = await fetch(apiUrl(`/part/projects/${p.id}/bookmark`), {
                method: "POST",
                headers: buildAuthHeaders(),
            });
            const data = await resp.json();
            if (resp.ok) {
                // If it's no longer liked AND no longer bookmarked, we could remove it from view
                // but usually user expects it to stay until refresh or they navigate away.
                // However, the rule is projects liked OR bookmarked.
                setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, isBookmarked: data.isBookmarked, bookmarkCount: data.bookmarkCount } : proj));
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={{ marginBottom: "0.45rem" }}>
                    <p className="activities-label" style={{ margin: 0 }}>{spaceLabel}</p>
                </div>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.45rem 0", letterSpacing: "-0.02em" }}>Projets favoris</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>Retrouvez les créations que vous avez aimées ou enregistrées pour plus tard.</p>
            </header>

            <div style={styles.searchRow}>
                <div style={styles.searchInputWrap}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        style={styles.searchInput}
                        placeholder="Rechercher dans vos favoris..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', background: 'rgb(240, 244, 248)', borderRadius: '999px', padding: '4px' }}>
                    <button
                        onClick={() => setFilterType("all")}
                        style={{
                            border: 'none',
                            background: filterType === "all" ? "white" : "transparent",
                            boxShadow: filterType === "all" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                            borderRadius: '999px',
                            padding: '0.5rem 1.2rem',
                            fontSize: '0.86rem',
                            fontWeight: '600',
                            color: filterType === "all" ? "var(--emerald-deep)" : "var(--text-muted)",
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Tous
                    </button>
                    <button
                        onClick={() => setFilterType("liked")}
                        style={{
                            border: 'none',
                            background: filterType === "liked" ? "white" : "transparent",
                            boxShadow: filterType === "liked" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                            borderRadius: '999px',
                            padding: '0.5rem 1.2rem',
                            fontSize: '0.86rem',
                            fontWeight: '600',
                            color: filterType === "liked" ? "#ff4d4d" : "var(--text-muted)",
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <Heart size={14} fill={filterType === "liked" ? "#ff4d4d" : "transparent"} />
                        Likés
                    </button>
                    <button
                        onClick={() => setFilterType("bookmarked")}
                        style={{
                            border: 'none',
                            background: filterType === "bookmarked" ? "white" : "transparent",
                            boxShadow: filterType === "bookmarked" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                            borderRadius: '999px',
                            padding: '0.5rem 1.2rem',
                            fontSize: '0.86rem',
                            fontWeight: '600',
                            color: filterType === "bookmarked" ? "#4ade80" : "var(--text-muted)",
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <Bookmark size={14} fill={filterType === "bookmarked" ? "#4ade80" : "transparent"} />
                        Enregistrés
                    </button>
                </div>
            </div>

            <div style={styles.feed}>
                {loading ? (
                    <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Chargement de vos favoris...</p>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#f9f9f9", borderRadius: "24px", color: "var(--text-muted)" }}>
                        <p style={{ fontSize: "1.2rem", fontWeight: "500" }}>Aucun favori pour le moment</p>
                        <p>Parcourez les projets pour ajouter vos premiers coups de cœur.</p>
                    </div>
                ) : (
                    filtered.map((project) => {
                        const beforeSrc = project.beforeImage || "";
                        const afterSrc = project.afterImage || "";
                        const hasAnyImage = Boolean(beforeSrc || afterSrc);

                        return (
                        <article
                            key={project.id}
                            style={styles.card}
                            onClick={() => router.push(`/projets/voir/${project.id}?from=favoris`)}
                            className="project-card-hover"
                        >
                            {/* Social Buttons */}
                            <div style={{ position: "absolute", top: "1.2rem", right: "1.2rem", zIndex: 10, display: "flex", gap: "0.6rem" }}>
                                <button
                                    onClick={(e) => handleToggleLike(e, project)}
                                    style={{
                                        background: "rgba(0,0,0,0.45)",
                                        backdropFilter: "blur(8px)",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        borderRadius: "50px",
                                        padding: "0.5rem 0.8rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.4rem",
                                        color: project.isLiked ? "#ff4d4d" : "white",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    <Heart size={16} fill={project.isLiked ? "#ff4d4d" : "transparent"} />
                                    <span style={{ fontSize: "0.8rem", fontWeight: "700" }}>{project.likeCount || 0}</span>
                                </button>
                                <button
                                    onClick={(e) => handleToggleBookmark(e, project)}
                                    style={{
                                        background: "rgba(0,0,0,0.45)",
                                        backdropFilter: "blur(8px)",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        borderRadius: "50px",
                                        padding: "0.5rem 0.8rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.4rem",
                                        color: project.isBookmarked ? "#4ade80" : "white",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    <Bookmark size={16} fill={project.isBookmarked ? "#4ade80" : "transparent"} />
                                    <span style={{ fontSize: "0.8rem", fontWeight: "700" }}>{project.bookmarkCount || 0}</span>
                                </button>
                            </div>

                            {hasAnyImage ? (
                                <>
                                    <div style={styles.mediaSplit}>
                                        <div style={styles.mediaPane}>
                                            {beforeSrc ? (
                                                <img src={beforeSrc} alt="Avant" style={styles.paneImage} />
                                            ) : (
                                                <div style={styles.paneFallback}>Avant</div>
                                            )}
                                            <div style={styles.paneLabel}>Avant</div>
                                        </div>
                                        <div style={styles.mediaPane}>
                                            {afterSrc ? (
                                                <img src={afterSrc} alt="Après" style={styles.paneImage} />
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
                            <div style={styles.gradientLayer} />

                            <div style={styles.cardOverlay}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <h3 style={styles.cardTitle}>{project.title}</h3>
                                    <p style={styles.meta}>
                                        {project.category} · Par {project.proDisplayName}
                                    </p>
                                    <p style={styles.description}>{project.description}</p>
                                    <div style={styles.tagsRow}>
                                        <span style={styles.tag}>{Number(project.upcyclingScore).toFixed(1)} points UC</span>
                                        <span style={styles.tag}>{Number(project.totalWeightKg).toFixed(1)} kg sauvés</span>
                                    </div>
                                </div>
                            </div>
                        </article>
                        );
                    })
                )}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .project-card-hover:hover {
                    transform: scale(1.005);
                }
            `}</style>
        </div>
    );
}

export default function FavoritesPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <FavoritesContent />
        </Suspense>
    );
}
