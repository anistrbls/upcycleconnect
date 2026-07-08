"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Leaf, Box, BarChart3, Heart, Bookmark } from "lucide-react";
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
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
        marginTop: "1.2rem",
        alignItems: "flex-end",
        textAlign: "right",
    },
    proHeader: {
        display: "flex",
        alignItems: "center",
        gap: "0.8rem",
        flexDirection: "row",
    },
    proAvatar: {
        width: "38px",
        height: "38px",
        borderRadius: "50%",
        flexShrink: 0,
        background: "rgba(255,255,255,0.1)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.8rem",
        fontWeight: "600",
        border: "1px solid rgba(255,255,255,0.15)",
        overflow: "hidden",
        order: 2,
    },
    proHeading: {
        margin: "0 0 0.1rem 0",
        fontSize: "0.6rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.45)",
    },
    proName: {
        margin: 0,
        fontSize: "0.92rem",
        fontWeight: "600",
        color: "#ffffff",
        lineHeight: "1.2",
    },
    proStatsRow: {
        display: "flex",
        flexWrap: "wrap",
        columnGap: "1.2rem",
        rowGap: "0.4rem",
        padding: "0.2rem 0",
        justifyContent: "flex-end",
    },
    proStat: {
        display: "flex",
        flexDirection: "column",
        gap: "0.1rem",
        alignItems: "flex-end",
    },
    proStatLabel: {
        fontSize: "0.62rem",
        color: "rgba(255, 255, 255, 0.4)",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
    },
    proStatValue: {
        fontSize: "0.82rem",
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: "1.2",
    },
};

function ProjetsParticipesContent() {
    const router = useRouter();
    const isPro = getRoleFromToken() === "professionnel";
    const spaceLabel = isPro ? "Espace Professionnel" : "Espace Particulier";
    const [projects, setProjects] = useState([]);
    const [myScore, setMyScore] = useState(null);
    const [myWeight, setMyWeight] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [subscriptionType, setSubscriptionType] = useState("decouverte");
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setSubscriptionType(data.user?.subscriptionType || "decouverte");
                }
            } catch (e) {
                console.error("Erreur récup utilisateur:", e);
            }
        };
        fetchUser();
    }, []);

    const handleDownloadPDF = async () => {
        setGeneratingPdf(true);
        try {
            const response = await fetch(apiUrl("/projets/impact-details"), {
                headers: buildAuthHeaders(),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Erreur de chargement");
            
            const details = data.details || [];
            
            const { jsPDF } = await import("jspdf");
            const doc = new jsPDF();
            
            // Header styling
            doc.setFillColor(15, 25, 35);
            doc.rect(0, 0, 210, 40, "F");
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text("ANALYSE D'IMPACT ECOLOGIQUE DETAILLEE", 15, 20);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Généré par UpCycle Connect — Espace Premium", 15, 30);
            
            // Score Summary
            doc.setTextColor(15, 25, 35);
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Résumé Global", 15, 55);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`Score UC Total : ${myScore === null ? "0.0" : myScore.toFixed(1)} UC`, 15, 65);
            doc.text(`Masse Totale Revalorisée : ${myWeight === null ? "0.0" : myWeight.toFixed(1)} kg`, 15, 72);
            doc.text(`Nombre de Projets Publiés : ${projects.length}`, 15, 79);
            
            // Table Header
            let y = 95;
            doc.setFont("helvetica", "bold");
            doc.setFillColor(235, 245, 240);
            doc.rect(15, y, 180, 8, "F");
            
            doc.setFontSize(8);
            doc.text("Objet (ID)", 17, y + 5);
            doc.text("Matériau (Coeff)", 70, y + 5);
            doc.text("Masse (kg)", 110, y + 5);
            doc.text("Prix initial", 135, y + 5);
            doc.text("Payé (Stripe)", 155, y + 5);
            doc.text("Score (UC)", 178, y + 5);
            
            y += 8;
            doc.setFont("helvetica", "normal");
            
            details.forEach((row, index) => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                    
                    // Table Header on new page
                    doc.setFont("helvetica", "bold");
                    doc.setFillColor(235, 245, 240);
                    doc.rect(15, y, 180, 8, "F");
                    doc.text("Objet (ID)", 17, y + 5);
                    doc.text("Matériau (Coeff)", 70, y + 5);
                    doc.text("Masse (kg)", 110, y + 5);
                    doc.text("Prix initial", 135, y + 5);
                    doc.text("Payé (Stripe)", 155, y + 5);
                    doc.text("Score (UC)", 178, y + 5);
                    y += 8;
                    doc.setFont("helvetica", "normal");
                }
                
                // Alternate row color
                if (index % 2 === 1) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(15, y, 180, 7, "F");
                }
                
                // Print cells
                const titleStr = row.item_title.length > 25 ? row.item_title.substring(0, 22) + "..." : row.item_title;
                doc.text(`${titleStr} (#${row.item_id})`, 17, y + 5);
                doc.text(`${row.material} (x${row.coefficient.toFixed(1)})`, 70, y + 5);
                doc.text(`${row.weight_kg.toFixed(2)} kg`, 110, y + 5);
                doc.text(`${row.price.toFixed(2)} €`, 135, y + 5);
                doc.text(`${row.paid_amount.toFixed(2)} €`, 155, y + 5);
                
                doc.setFont("helvetica", "bold");
                doc.text(`+${row.item_score.toFixed(1)}`, 178, y + 5);
                doc.setFont("helvetica", "normal");
                
                y += 7;
            });
            
            // Footer notice
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text("Ce document atteste de la contribution écologique certifiée de l'entreprise sur la plateforme UpCycle Connect.", 15, y + 15);
            doc.text("Les calculs d'impact sont basés sur les formules officielles de la plateforme (masse x coefficient matériau).", 15, y + 20);
            
            doc.save("analyse-impact-ecologique.pdf");
        } catch (err) {
            alert("Erreur lors de la génération du PDF : " + err.message);
        } finally {
            setGeneratingPdf(false);
        }
    };

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(apiUrl("/mes-projets"), {
                    method: "GET",
                    headers: buildAuthHeaders(),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error || "Erreur lors du chargement");
                setProjects(data.projects || []);
                setMyScore(typeof data.myScore === "number" ? data.myScore : null);
                setMyWeight(typeof data.myWeight === "number" ? data.myWeight : null);
            } catch (err) {
                console.error("Erreur:", err);
            } finally {
                setLoading(false);
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

    const totalWeight = filtered.reduce((acc, p) => acc + Number(p.totalWeightKg || 0), 0);
    const totalScore = filtered.reduce((acc, p) => acc + Number(p.upcyclingScore || 0), 0);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">{spaceLabel}</p>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.45rem 0", letterSpacing: "-0.02em" }}>My Upcycle</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>
                    {isPro
                        ? "Vos projets publiés et validés, réalisés avec des objets que vous avez réellement récupérés (ramassage effectué)."
                        : "Retrouvez les projets d'upcycling qui ont abouti grâce aux objets que vous avez donnés ou vendus."}
                </p>
            </header>

            {/* ── My UpcycleScore banner ── */}
            <div style={{
                background: "linear-gradient(135deg, #0f1923 0%, #1a2e24 50%, #0d2218 100%)",
                borderRadius: "24px",
                padding: "2rem 2.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "2rem",
                marginBottom: "1.5rem",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                position: "relative",
                overflow: "hidden",
            }}>
                {/* glow effect */}
                <div style={{
                    position: "absolute", top: "-60px", right: "120px",
                    width: "220px", height: "220px",
                    background: "radial-gradient(circle, rgba(46,125,110,0.25) 0%, transparent 70%)",
                    pointerEvents: "none",
                }} />
                <div style={{ zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                        <Leaf size={16} color="#4ade80" />
                        <span style={{ fontSize: "0.7rem", fontWeight: "800", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            {isPro ? "UpCycle Connect (pro)" : "My UpcycleScore"}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                        <span style={{ fontSize: "3.5rem", fontWeight: "800", color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                            {myScore === null ? "–" : myScore.toFixed(1)}
                        </span>
                        <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "rgba(255,255,255,0.4)" }}>UC</span>
                    </div>
                    <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", maxWidth: "420px", lineHeight: 1.5 }}>
                        {isPro
                            ? "Somme des scores des objets que vous avez récupérés (statut ramassé) et utilisés dans vos projets publiés et validés : (kg) × (coefficient matériau). Les seules réservations ne comptent pas."
                            : "Score calculé sur vos objets intégrés dans des projets certifiés — (poids en kg) × (coefficient matériau)."}
                    </p>
                </div>
                <div style={{ zIndex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "14px", padding: "0.8rem 1.2rem", textAlign: "center", minWidth: "100px" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#4ade80" }}>{projects.length}</div>
                            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.2rem" }}>Projets</div>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "14px", padding: "0.8rem 1.2rem", textAlign: "center", minWidth: "100px" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#4ade80" }}>
                                {myWeight === null ? "0" : myWeight.toFixed(1)} <span style={{ fontSize: "0.8rem", color: "rgba(48, 125, 110, 1)" }}>kg</span>
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.2rem" }}>Poids</div>
                        </div>
                    </div>
                    {isPro && subscriptionType === "premium_atelier" && (
                        <button
                            onClick={handleDownloadPDF}
                            disabled={generatingPdf}
                            style={{
                                marginTop: "1rem",
                                background: "#4ade80",
                                color: "#0d2218",
                                border: "none",
                                borderRadius: "999px",
                                padding: "0.6rem 1.2rem",
                                fontWeight: "700",
                                fontSize: "0.8rem",
                                cursor: generatingPdf ? "default" : "pointer",
                                transition: "all 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                            }}
                        >
                            {generatingPdf ? "Génération du PDF..." : "Obtenir mon analyse d'impact écologique détaillée"}
                        </button>
                    )}
                </div>
            </div>

                <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}><Heart size={18} color="#E11D48" /><div><strong>{filtered.length}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{isPro ? "Projets publiés" : "Projets participés"}</div></div></div>
                <div style={styles.kpiCard}><BarChart3 size={18} color="#34585b" /><div><strong>{totalScore.toFixed(1)}</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{isPro ? "UC (objets récupérés)" : "Impact cumulé (UC)"}</div></div></div>
                <div style={styles.kpiCard}><Leaf size={18} color="#2E7D6E" /><div><strong>{isPro ? (myWeight === null ? "–" : `${myWeight.toFixed(1)}`) : totalWeight.toFixed(1)} kg</strong><div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{isPro ? "Masse (récupérés, validés)" : "Masse revalorisée"}</div></div></div>
            </div>

            <div style={styles.searchRow}>
                <div style={styles.searchInputWrap}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        style={styles.searchInput}
                        placeholder={isPro ? "Rechercher dans vos projets publiés…" : "Rechercher par titre ou professionnel..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div style={styles.feed}>
                {loading ? (
                    <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        {isPro ? "Chargement de vos projets validés…" : "Chargement de vos participations..."}
                    </p>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#f9f9f9", borderRadius: "24px", color: "var(--text-muted)" }}>
                        <p style={{ fontSize: "1.2rem", fontWeight: "500" }}>{isPro ? "Aucun projet validé pour l'instant" : "Aucun projet trouvé"}</p>
                        <p>
                            {isPro
                                ? "Publiez un projet validé par la modération avec au moins un objet récupéré (ramassé) pour le voir ici et alimenter votre score UpCycle Connect."
                                : "Vos objets n'ont pas encore été intégrés dans un projet finalisé."}
                        </p>
                    </div>
                ) : (
                    filtered.map((project) => {
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
                                    setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, isBookmarked: data.isBookmarked, bookmarkCount: data.bookmarkCount } : proj));
                                }
                            } catch (err) { console.error(err); }
                        };

                        return (
                        <article
                            key={project.id}
                            style={styles.card}
                            onClick={() => router.push(`/projets/voir/${project.id}?from=participes`)}
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
                            <div style={styles.gradientSideLeft} />
                            <div style={styles.gradientSideRight} />
                            <div style={styles.gradientLayer} />

                            <div style={styles.cardOverlay}>
                                <div style={styles.contentGrid} className="card-content-grid">
                                    <div style={styles.descriptionWrap}>
                                        <h3 style={styles.cardTitle} data-i18n-user-content="true">{project.title}</h3>
                                        <p style={styles.meta}>
                                            <span data-i18n-user-content="true">{project.category}</span> · Finalisé le {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
                                        </p>
                                        <p style={styles.description} data-i18n-user-content="true">{project.description}</p>
                                        <div style={styles.tagsRow}>
                                            <span style={styles.tag}>{project.itemCount} objet(s) au total</span>
                                            <span style={styles.tag}>
                                                {isPro
                                                    ? `${Number(project.upcyclingScore).toFixed(1)} UC (récup.)`
                                                    : `${Number(project.upcyclingScore).toFixed(1)} points UC`}
                                            </span>
                                            <span style={styles.tag}>
                                                {isPro
                                                    ? `${Number(project.totalWeightKg).toFixed(1)} kg (projet)`
                                                    : `${Number(project.totalWeightKg).toFixed(1)} kg sauvés`}
                                            </span>
                                        </div>
                                    </div>

                                    <aside style={styles.proPanel}>
                                        <div style={styles.proHeader}>
                                            <div style={styles.proAvatar}>
                                                <span>{proInitials}</span>
                                            </div>
                                            <div>
                                                <p style={styles.proHeading}>Réalisé par</p>
                                                <p style={styles.proName}>{proName}</p>
                                            </div>
                                        </div>
                                        <div style={styles.proStatsRow}>
                                            <div style={styles.proStat}>
                                                <span style={styles.proStatLabel}>SOCIÉTÉ</span>
                                                <span style={styles.proStatValue}>
                                                    {project.companyName ? <span data-i18n-user-content="true">{project.companyName}</span> : "Professionnel"}
                                                </span>
                                            </div>
                                        </div>
                                    </aside>
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
                @media (max-width: 980px) {
                    .card-content-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default function ProjetsParticipesPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <ProjetsParticipesContent />
        </Suspense>
    );
}
