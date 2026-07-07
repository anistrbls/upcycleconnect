"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../../lib/api";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Box, Trash2, Share2, User2, Tag, Calendar, ListChecks } from "lucide-react";

const MODERATION_LABELS = { pending: "En validation", approved: "Valide", rejected: "Refuse" };
const IMAGE_TYPE_LABELS = { avant: "Avant", apres: "Apres", autre: "Autre" };

const modBadgeStyle = (status) => {
    if (status === "approved") return { bg: "rgba(46,125,110,0.13)", color: "#2E7D6E" };
    if (status === "rejected") return { bg: "rgba(178,74,74,0.13)", color: "#B24A4A" };
    return { bg: "rgba(180,140,60,0.13)", color: "#9A7520" };
};

const sectionLabel = {
    fontSize: "0.72rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    margin: "0 0 1rem",
    display: "block",
};

const actionBtn = (tone = "neutral") => ({
    "--btn-bg": tone === "primary" ? "var(--forest-deep)" : tone === "danger" ? "var(--state-critical-bg)" : "transparent",
    "--btn-hover-bg": tone === "primary" ? "#33575a" : tone === "danger" ? "#FFD6C9" : "rgba(35,59,61,0.06)",
    "--btn-border": tone === "neutral" ? "1px solid rgba(35,59,61,0.12)" : "none",
    "--btn-hover-border": tone === "neutral" ? "1px solid rgba(35,59,61,0.18)" : "none",
    "--btn-color": tone === "primary" ? "white" : tone === "danger" ? "var(--state-critical)" : "var(--text-main)",
    padding: "0.82rem 1rem",
    borderRadius: "999px",
    fontFamily: "inherit",
    fontSize: "0.88rem",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
});

const styles = {
    container: { width: "100%", padding: "1rem 0 4rem 0", animation: "fadeIn 0.4s ease-out" },
    topBar: {
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
        paddingBottom: "0.9rem", borderBottom: "1px solid rgba(35,59,61,0.08)",
    },
    backBtn: {
        display: "inline-flex", alignItems: "center", gap: "0.45rem",
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-muted)", fontSize: "0.86rem", fontFamily: "inherit", fontWeight: "600", padding: "0.25rem 0",
    },
    topRight: { display: "inline-flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
    topPill: (status) => ({
        display: "inline-flex", alignItems: "center", padding: "5px 11px",
        borderRadius: "999px", fontSize: "0.72rem", letterSpacing: "0.05em",
        fontWeight: "700", background: modBadgeStyle(status).bg, color: modBadgeStyle(status).color,
    }),
    shareBtn: {
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        background: "var(--surface-hover)", border: "none",
        color: "var(--text-main)", fontSize: "0.78rem", fontWeight: "600",
        padding: "6px 12px", borderRadius: "999px", cursor: "pointer",
    },
    heroGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(360px, 0.8fr)", gap: "1.5rem", alignItems: "stretch" },
    darkCard: { background: "var(--black)", borderRadius: "28px", padding: "1rem", border: "1px solid rgba(18,25,26,0.08)" },
    mediaFrame: { borderRadius: "22px", overflow: "hidden", background: "#12191A", position: "relative" },
    mediaStage: { position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden" },
    mediaImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 },
    mediaFallback: {
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(145deg, #1f3a3d 0%, #2f5a5f 60%, #6ea1a8 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.38)", fontSize: "1.45rem", fontWeight: "700", letterSpacing: "0.06em",
    },
    mediaGradient: {
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(10,15,15,0.72) 0%, rgba(10,15,15,0.2) 20%, rgba(10,15,15,0) 40%)",
        pointerEvents: "none", zIndex: 2,
    },
    arrowBtn: (side) => ({
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        [side]: "12px", padding: "8px", borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)", color: "white", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4,
    }),
    imageTypePill: {
        position: "absolute", bottom: "12px", left: "12px",
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
        color: "white", fontSize: "0.72rem", fontWeight: "700", letterSpacing: "0.06em",
        padding: "4px 10px", borderRadius: "999px", textTransform: "uppercase", zIndex: 6,
    },
    thumbsRow: {
        position: "absolute", left: 0, right: 0, bottom: 0,
        padding: "1.2rem", display: "flex", overflowX: "auto", gap: "0.6rem", zIndex: 5,
        scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
    },
    thumbBtn: (active) => ({
        border: active ? "2px solid white" : "1px solid rgba(255,255,255,0.16)",
        padding: 0, borderRadius: "14px", overflow: "hidden", cursor: "pointer",
        background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)",
        minWidth: "64px", width: "64px", height: "64px", flexShrink: 0,
        opacity: active ? 1 : 0.65, transition: "all 0.2s ease", position: "relative",
    }),
    thumbImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" },
    sideStack: { display: "grid", gap: "0.85rem", gridTemplateRows: "1fr auto", height: "100%" },
    summaryCard: {
        background: "#F7F8F7", borderRadius: "24px", padding: "1.15rem", border: "none",
        display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0,
    },
    h1: { fontSize: "1.74rem", fontWeight: "700", color: "var(--text-main)", margin: "0 0 0.42rem", lineHeight: "1.12", letterSpacing: "-0.03em" },
    subMeta: { display: "flex", flexWrap: "wrap", gap: "0.7rem", color: "var(--text-muted)", fontSize: "0.84rem", marginBottom: "1rem" },
    subMetaChip: { display: "inline-flex", alignItems: "center", gap: "0.3rem" },
    metricsGrid: {
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", padding: "1rem 0",
        borderTop: "1px solid rgba(35,59,61,0.08)", borderBottom: "1px solid rgba(35,59,61,0.08)", marginBottom: "1rem",
    },
    metricLabel: { fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.18rem" },
    metricValueBig: { fontSize: "1.15rem", fontWeight: "800", color: "var(--text-main)" },
    metricValue: { fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" },
    actionsWrap: { display: "grid", gap: "0.55rem" },
    authorCard: {
        background: "#F7F8F7", borderRadius: "20px", padding: "0.95rem 1.05rem", border: "none",
        display: "grid", gap: "0.7rem",
    },
    authorRow: { display: "flex", alignItems: "center", gap: "0.7rem" },
    authorAvatar: {
        width: "46px", height: "46px", borderRadius: "50%", background: "rgba(35,59,61,0.12)",
        color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center",
    },
    contentGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "1.35rem" },
    contentCard: { background: "#F7F8F7", borderRadius: "24px", padding: "1.2rem", border: "none", height: "100%" },
    description: { fontSize: "0.95rem", color: "var(--text-main)", lineHeight: "1.7", margin: 0, whiteSpace: "pre-wrap" },
    itemRow: {
        display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem",
        borderRadius: "12px", background: "#fff", marginBottom: "0.5rem",
    },
    itemImg: { width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 },
    itemImgFallback: {
        width: "44px", height: "44px", borderRadius: "8px", flexShrink: 0,
        background: "linear-gradient(135deg, #c5e8d1, #8bc4b0)", display: "flex", alignItems: "center", justifyContent: "center",
    },
    itemTitle: { fontWeight: "600", fontSize: "0.9rem", color: "var(--text-main)", margin: 0 },
    itemMeta: { fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0" },
    stepsWrap: { display: "grid", gap: "0.65rem" },
    stepRow: {
        display: "grid",
        gridTemplateColumns: "30px minmax(0, 1fr)",
        gap: "0.65rem",
        padding: "0.75rem",
        borderRadius: "12px",
        background: "#fff",
        alignItems: "start",
    },
    stepBadge: {
        width: "26px",
        height: "26px",
        borderRadius: "8px",
        background: "#E5FFBC",
        color: "#213A2C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.78rem",
        fontWeight: "800",
    },
    stepText: { margin: 0, fontSize: "0.9rem", color: "var(--text-main)", lineHeight: "1.55" },
    stepImage: {
        marginTop: "0.55rem",
        width: "100%",
        maxWidth: "340px",
        borderRadius: "10px",
        border: "1px solid rgba(35,59,61,0.12)",
        objectFit: "cover",
    },
    noteTextarea: {
        width: "100%", padding: "0.8rem 1rem", borderRadius: "12px",
        border: "none", background: "#fff", fontSize: "0.9rem",
        outline: "none", fontFamily: "inherit", color: "var(--text-main)",
        resize: "vertical", minHeight: "92px", boxSizing: "border-box", marginBottom: "0.75rem",
    },
    modalBackdrop: {
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1100,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    },
    modalCard: {
        width: "100%", maxWidth: "520px", background: "#fff", borderRadius: "18px",
        padding: "1.1rem 1.1rem 1rem", boxShadow: "0 20px 45px rgba(0,0,0,0.18)",
    },
    modalTitle: { margin: 0, color: "var(--text-main)", fontSize: "1.06rem", fontWeight: "700" },
    modalText: { margin: "0.5rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.5" },
    modalActions: { marginTop: "0.9rem", display: "flex", gap: "0.55rem", flexWrap: "wrap", justifyContent: "flex-end" },
    modalNote: {
        width: "100%", marginTop: "0.8rem", padding: "0.75rem 0.85rem", borderRadius: "12px",
        border: "1px solid rgba(35,59,61,0.16)", background: "#fff", fontSize: "0.9rem",
        outline: "none", fontFamily: "inherit", color: "var(--text-main)", resize: "vertical", minHeight: "98px",
    },
    modalError: { marginTop: "0.45rem", color: "#B24A4A", fontSize: "0.82rem", fontWeight: "600" },
    flash: (type) => ({
        padding: "0.75rem 1rem", borderRadius: "10px", fontSize: "0.88rem", marginBottom: "1rem",
        background: type === "success" ? "rgba(46,125,110,0.1)" : "rgba(178,74,74,0.1)",
        color: type === "success" ? "#2E7D6E" : "#B24A4A",
    }),
    inlineInfo: { fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.45" },
};

function ProjectModerationDetailContent() {
    const { id } = useParams();
    const router = useRouter();

    const [project, setProject] = useState(null);
    const [images, setImages] = useState([]);
    const [items, setItems] = useState([]);
    const [author, setAuthor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activePhoto, setActivePhoto] = useState(0);
    const [note, setNote] = useState("");
    const [flash, setFlash] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmAction, setConfirmAction] = useState(""); // approved | rejected | ""
    const [rejectReason, setRejectReason] = useState("");
    const [rejectError, setRejectError] = useState("");
    const [canDeleteProject, setCanDeleteProject] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const refreshUser = async () => {
            try {
                const res = await fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) {
                    setCanDeleteProject(data?.user?.role === "admin");
                }
            } catch {
                // Le layout global gère déjà l'expiration de session.
            }
        };
        refreshUser();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetch(apiUrl(`/admin/projects/${id}`), { headers: buildAuthHeaders() })
            .then((r) => {
                if (r.status === 404) {
                    setNotFound(true);
                    return null;
                }
                return r.json();
            })
            .then((data) => {
                if (!data) return;
                setProject(data.project || null);
                setImages(Array.isArray(data.images) ? data.images : []);
                setItems(Array.isArray(data.items) ? data.items : []);
                setAuthor(data.author || null);
                setNote(data.project?.moderationNote || "");
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    const moderate = async (moderationStatus) => {
        setSaving(true);
        setFlash(null);
        try {
            let moderationNote = note;
            if (moderationStatus === "rejected") {
                moderationNote = rejectReason.trim();
            }
            const res = await fetch(apiUrl(`/admin/projects/${id}/moderate`), {
                method: "POST",
                headers: { ...buildAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ moderationStatus, moderationNote }),
            });
            if (!res.ok) throw new Error();
            setProject((prev) => ({ ...prev, moderationStatus, moderationNote }));
            setNote(moderationNote);
            setConfirmAction("");
            setRejectReason("");
            setRejectError("");
            setFlash({ type: "success", msg: moderationStatus === "approved" ? "Projet valide et publie." : "Projet refuse." });
        } catch {
            setFlash({ type: "error", msg: "Une erreur est survenue. Reessayez." });
        } finally {
            setSaving(false);
        }
    };

    const openApproveConfirm = () => {
        setConfirmAction("approved");
        setRejectError("");
    };

    const openRejectConfirm = () => {
        setConfirmAction("rejected");
        setRejectReason(note || "");
        setRejectError("");
    };

    const submitConfirm = async () => {
        if (confirmAction === "rejected" && !rejectReason.trim()) {
            setRejectError("Le motif de refus est obligatoire.");
            return;
        }
        await moderate(confirmAction);
    };

    const removeProject = async () => {
        const ok = window.confirm("Supprimer definitivement ce projet ? Cette action est irreversible.");
        if (!ok) return;
        setSaving(true);
        setFlash(null);
        try {
            const res = await fetch(apiUrl(`/admin/projects/${id}`), {
                method: "DELETE",
                headers: buildAuthHeaders(),
            });
            if (!res.ok) throw new Error();
            router.push("/projets/moderation");
        } catch {
            setFlash({ type: "error", msg: "Suppression impossible pour le moment." });
            setSaving(false);
        }
    };

    const copyShareLink = async () => {
        const link = typeof window !== "undefined" ? window.location.href : "";
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setFlash({ type: "success", msg: "Lien du projet copie." });
        } catch {
            setFlash({ type: "error", msg: "Copie automatique impossible." });
        }
    };

    if (loading) return <div style={{ padding: "3rem", color: "var(--text-muted)" }}>Chargement...</div>;
    if (notFound || !project) {
        return (
            <div style={styles.container}>
                <button style={styles.backBtn} onClick={() => router.back()}><ArrowLeft size={16} /> Retour</button>
                <p style={{ color: "var(--text-muted)" }}>Projet introuvable.</p>
            </div>
        );
    }

    const modStatus = project.moderationStatus || "pending";
    const sortedImages = [...images].sort((a, b) => {
        const order = { apres: 0, avant: 1, autre: 2 };
        return (order[a.imageType] ?? 3) - (order[b.imageType] ?? 3);
    });
    const currentImg = sortedImages[activePhoto] || null;
    const joinedAtLabel = author?.joinedAt ? new Date(author.joinedAt).toLocaleDateString("fr-FR") : "N/A";
    const totalUCLabel = Number.isFinite(Number(author?.totalUCScore)) ? Number(author.totalUCScore).toFixed(1) : "0.0";
    const proDisplayName = (author?.fullName || project.proDisplayName || "Professionnel").trim();
    const companyName = (author?.companyName || "N/A").trim() || "N/A";
    const totalProjectsSinceSignup = Number.isFinite(Number(author?.totalProjectsSinceSignup)) ? Number(author.totalProjectsSinceSignup) : 0;
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

    return (
        <div style={styles.container}>
            <div style={styles.topBar}>
                <button style={styles.backBtn} onClick={() => router.push("/projets/moderation")}>
                    <ArrowLeft size={16} /> Retour a la moderation
                </button>

                <div style={styles.topRight}>
                    <span style={styles.topPill(modStatus)}>{MODERATION_LABELS[modStatus] || modStatus}</span>
                    <button onClick={copyShareLink} style={styles.shareBtn}>
                        <Share2 size={13} /> Copier le lien
                    </button>
                </div>
            </div>

            {flash && <div style={{ ...styles.flash(flash.type), marginTop: "1rem" }}>{flash.msg}</div>}

            <div className="hero-grid" style={{ ...styles.heroGrid, marginTop: "1.5rem" }}>
                <div style={styles.darkCard}>
                    <div style={styles.mediaFrame}>
                        <div style={styles.mediaStage}>
                            {currentImg ? (
                                <img src={currentImg.url} alt={project.title} style={styles.mediaImg} data-i18n-user-content="true" />
                            ) : (
                                <div style={styles.mediaFallback}>UpcycleConnect</div>
                            )}

                            <div style={styles.mediaGradient} />

                            {currentImg && (
                                <div style={styles.imageTypePill}>
                                    {IMAGE_TYPE_LABELS[currentImg.imageType] || currentImg.imageType}
                                </div>
                            )}

                            {sortedImages.length > 1 && (
                                <>
                                    <button style={styles.arrowBtn("left")} onClick={() => setActivePhoto((p) => (p - 1 + sortedImages.length) % sortedImages.length)}>
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button style={styles.arrowBtn("right")} onClick={() => setActivePhoto((p) => (p + 1) % sortedImages.length)}>
                                        <ChevronRight size={20} />
                                    </button>
                                </>
                            )}

                            {sortedImages.length > 1 && (
                                <div style={styles.thumbsRow}>
                                    {sortedImages.map((img, i) => (
                                        <button key={img.id} style={styles.thumbBtn(i === activePhoto)} onClick={() => setActivePhoto(i)}>
                                            <img src={img.url} alt="" style={styles.thumbImg} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={styles.sideStack}>
                    <div style={styles.summaryCard}>
                        <div>
                            <div style={sectionLabel}>Vue administrateur</div>
                            <h1 style={styles.h1}>
                                {project.title ? <span data-i18n-user-content="true">{project.title}</span> : <>Projet #{project.id}</>}
                            </h1>

                            <div style={styles.subMeta}>
                                {project.category ? <span style={styles.subMetaChip} data-i18n-user-content="true"><Tag size={12} /> {project.category}</span> : null}
                                <span style={styles.subMetaChip}><Calendar size={12} /> Mis a jour le {new Date(project.updatedAt).toLocaleDateString("fr-FR")}</span>
                            </div>

                            <div style={styles.metricsGrid}>
                                <div>
                                    <div style={styles.metricLabel}>Objets</div>
                                    <div style={styles.metricValueBig}>{project.itemCount ?? items.length}</div>
                                </div>
                                <div>
                                    <div style={styles.metricLabel}>Images</div>
                                    <div style={styles.metricValue}>{sortedImages.length}</div>
                                </div>
                                <div>
                                    <div style={styles.metricLabel}>Score upcycling</div>
                                    <div style={styles.metricValue}>{project.upcyclingScore ? Number(project.upcyclingScore).toFixed(1) : "N/A"}</div>
                                </div>
                                <div>
                                    <div style={styles.metricLabel}>Reference</div>
                                    <div style={styles.metricValue}>#{String(project.id).padStart(4, "0")}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style={{ ...sectionLabel, marginBottom: "0.6rem" }}>Moderation</div>

                            <textarea
                                style={styles.noteTextarea}
                                placeholder="Note de moderation (optionnel)"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />

                            <div style={styles.actionsWrap}>
                                {modStatus === "pending" ? (
                                    <>
                                        <button className="action-button action-button-primary" style={actionBtn("primary")} disabled={saving} onClick={openApproveConfirm}>
                                            <CheckCircle2 size={16} /> Valider le projet
                                        </button>
                                        <button className="action-button action-button-danger" style={actionBtn("danger")} disabled={saving} onClick={openRejectConfirm}>
                                            <XCircle size={16} /> Refuser le projet
                                        </button>
                                    </>
                                ) : modStatus === "approved" ? (
                                    <button className="action-button action-button-danger" style={actionBtn("danger")} disabled={saving} onClick={openRejectConfirm}>
                                        <XCircle size={16} /> Refuser le projet
                                    </button>
                                ) : (
                                    <button className="action-button action-button-primary" style={actionBtn("primary")} disabled={saving} onClick={openApproveConfirm}>
                                        <CheckCircle2 size={16} /> Valider le projet
                                    </button>
                                )}
                                <button className="action-button action-button-neutral" style={actionBtn("neutral")} onClick={() => router.push("/projets/moderation")}>
                                    Retour a la moderation
                                </button>
                                {canDeleteProject ? (
                                    <button className="action-button action-button-danger" style={actionBtn("danger")} disabled={saving} onClick={removeProject}>
                                        <Trash2 size={16} /> Supprimer le projet
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div style={styles.authorCard}>
                        <div style={sectionLabel}>Professionnel</div>
                        <div style={styles.authorRow}>
                            <div style={styles.authorAvatar}><User2 size={18} /></div>
                            <div>
                                <div style={{ fontSize: "0.94rem", fontWeight: "700", color: "var(--text-main)" }}>{proDisplayName}</div>
                                <div style={styles.inlineInfo} data-i18n-user-content="true">{companyName}</div>
                            </div>
                        </div>
                        <div style={styles.inlineInfo}>Score UC total: {totalUCLabel}</div>
                        <div style={styles.inlineInfo}>{totalProjectsSinceSignup} projet(s) depuis le {joinedAtLabel}</div>
                    </div>
                </div>
            </div>

            <div className="content-grid" style={{ ...styles.contentGrid, marginTop: "1.35rem" }}>
                <div style={styles.contentCard}>
                    <div style={sectionLabel}>Description</div>
                    {project.description ? (
                        <p style={styles.description} data-i18n-user-content="true">{project.description}</p>
                    ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>Aucune description.</p>
                    )}

                    <div style={{ ...sectionLabel, marginTop: "1.2rem" }}>
                        <ListChecks size={13} style={{ verticalAlign: "text-bottom", marginRight: "0.35rem" }} />
                        Étapes de réalisation
                    </div>
                    {normalizedSteps.length ? (
                        <div style={styles.stepsWrap}>
                            {normalizedSteps.map((step, idx) => (
                                <div key={`step-${idx}`} style={styles.stepRow}>
                                    <div style={styles.stepBadge}>{idx + 1}</div>
                                    <div>
                                        <p style={styles.stepText} data-i18n-user-content="true">{step.text}</p>
                                        {step.imageUrl ? (
                                            <img src={step.imageUrl} alt={`Étape ${idx + 1}`} style={styles.stepImage} />
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>Aucune étape renseignée.</p>
                    )}
                </div>

                <div style={styles.contentCard}>
                    <div style={sectionLabel}>Objets upcycles ({items.length})</div>
                    {items.length ? items.map((item) => (
                        <div key={item.id} style={styles.itemRow}>
                            {item.itemImage ? (
                                <img src={item.itemImage} alt="" style={styles.itemImg} />
                            ) : (
                                <div style={styles.itemImgFallback}><Box size={18} color="#5a9e8f" /></div>
                            )}
                            <div>
                                <p style={styles.itemTitle}>
                                    {item.itemTitle ? <span data-i18n-user-content="true">{item.itemTitle}</span> : <>Objet #{item.itemId}</>}
                                </p>
                                <p style={styles.itemMeta}>
                                    {item.material || (Number.isFinite(Number(item.weightGrams)) && Number(item.weightGrams) > 0) ? (
                                        <>
                                            {item.material ? <span data-i18n-user-content="true">{item.material}</span> : null}
                                            {item.material && Number.isFinite(Number(item.weightGrams)) && Number(item.weightGrams) > 0 ? " · " : ""}
                                            {Number.isFinite(Number(item.weightGrams)) && Number(item.weightGrams) > 0 ? `${Number(item.weightGrams).toFixed(0)} g` : null}
                                        </>
                                    ) : "Aucune info materiau"}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>Aucun objet associe.</p>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .action-button {
                    background: var(--btn-bg);
                    color: var(--btn-color);
                    border: var(--btn-border);
                }

                .action-button:hover {
                    background: var(--btn-hover-bg);
                    border: var(--btn-hover-border);
                    transform: translateY(-1px);
                }

                @media (max-width: 1080px) {
                    .hero-grid {
                        grid-template-columns: 1fr !important;
                    }
                }

                @media (max-width: 920px) {
                    .content-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>

            {confirmAction ? (
                <div style={styles.modalBackdrop} onClick={() => !saving && setConfirmAction("")}>
                    <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>
                            {confirmAction === "approved" ? "Confirmer la validation" : "Confirmer le refus"}
                        </h3>
                        <p style={styles.modalText}>
                            {confirmAction === "approved"
                                ? "Le projet sera valide et publie. Voulez-vous continuer ?"
                                : "Le projet sera marque comme refuse. Un motif est obligatoire."}
                        </p>

                        {confirmAction === "rejected" ? (
                            <>
                                <textarea
                                    style={styles.modalNote}
                                    value={rejectReason}
                                    onChange={(e) => {
                                        setRejectReason(e.target.value);
                                        if (rejectError) setRejectError("");
                                    }}
                                    placeholder="Motif de refus (obligatoire)"
                                />
                                {rejectError ? <div style={styles.modalError}>{rejectError}</div> : null}
                            </>
                        ) : null}

                        <div style={styles.modalActions}>
                            <button className="action-button action-button-neutral" style={actionBtn("neutral")} onClick={() => setConfirmAction("")} disabled={saving}>
                                Annuler
                            </button>
                            <button
                                className={confirmAction === "approved" ? "action-button action-button-primary" : "action-button action-button-danger"}
                                style={actionBtn(confirmAction === "approved" ? "primary" : "danger")}
                                onClick={submitConfirm}
                                disabled={saving}
                            >
                                {confirmAction === "approved" ? "Confirmer la validation" : "Confirmer le refus"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function ProjectModerationDetailPage() {
    return (
        <Suspense fallback={<div style={{ padding: "3rem", color: "var(--text-muted)" }}>Chargement...</div>}>
            <ProjectModerationDetailContent />
        </Suspense>
    );
}
