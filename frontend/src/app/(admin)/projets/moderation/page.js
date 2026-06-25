"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, XCircle, Clock3, ShieldAlert, Check, X } from "lucide-react";
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
    searchInput: {
        width: "100%",
        border: "none",
        borderRadius: "999px",
        padding: "0.7rem 1.2rem",
        background: "rgb(229, 255, 188)",
        color: "var(--text-main)",
        outline: "none",
        fontSize: "0.92rem",
    },
    statusBtn: (active) => ({
        border: "none",
        borderRadius: "999px",
        padding: "0.55rem 1rem",
        background: active ? "var(--black)" : "rgb(229, 255, 188)",
        color: active ? "white" : "var(--text-main)",
        cursor: "pointer",
        fontSize: "0.82rem",
        fontWeight: "600",
        transition: "background-color 0.2s ease",
    }),
    kpiGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
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
        height: "420px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
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
    statusBadge: (status) => ({
        position: "absolute",
        top: "14px",
        right: "14px",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "0.72rem",
        fontWeight: "700",
        background: "rgba(255,255,255,0.18)",
        color: "white",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.22)",
        letterSpacing: "0.04em",
        zIndex: 2,
        textTransform: "uppercase",
    }),
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
    titlePriceRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: "0.75rem",
    },
    cardTitle: {
        margin: 0,
        color: "white",
        fontSize: "1.2rem",
        fontWeight: "700",
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
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
    },
    noteBox: {
        width: "100%",
        minHeight: "68px",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: "12px",
        padding: "0.55rem 0.65rem",
        outline: "none",
        resize: "vertical",
        fontFamily: "inherit",
        fontSize: "0.78rem",
        background: "rgba(255,255,255,0.12)",
        color: "#fff",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
    },
    cardActions: {
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
    },
    actionBtn: (tone) => ({
        "--btn-bg": tone === "accept" ? "var(--forest-deep)" : tone === "reject" ? "rgba(255, 82, 82, 0.15)" : "rgba(255, 255, 255, 0.12)",
        "--btn-color": tone === "accept" ? "white" : tone === "reject" ? "#ff5252" : "white",
        "--btn-hover": tone === "accept" ? "#1b2a2c" : tone === "reject" ? "rgba(255, 82, 82, 0.25)" : "rgba(255, 255, 255, 0.22)",
        flex: 1,
        border: tone === "view" ? "1px solid rgba(255,255,255,0.3)" : "none",
        borderRadius: "14px",
        padding: "0.65rem 0.6rem",
        background: "var(--btn-bg)",
        color: "var(--btn-color)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "0.82rem",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.45rem",
        transition: "all 0.2s ease",
        backdropFilter: tone !== "accept" ? "blur(8px)" : "none",
        WebkitBackdropFilter: tone !== "accept" ? "blur(8px)" : "none",
    }),
};

const normalizeModStatus = (status) => {
    const value = String(status || "").toLowerCase();
    if (!value) return "";
    if (value === "approved") return "approved";
    if (value === "rejected") return "rejected";
    return "pending";
};

const labelForStatus = (status) => {
    const normalized = normalizeModStatus(status);
    if (normalized === "approved") return "validé";
    if (normalized === "rejected") return "refusé";
    return "en attente";
};

function ProjectsModerationContent() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("pending");
    const [notes, setNotes] = useState({});

    const fetchProjects = async () => {
        try {
            const qs = new URLSearchParams();
            if (statusFilter !== "all") qs.set("moderationStatus", statusFilter);
            const response = await fetch(apiUrl(`/admin/projects?${qs.toString()}`), {
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

    useEffect(() => {
        fetchProjects();
    }, [statusFilter]);

    const setModerationStatus = async (id, moderationStatus) => {
        try {
            const response = await fetch(apiUrl(`/admin/projects/${id}/moderate`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    moderationStatus,
                    moderationNote: notes[id] || "",
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Erreur de modération");
            fetchProjects();
        } catch (err) {
            alert(`Erreur lors de la modération: ${err.message}`);
        }
    };

    const filtered = useMemo(() => {
        return projects.filter((project) => {
            const text = `${project.title || ""} ${project.category || ""} ${project.proDisplayName || ""}`.toLowerCase();
            const matchesSearch = text.includes(searchTerm.toLowerCase());
            const currentStatus = normalizeModStatus(project.moderationStatus);
            const matchesStatus = statusFilter === "all"
                ? currentStatus === "pending" || currentStatus === "rejected"
                : currentStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [projects, searchTerm, statusFilter]);

    const pendingCount = projects.filter((p) => normalizeModStatus(p.moderationStatus) === "pending").length;
    const rejectedCount = projects.filter((p) => normalizeModStatus(p.moderationStatus) === "rejected").length;
    const moderationCount = pendingCount + rejectedCount;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">Espace Admin</p>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.45rem 0", letterSpacing: "-0.02em" }}>Modération des projets upcycle</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>Validez, refusez et suivez les projets soumis en un coup d'oeil.</p>
            </header>

            <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}><Clock3 size={18} color="#8a6d1f" /><div><strong>{pendingCount}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>En attente</div></div></div>
                <div style={styles.kpiCard}><XCircle size={18} color="#b24a4a" /><div><strong>{rejectedCount}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Refusés</div></div></div>
                <div style={styles.kpiCard}><ShieldAlert size={18} color="#34585b" /><div><strong>{moderationCount}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>A modérer</div></div></div>
            </div>

            <div style={styles.searchRow}>
                <div style={{ display: "flex", alignItems: "center", background: "rgb(229, 255, 188)", borderRadius: "999px", paddingLeft: "0.9rem", minWidth: "280px", maxWidth: "430px", width: "100%", flex: "0 1 430px" }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        style={styles.searchInput}
                        placeholder="Rechercher titre, catégorie ou auteur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button style={styles.statusBtn(statusFilter === "all")} onClick={() => setStatusFilter("all")}>Tous</button>
                <button style={styles.statusBtn(statusFilter === "pending")} onClick={() => setStatusFilter("pending")}>En attente</button>
                <button style={styles.statusBtn(statusFilter === "rejected")} onClick={() => setStatusFilter("rejected")}>Refusés</button>
            </div>

            <div style={styles.grid}>
                {filtered.map((project) => {
                    const currentStatus = normalizeModStatus(project.moderationStatus);
                    return (
                            <div key={project.id} style={{ ...styles.card, cursor: "pointer" }} onClick={() => router.push(`/projets/moderation/${project.id}`)}>
                            {project.previewImage ? (
                                <img src={project.previewImage} alt={project.title || "Projet"} style={styles.cardImage} data-i18n-user-content="true" />
                            ) : (
                                <div style={styles.cardFallback}>UpcycleConnect</div>
                            )}
                            <div style={styles.blurLayer} />
                            <div style={styles.gradientLayer} />
                            <div style={styles.statusBadge(currentStatus)}>{labelForStatus(currentStatus)}</div>

                            <div style={styles.cardOverlay}>
                                <div style={styles.titlePriceRow}>
                                    <h3 style={styles.cardTitle} data-i18n-user-content="true">{project.title || `Projet #${project.id}`}</h3>
                                </div>

                                <p style={styles.description}>
                                    {project.category || "Catégorie non définie"} · Mis à jour le {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
                                </p>
                                <p style={styles.authorLine}>Par {project.proDisplayName || "Professionnel"}</p>

                                <div style={styles.tagsRow}>
                                    {project.category ? <span style={styles.tag} data-i18n-user-content="true">{project.category}</span> : null}
                                    <span style={styles.tag}>{project.itemCount || 0} objet(s)</span>
                                </div>

                                <textarea
                                    style={styles.noteBox}
                                    placeholder="Note de modération (optionnel)"
                                    value={notes[project.id] ?? project.moderationNote ?? ""}
                                        onChange={(e) => setNotes((prev) => ({ ...prev, [project.id]: e.target.value }))}
                                        onClick={(e) => e.stopPropagation()}
                                />

                                <div style={styles.cardActions}>
                                    <button
                                        className="moderation-action-btn"
                                        style={styles.actionBtn("accept")}
                                            onClick={(e) => { e.stopPropagation(); setModerationStatus(project.id, "approved"); }}
                                    >
                                        <Check size={16} /> Valider
                                    </button>
                                    <button
                                        className="moderation-action-btn"
                                        style={styles.actionBtn("reject")}
                                            onClick={(e) => { e.stopPropagation(); setModerationStatus(project.id, "rejected"); }}
                                    >
                                        <X size={16} /> Refuser
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .moderation-action-btn:hover {
                    background: var(--btn-hover) !important;
                    transform: scale(1.03);
                }
                .moderation-action-btn:active {
                    transform: scale(0.97);
                }
            `}</style>
        </div>
    );
}

export default function ProjetsModerationPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <ProjectsModerationContent />
        </Suspense>
    );
}
