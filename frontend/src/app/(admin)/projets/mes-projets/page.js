"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { Plus, Tag, Calendar, Box, ChevronRight, Search, Filter, FileText, Pencil, Trash2 } from "lucide-react";

const STATUS_LABELS = { brouillon: "Brouillon", publie: "Publié" };
const MODERATION_LABELS = { pending: "En validation", approved: "Validé", rejected: "Refusé" };
const STATUS_COLORS = {
    brouillon: { bg: "rgba(180,140,60,0.15)", color: "#9A7520" },
    publie: { bg: "rgba(46,125,110,0.15)", color: "#2E7D6E" },
};

const styles = {
    container: { width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" },
    header: { marginBottom: "2rem" },
    headerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" },
    title: { margin: "0.5rem 0", fontSize: "2.5rem", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text-main)" },
    subtitle: { margin: "0.4rem 0 0", color: "var(--text-muted)", fontSize: "1.05rem" },
    addBtn: {
        display: "flex", alignItems: "center", gap: "0.5rem",
        padding: "0.72rem 1.25rem", borderRadius: "999px",
        background: "var(--black)", color: "#fff",
        border: "none", cursor: "pointer", fontFamily: "inherit",
        fontSize: "0.9rem", fontWeight: "600",
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
        padding: "0.6rem 1.2rem 0.6rem 2.3rem",
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
    emptyState: {
        textAlign: "center", padding: "4rem 2rem",
        background: "var(--surface-hover)",
        borderRadius: "28px",
        color: "var(--text-muted)", fontSize: "1rem",
    },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" },
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
    cardFallback: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #1f3a3d 0%, #2f5a5f 60%, #6ea1a8 100%)",
        color: "rgba(255,255,255,0.92)",
        fontSize: "1.55rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
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
    statusBadge: (status, moderationStatus) => {
        const rejected = moderationStatus === "rejected";
        return {
            position: "absolute",
            top: "14px",
            right: "14px",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "0.72rem",
            fontWeight: "700",
            background: rejected ? "rgba(255, 170, 170, 0.95)" : "rgb(229, 255, 188)",
            color: rejected ? "#7A1F1F" : "var(--text-main)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            letterSpacing: "0.04em",
            zIndex: 15,
            whiteSpace: "nowrap",
            maxWidth: "min(168px, calc(100% - 28px))",
            overflow: "hidden",
            textOverflow: "ellipsis",
            boxShadow: rejected ? "none" : "0 2px 12px rgba(0, 0, 0, 0.22)",
            border: rejected ? "none" : "1px solid rgba(43, 69, 72, 0.08)",
        };
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
    cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" },
    cardTitle: { fontSize: "1.2rem", fontWeight: "700", color: "white", margin: 0, lineHeight: "1.3", flex: 1 },
    projectPill: {
        padding: "5px 14px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.15)",
        color: "white",
        fontSize: "0.84rem",
        fontWeight: "700",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.25)",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    description: {
        fontSize: "0.82rem",
        color: "rgba(255,255,255,0.74)",
        margin: 0,
        lineHeight: "1.5",
    },
    badge: (status) => ({
        padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: "700",
        ...(STATUS_COLORS[status] || { bg: "#eee", color: "#555" }),
        background: (STATUS_COLORS[status] || {}).bg,
    }),
    meta: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
    metaItem: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "4px 12px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.12)",
        fontSize: "0.75rem",
        color: "rgba(255,255,255,0.88)",
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
};

export default function ProjetsList() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        fetch(apiUrl("/pro/projects"), { headers: buildAuthHeaders() })
            .then((r) => r.json())
            .then((d) => { setProjects(d.projects || []); setLoading(false); })
            .catch(() => { setError("Impossible de charger les projets"); setLoading(false); });
    }, []);

    const deleteProject = async (projectId, title) => {
        const ok = window.confirm(`Supprimer le projet "${title || "sans titre"}" ? Cette action est irreversible.`);
        if (!ok) return;
        try {
            const res = await fetch(apiUrl(`/pro/projects/${projectId}`), {
                method: "DELETE",
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "Impossible de supprimer le projet");
            }
            setProjects((prev) => prev.filter((p) => p.id !== projectId));
        } catch (e) {
            window.alert(e.message || "Erreur inattendue");
        }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    const filteredProjects = projects.filter((p) => {
        const matchesSearch = !searchTerm.trim()
            || (p.title || "").toLowerCase().includes(searchTerm.toLowerCase())
            || (p.category || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div style={styles.container}><p style={{ color: "var(--text-muted)" }}>Chargement…</p></div>;
    if (error) return <div style={styles.container}><p style={{ color: "#c0392b" }}>{error}</p></div>;

    const getDisplayStatus = (project) => {
        const moderationStatus = String(project.moderationStatus || "").toLowerCase();
        if (moderationStatus === "approved") {
            return STATUS_LABELS[project.status] || project.status;
        }
        return MODERATION_LABELS[moderationStatus] || STATUS_LABELS[project.status] || project.status;
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <p className="activities-label">Espace Professionnel</p>
                <div style={styles.headerTop}>
                    <div>
                        <h1 style={styles.title}>Mes projets d'upcycling</h1>
                        <p style={styles.subtitle}>Créez, suivez et publiez vos transformations à partir des objets récupérés.</p>
                    </div>
                    <button
                        className="action-btn primary"
                        style={{ padding: "0.8rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}
                        onClick={() => router.push("/projets/nouveau")}
                    >
                        <Plus size={20} />
                        <span>Nouveau projet</span>
                    </button>
                </div>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.95rem", color: "var(--text-muted)" }}>
                    {projects.length} projet{projects.length !== 1 ? "s" : ""}
                </p>
            </div>

            <div style={styles.filtersRow}>
                <div style={styles.searchContainer}>
                    <Search size={16} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                        style={styles.searchInput}
                        placeholder="Rechercher un projet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ position: "relative" }}>
                    <Filter size={14} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                    <select style={{ ...styles.filterSelect, paddingLeft: "2.2rem" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">Tous les statuts</option>
                        <option value="brouillon">Brouillons</option>
                        <option value="publie">Publiés</option>
                    </select>
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="panel" style={{ textAlign: "center", padding: "4rem 2rem", background: "white" }}>
                    <div style={{ marginBottom: "1rem", color: "var(--text-muted)" }}>
                        <FileText size={48} strokeWidth={1.5} />
                    </div>
                    <h3 style={{ marginBottom: "0.5rem" }}>Aucun projet</h3>
                    <p style={{ color: "var(--text-muted)" }}>Vous n'avez pas encore de projet en cours de rédaction.</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredProjects.map((p) => (
                        <div key={p.id} style={styles.card}
                            onClick={() => router.push(`/projets/${p.id}`)}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.14)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.10)"; }}>
                            {p.previewImage ? (
                                <img
                                    src={p.previewImage}
                                    alt={p.title || "Projet upcycling"}
                                    style={styles.cardImage}
                                />
                            ) : (
                                <div style={styles.cardFallback}>UpcycleConnect</div>
                            )}
                            <div style={styles.blurLayer} />
                            <div style={styles.gradientLayer} />
                            <span style={styles.statusBadge(p.status, String(p.moderationStatus || "").toLowerCase())}>{getDisplayStatus(p)}</span>

                            <div style={styles.cardOverlay}>
                                <div style={styles.cardTop}>
                                    <h3 style={styles.cardTitle}>{p.title}</h3>
                                    <span style={styles.projectPill}>Projet</span>
                                </div>
                                <p style={styles.description}>{(p.description || "Projet d'upcycling").slice(0, 120)}{(p.description || "").length > 120 ? "..." : ""}</p>

                                <div style={styles.meta}>
                                    {p.category && (
                                        <span style={styles.metaItem}><Tag size={12} />{p.category}</span>
                                    )}
                                    <span style={styles.metaItem}><Box size={12} />{p.itemCount} objet{p.itemCount !== 1 ? "s" : ""}</span>
                                    <span style={styles.metaItem}><Calendar size={12} />{formatDate(p.createdAt)}</span>
                                </div>

                                <div style={styles.cardActions}>
                                    <button
                                        style={styles.viewBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/projets/${p.id}`);
                                        }}
                                    >
                                        Ouvrir <ChevronRight size={14} style={{ marginLeft: 6, verticalAlign: "middle" }} />
                                    </button>
                                    <button
                                        style={styles.actionBtn}
                                        title="Modifier"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/projets/${p.id}`);
                                        }}
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        style={{ ...styles.actionBtn, borderColor: "rgba(255,120,120,0.5)", color: "#ffd3d3" }}
                                        title="Supprimer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteProject(p.id, p.title);
                                        }}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
