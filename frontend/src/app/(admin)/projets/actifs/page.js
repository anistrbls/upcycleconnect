"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle2, Eye, BarChart3 } from "lucide-react";
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
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "1.5rem",
    },
    card: {
        position: "relative",
        borderRadius: "28px",
        overflow: "hidden",
        height: "390px",
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
        background: "linear-gradient(to top, rgba(5,10,5,0.9) 0%, rgba(5,10,5,0.45) 35%, rgba(5,10,5,0.08) 60%, transparent 75%)",
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
        background: "rgba(46,125,110,0.28)",
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
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.72rem",
        zIndex: 2,
    },
    cardTitle: {
        margin: 0,
        color: "white",
        fontSize: "1.2rem",
        fontWeight: "700",
        lineHeight: "1.3",
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
    },
};

function ProjetsActifsContent() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchProjects = async () => {
        try {
            const qs = new URLSearchParams({ moderationStatus: "approved" });
            const response = await fetch(apiUrl(`/admin/projects?${qs.toString()}`), {
                method: "GET",
                headers: buildAuthHeaders(),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Erreur lors du chargement");
            setProjects(data.projects || []);
        } catch (err) {
            alert(`Erreur lors du chargement des projets actifs: ${err.message}`);
        }
    };

    useEffect(() => {
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
                <p className="activities-label">Espace Admin</p>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.45rem 0", letterSpacing: "-0.02em" }}>Projets actifs</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>Projets validés et publiés visibles par les professionnels.</p>
            </header>

            <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}><CheckCircle2 size={18} color="#2E7D6E" /><div><strong>{filtered.length}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Projets actifs</div></div></div>
                <div style={styles.kpiCard}><BarChart3 size={18} color="#34585b" /><div><strong>{totalScore.toFixed(1)}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Score UC cumulé</div></div></div>
                <div style={styles.kpiCard}><Eye size={18} color="#3f6c70" /><div><strong>{projects.length}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Total validés</div></div></div>
            </div>

            <div style={styles.searchRow}>
                <div style={styles.searchInputWrap}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        style={styles.searchInput}
                        placeholder="Rechercher titre, catégorie ou auteur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div style={styles.grid}>
                {filtered.map((project) => (
                    <div key={project.id} style={styles.card} onClick={() => router.push(`/projets/moderation/${project.id}`)}>
                        {project.previewImage ? (
                            <img src={project.previewImage} alt={project.title || "Projet"} style={styles.cardImage} />
                        ) : (
                            <div style={styles.cardFallback}>UpcycleConnect</div>
                        )}
                        <div style={styles.gradientLayer} />
                        <div style={styles.statusBadge}>ACTIF</div>

                        <div style={styles.cardOverlay}>
                            <h3 style={styles.cardTitle}>{project.title || `Projet #${project.id}`}</h3>
                            <p style={styles.description}>
                                {project.category || "Catégorie non définie"} · Mis à jour le {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
                            </p>
                            <p style={styles.authorLine}>Par {project.proDisplayName || "Professionnel"}</p>
                            <div style={styles.tagsRow}>
                                {project.category ? <span style={styles.tag}>{project.category}</span> : null}
                                <span style={styles.tag}>{project.itemCount || 0} objet(s)</span>
                                <span style={styles.tag}>{Number(project.upcyclingScore || 0).toFixed(1)} points UC</span>
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
            `}</style>
        </div>
    );
}

export default function ProjetsActifsPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <ProjetsActifsContent />
        </Suspense>
    );
}
