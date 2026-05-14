"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Package, FileText, CalendarDays } from "lucide-react";
import AdminModal from "./AdminModal";
import { fieldStyle, labelStyle, pillInputStyle } from "../../lib/styles";
import { formatBuyerCardPrice } from "../../lib/salePrice";

const TABS = [
    { key: "conseils", label: "Conseils" },
    { key: "evenements", label: "Événements" },
    { key: "annonces", label: "Annonces" },
    { key: "projets", label: "Projets" },
    { key: "remboursements", label: "Remboursements" },
];

/** Carte ligne partagée (validation opérations) : vignette, texte, actions ; clic = ouvrir le détail. */
function ValidationRowCard({
    thumbSrc,
    thumbAlt,
    emptyIcon,
    title,
    badges,
    line1,
    line2,
    footerLeft,
    detailHint = "Ouvrir la fiche →",
    onOpenDetail,
    childrenActions,
}) {
    const thumb = String(thumbSrc || "").trim();
    const open = () => {
        if (typeof onOpenDetail === "function") onOpenDetail();
    };
    return (
        <div
            role="button"
            tabIndex={0}
            className="validation-row-card"
            onClick={open}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            }}
            style={{
                display: "grid",
                gridTemplateColumns: "104px 1fr auto",
                gap: "1rem",
                alignItems: "stretch",
                padding: "1rem",
                borderRadius: "16px",
                border: "1px solid #E4ECEE",
                background: "#FDFEFE",
                marginBottom: "0.75rem",
                cursor: onOpenDetail ? "pointer" : "default",
                textAlign: "left",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                boxShadow: "0 1px 3px rgba(35, 59, 61, 0.06)",
            }}
        >
            <div
                style={{
                    width: "104px",
                    height: "104px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#EAF0F1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(35,59,61,0.08)",
                }}
            >
                {thumb ? (
                    <img
                        src={thumb}
                        alt={thumbAlt || ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                    />
                ) : (
                    emptyIcon || <Package size={32} color="var(--text-muted)" strokeWidth={1.25} aria-hidden />
                )}
            </div>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "0.45rem", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-main)", lineHeight: 1.35 }}>{title}</span>
                    {badges}
                </div>
                {line1 ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.45 }}>{line1}</div>
                ) : null}
                {line2 ? (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", opacity: 0.92, lineHeight: 1.45 }}>{line2}</div>
                ) : null}
                {(footerLeft || (onOpenDetail && detailHint)) && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
                        {footerLeft}
                        {onOpenDetail && detailHint ? (
                            <span style={{ fontSize: "0.76rem", color: "var(--forest-deep, #3e686c)", fontWeight: 600 }}>{detailHint}</span>
                        ) : null}
                    </div>
                )}
            </div>
            <div
                style={{ display: "flex", flexDirection: "column", gap: "0.45rem", flexShrink: 0, justifyContent: "center" }}
                onClick={(e) => e.stopPropagation()}
            >
                {childrenActions}
            </div>
        </div>
    );
}

// ─── Onglet Conseils ──────────────────────────────────────────────────────────

function ConseilsValidation({ contents, loading, errorMessage, onReload, onValidate, onReject }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = contents.filter((c) => {
        const q = query.trim().toLowerCase();
        return (
            c.status === "en_attente" &&
            (!q || c.title.toLowerCase().includes(q) || (c.authorName || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (item) => {
        if (!window.confirm(`Publier "${item.title}" ?`)) return;
        try { await onValidate(item.id); } catch (err) { window.alert(String(err?.message || "Impossible de valider.")); }
    };

    const openReject = (item) => { setRejectTarget(item); setRejectComment(""); setLocalError(""); };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        setIsSubmitting(true);
        try {
            await onReject(rejectTarget.id, rejectComment.trim());
            setRejectTarget(null);
        } catch (err) {
            setLocalError(String(err?.message || "Impossible de refuser."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Rechercher un conseil ou un auteur…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Conseils en attente</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun conseil en attente de validation.</p>
                )}
                {!loading && pending.map((item) => {
                    const body = String(item.body || "").replace(/\s+/g, " ").trim();
                    const excerpt = body.length > 200 ? `${body.slice(0, 200)}…` : body;
                    const typeLabel = item.type === "actualite" ? "Actualité" : "Conseil";
                    const line2 = [item.authorName ? `par ${item.authorName}` : null, item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : null].filter(Boolean).join(" · ");
                    return (
                        <ValidationRowCard
                            key={item.id}
                            thumbSrc={item.imageUrl}
                            thumbAlt={item.title}
                            emptyIcon={<FileText size={32} color="var(--text-muted)" strokeWidth={1.25} aria-hidden />}
                            title={item.title}
                            badges={
                                <span className="db-badge" style={{ background: "#F0F4FF", color: "#4338ca" }}>
                                    {typeLabel}
                                </span>
                            }
                            line1={excerpt || "—"}
                            line2={line2 || undefined}
                            onOpenDetail={() => router.push(`/conseils/tous-conseils#content-${item.id}`)}
                            childrenActions={
                                <>
                                    <button
                                        className="action-cta task-action-btn"
                                        style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", whiteSpace: "nowrap" }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleValidate(item);
                                        }}
                                    >
                                        Publier
                                    </button>
                                    <button
                                        className="action-cta"
                                        style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", background: "#FDE8E8", color: "#a23b3b", whiteSpace: "nowrap" }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openReject(item);
                                        }}
                                    >
                                        Refuser
                                    </button>
                                </>
                            }
                        />
                    );
                })}
            </div>

            <AdminModal open={!!rejectTarget} title={`Refuser : ${rejectTarget?.title || ""}`} onClose={() => setRejectTarget(null)}>
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Précisez la raison pour informer le salarié…" style={{ ...fieldStyle, resize: "vertical" }} />
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="action-cta" style={{ background: "#FDE8E8", color: "#a23b3b" }} type="submit" disabled={isSubmitting}>{isSubmitting ? "Refus…" : "Confirmer le refus"}</button>
                        <button className="action-cta" type="button" onClick={() => setRejectTarget(null)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}

// ─── Onglet Événements ────────────────────────────────────────────────────────

function EvenementsValidation({ events, loading, errorMessage, onReload, onValidate, onReject }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = events.filter((e) => {
        const q = query.trim().toLowerCase();
        return (
            e.validationStatus === "pending" &&
            (!q || e.name.toLowerCase().includes(q) || (e.intervenant || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (event) => {
        if (!window.confirm(`Valider l'événement "${event.name}" ?`)) return;
        try { await onValidate(event.id); } catch (err) { window.alert(String(err?.message || "Impossible de valider.")); }
    };

    const openReject = (event) => { setRejectTarget(event); setRejectComment(""); setLocalError(""); };

    const goToEventDetails = (eventId) => {
        router.push(`/evenements/tous-evenements?id=${eventId}`);
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        setIsSubmitting(true);
        try {
            await onReject(rejectTarget.id, rejectComment.trim());
            setRejectTarget(null);
        } catch (err) {
            setLocalError(String(err?.message || "Impossible de refuser."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Rechercher un événement…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Événements en attente</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun événement en attente de validation.</p>
                )}
                {!loading &&
                    pending.map((event) => {
                        const dateStr = event.dateDebut
                            ? new Date(event.dateDebut).toLocaleString("fr-FR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                              })
                            : "Date non renseignée";
                        const line1 = [dateStr, event.lieu].filter(Boolean).join(" · ");
                        const line2Parts = [event.type, event.intervenant].filter(Boolean);
                        const line2 = line2Parts.length ? line2Parts.join(" · ") : undefined;
                        const pricePill = (
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "0.28rem 0.75rem",
                                    borderRadius: "999px",
                                    fontWeight: 700,
                                    fontSize: "0.88rem",
                                    background: event.pricingType === "payant" && Number(event.price) > 0 ? "#fff" : "#E5FFBC",
                                    border: "1px solid #dce8ea",
                                    color: "var(--text-main)",
                                }}
                            >
                                {event.pricingType === "payant" && Number(event.price) > 0
                                    ? `${Number(event.price).toLocaleString("fr-FR")} €`
                                    : "Gratuit"}
                            </span>
                        );
                        return (
                            <ValidationRowCard
                                key={event.id}
                                thumbSrc={event.imageUrl}
                                thumbAlt={event.name}
                                emptyIcon={<CalendarDays size={32} color="var(--text-muted)" strokeWidth={1.25} aria-hidden />}
                                title={event.name}
                                badges={
                                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>
                                        En attente
                                    </span>
                                }
                                line1={line1}
                                line2={line2}
                                footerLeft={pricePill}
                                onOpenDetail={() => goToEventDetails(event.id)}
                                childrenActions={
                                    <>
                                        <button
                                            className="action-cta task-action-btn"
                                            style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", whiteSpace: "nowrap" }}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleValidate(event);
                                            }}
                                        >
                                            Valider
                                        </button>
                                        <button
                                            className="action-cta"
                                            style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", background: "#FDE8E8", color: "#a23b3b", whiteSpace: "nowrap" }}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openReject(event);
                                            }}
                                        >
                                            Refuser
                                        </button>
                                    </>
                                }
                            />
                        );
                    })}
            </div>

            <AdminModal open={!!rejectTarget} title={`Refuser : ${rejectTarget?.name || ""}`} onClose={() => setRejectTarget(null)}>
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Précisez la raison…" style={{ ...fieldStyle, resize: "vertical" }} />
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="action-cta" style={{ background: "#FDE8E8", color: "#a23b3b" }} type="submit" disabled={isSubmitting}>{isSubmitting ? "Refus…" : "Confirmer le refus"}</button>
                        <button className="action-cta" type="button" onClick={() => setRejectTarget(null)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}

// ─── Onglet Annonces ─────────────────────────────────────────────────────────

function AnnoncesValidation({ items, loading, errorMessage, onReload, onValidate, onReject }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = items.filter((item) => {
        const q = query.trim().toLowerCase();
        const st = String(item.status || "").toLowerCase().replace(/\s+/g, " ").trim();
        const pendingStatus = st === "en attente" || st === "en_attente";
        const label = (item.title || item.name || "").toLowerCase();
        return (
            pendingStatus &&
            (!q || label.includes(q) || (item.category || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (item) => {
        if (!window.confirm(`Valider l'annonce "${item.title || item.name}" ?`)) return;
        try { await onValidate(item.id); } catch (err) { window.alert(String(err?.message || "Impossible de valider.")); }
    };

    const openReject = (item) => { setRejectTarget(item); setRejectComment(""); setLocalError(""); };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        setIsSubmitting(true);
        try {
            await onReject(rejectTarget.id, rejectComment.trim());
            setRejectTarget(null);
        } catch (err) {
            setLocalError(String(err?.message || "Impossible de refuser."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Rechercher une annonce…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Annonces en attente</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucune annonce en attente de validation.</p>
                )}
                {!loading && pending.map((item) => {
                    const thumb = String(item.image || (Array.isArray(item.photos) && item.photos[0]) || "").trim();
                    const typeLabel = item.type === "don" ? "Don" : "Vente";
                    const metaBits = [
                        item.city,
                        typeLabel,
                        item.condition,
                        item.material,
                        item.quantity,
                    ].filter(Boolean);
                    const extra = [item.reference ? `Réf. ${item.reference}` : null, item.date].filter(Boolean);
                    const footerLeft = (
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "0.28rem 0.75rem",
                                borderRadius: "999px",
                                fontWeight: 700,
                                fontSize: "0.88rem",
                                background: item.type === "don" ? "#E5FFBC" : "#fff",
                                border: item.type === "don" ? "1px solid #c8e89e" : "1px solid #dce8ea",
                                color: "var(--text-main)",
                            }}
                        >
                            {formatBuyerCardPrice(item)}
                        </span>
                    );
                    return (
                        <ValidationRowCard
                            key={item.id}
                            thumbSrc={thumb}
                            thumbAlt={item.title || item.name || "Annonce"}
                            emptyIcon={<Package size={32} color="var(--text-muted)" strokeWidth={1.25} aria-hidden />}
                            title={item.title || item.name}
                            badges={
                                item.category ? (
                                    <span className="db-badge" style={{ background: "#EAF4FF", color: "#1e3a5f" }}>
                                        {item.category}
                                    </span>
                                ) : null
                            }
                            line1={metaBits.join(" · ")}
                            line2={extra.length > 0 ? extra.join(" · ") : undefined}
                            footerLeft={footerLeft}
                            onOpenDetail={() => router.push(`/annonces/${item.id}`)}
                            childrenActions={
                                <>
                                    <button
                                        className="action-cta task-action-btn"
                                        style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", whiteSpace: "nowrap" }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleValidate(item);
                                        }}
                                    >
                                        Valider
                                    </button>
                                    <button
                                        className="action-cta"
                                        style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", background: "#FDE8E8", color: "#a23b3b", whiteSpace: "nowrap" }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openReject(item);
                                        }}
                                    >
                                        Refuser
                                    </button>
                                </>
                            }
                        />
                    );
                })}
            </div>

            <AdminModal open={!!rejectTarget} title={`Refuser : ${rejectTarget?.title || rejectTarget?.name || ""}`} onClose={() => setRejectTarget(null)}>
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Précisez la raison…" style={{ ...fieldStyle, resize: "vertical" }} />
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="action-cta" style={{ background: "#FDE8E8", color: "#a23b3b" }} type="submit" disabled={isSubmitting}>{isSubmitting ? "Refus…" : "Confirmer le refus"}</button>
                        <button className="action-cta" type="button" onClick={() => setRejectTarget(null)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}

// ─── Onglet Projets ──────────────────────────────────────────────────────────

function ProjetsValidation({ projects, loading, errorMessage, onReload, onValidate, onReject }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = projects.filter((p) => {
        const q = query.trim().toLowerCase();
        const mod = p.moderationStatus ?? p.moderation_status;
        return (
            mod === "pending" &&
            (!q || p.title.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (project) => {
        if (!window.confirm(`Valider le projet "${project.title}" ?`)) return;
        try { await onValidate(project.id); } catch (err) { window.alert(String(err?.message || "Impossible de valider.")); }
    };

    const openReject = (item) => { setRejectTarget(item); setRejectComment(""); setLocalError(""); };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        setIsSubmitting(true);
        try {
            await onReject(rejectTarget.id, rejectComment.trim());
            setRejectTarget(null);
        } catch (err) {
            setLocalError(String(err?.message || "Impossible de refuser."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Rechercher un projet…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Projets en attente</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun projet en attente de validation.</p>
                )}
                {!loading && pending.map((p) => {
                    const desc = String(p.description || "").replace(/\s+/g, " ").trim();
                    const excerpt = desc.length > 220 ? `${desc.slice(0, 220)}…` : desc;
                    const proName = p.proDisplayName || p.pro_display_name;
                    const bits = [
                        p.category,
                        p.itemCount != null ? `${p.itemCount} objet(s)` : null,
                        p.totalWeightKg != null && Number(p.totalWeightKg) > 0
                            ? `${Math.round(Number(p.totalWeightKg) * 10) / 10} kg`
                            : null,
                        proName ? `Pro : ${proName}` : null,
                    ].filter(Boolean);
                    const line1 = bits.join(" · ");
                    const line2 = excerpt || undefined;
                    const score = Number(p.upcyclingScore) || 0;
                    const footerLeft =
                        score > 0 ? (
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "0.28rem 0.75rem",
                                    borderRadius: "999px",
                                    fontWeight: 700,
                                    fontSize: "0.82rem",
                                    background: "#fff",
                                    border: "1px solid #dce8ea",
                                    color: "var(--text-main)",
                                }}
                            >
                                Score UC {Math.round(score * 10) / 10}
                            </span>
                        ) : null;
                    return (
                        <ValidationRowCard
                            key={p.id}
                            thumbSrc={p.previewImage}
                            thumbAlt={p.title}
                            emptyIcon={<Package size={32} color="var(--text-muted)" strokeWidth={1.25} aria-hidden />}
                            title={p.title}
                            badges={
                                <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>
                                    Modération
                                </span>
                            }
                            line1={line1 || "—"}
                            line2={line2}
                            footerLeft={footerLeft}
                            onOpenDetail={() => router.push(`/projets/moderation/${p.id}`)}
                            childrenActions={
                                <>
                                    <button
                                        className="action-cta task-action-btn"
                                        style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", whiteSpace: "nowrap" }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleValidate(p);
                                        }}
                                    >
                                        Valider
                                    </button>
                                    <button
                                        className="action-cta"
                                        style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", background: "#FDE8E8", color: "#a23b3b", whiteSpace: "nowrap" }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openReject(p);
                                        }}
                                    >
                                        Refuser
                                    </button>
                                </>
                            }
                        />
                    );
                })}
            </div>

            <AdminModal open={!!rejectTarget} title={`Refuser : ${rejectTarget?.title || ""}`} onClose={() => setRejectTarget(null)}>
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Précisez la raison…" style={{ ...fieldStyle, resize: "vertical" }} />
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="action-cta" style={{ background: "#FDE8E8", color: "#a23b3b" }} type="submit" disabled={isSubmitting}>{isSubmitting ? "Refus…" : "Confirmer le refus"}</button>
                        <button className="action-cta" type="button" onClick={() => setRejectTarget(null)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}

// ─── Onglet Remboursements événements ─────────────────────────────────────────

function parseEuroInput(raw) {
    const s = String(raw || "").trim().replace(",", ".");
    if (s === "") return NaN;
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
}

function RemboursementsValidation({ requests, loading, errorMessage, onReload, onEventRefundDecision }) {
    const router = useRouter();
    const [reasonTarget, setReasonTarget] = useState(null);
    const [query, setQuery] = useState("");
    const [refundModal, setRefundModal] = useState(null);
    const [refundMode, setRefundMode] = useState("full");
    const [refundEuroStr, setRefundEuroStr] = useState("");
    const [refundPercentStr, setRefundPercentStr] = useState("");
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
    const [actionError, setActionError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const showToast = (msg, type = "success") => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ msg, type });
        toastTimerRef.current = setTimeout(() => setToast(null), 3800);
    };

    const filtered = (requests || []).filter((req) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
            (req.eventName || "").toLowerCase().includes(q) ||
            (req.userName || "").toLowerCase().includes(q) ||
            (req.userEmail || "").toLowerCase().includes(q) ||
            (req.lieu || "").toLowerCase().includes(q)
        );
    });

    const formatWhen = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const maxTicketEuro = refundModal ? Math.max(0, Number(refundModal.price) || 0) : 0;

    const computedRefundEuro = useMemo(() => {
        if (!refundModal) return 0;
        if (refundMode === "full") return maxTicketEuro;
        if (refundMode === "euro") {
            const v = parseEuroInput(refundEuroStr);
            if (!Number.isFinite(v)) return 0;
            return Math.min(Math.max(0, v), maxTicketEuro);
        }
        const p = Number.parseFloat(String(refundPercentStr || "").trim().replace(",", "."));
        if (!Number.isFinite(p)) return 0;
        const clamped = Math.min(100, Math.max(0, p));
        return Math.round(maxTicketEuro * (clamped / 100) * 100) / 100;
    }, [refundModal, refundMode, refundEuroStr, refundPercentStr, maxTicketEuro]);

    const openRefundModal = (req) => {
        setActionError("");
        setRefundModal(req);
        setRefundMode("full");
        setRefundEuroStr("");
        setRefundPercentStr("");
    };

    const closeRefundModal = () => {
        setRefundModal(null);
        setActionError("");
    };

    const handleRefundSubmit = async (e) => {
        e.preventDefault();
        setActionError("");
        if (!refundModal || !onEventRefundDecision) return;
        const cents = Math.round(computedRefundEuro * 100);
        if (cents < 1) {
            setActionError("Indiquez un montant à rembourser d’au moins 0,01 €.");
            return;
        }
        const maxCents = Math.round(maxTicketEuro * 100);
        if (cents > maxCents) {
            setActionError("Le montant dépasse le prix du billet.");
            return;
        }
        setSubmitting(true);
        try {
            const data = await onEventRefundDecision(refundModal.registrationId, { decision: "approve", amountCents: cents });
            closeRefundModal();
            await onReload();
            const amt = typeof data?.refundAmount === "number" ? data.refundAmount : computedRefundEuro;
            const amtStr = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amt);
            showToast(`Remboursement Stripe effectué : ${amtStr}`, "success");
        } catch (err) {
            setActionError(String(err?.message || "Échec du remboursement."));
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setActionError("");
        if (!rejectModal || !onEventRefundDecision) return;
        setSubmitting(true);
        try {
            await onEventRefundDecision(rejectModal.registrationId, { decision: "reject", note: rejectNote.trim() });
            setRejectModal(null);
            setRejectNote("");
            await onReload();
            showToast("Demande refusée — le participant voit le statut « non remboursable ».", "success");
        } catch (err) {
            setActionError(String(err?.message || "Impossible d’enregistrer le refus."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Rechercher (événement, participant, lieu)…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                />
                <button className="action-cta task-action-btn" type="button" onClick={onReload}>
                    Actualiser
                </button>
            </div>

            {errorMessage && <p style={{ color: "#a23b3b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{errorMessage}</p>}

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Demandes de remboursement (événements passés)</span>
                    <span className="db-badge" style={{ background: "#FEF3C7", color: "#92400E" }}>{requests?.length ?? 0}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && filtered.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        {(requests || []).length === 0
                            ? "Aucune demande de remboursement en attente."
                            : "Aucun résultat pour cette recherche."}
                    </p>
                )}
                {!loading &&
                    filtered.map((req) => {
                        const line1 = `Du ${formatWhen(req.dateDebut)} au ${formatWhen(req.dateFin)}${req.lieu ? ` · ${req.lieu}` : ""}`;
                        const line2 = [
                            `${req.userName} (${req.userEmail}) · ID utilisateur #${req.userId}`,
                            `Inscription #${req.registrationId} · Événement #${req.eventId}`,
                            `Demandé le ${formatWhen(req.cancelledAt || req.registeredAt)}`,
                            req.transactionRef ? `Réf. paiement : ${req.transactionRef}` : null,
                        ]
                            .filter(Boolean)
                            .join(" · ");
                        const pricePill = (
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "0.28rem 0.75rem",
                                    borderRadius: "999px",
                                    fontWeight: 700,
                                    fontSize: "0.88rem",
                                    background: "#FEF3C7",
                                    border: "1px solid #fcd34d",
                                    color: "#92400E",
                                }}
                            >
                                {Number(req.price).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                            </span>
                        );
                        return (
                            <ValidationRowCard
                                key={req.registrationId}
                                emptyIcon={<CalendarDays size={32} color="var(--text-muted)" strokeWidth={1.25} aria-hidden />}
                                title={req.eventName}
                                badges={
                                    <span className="db-badge" style={{ background: "#FEF3C7", color: "#92400E" }}>
                                        Remboursement
                                    </span>
                                }
                                line1={line1}
                                line2={line2}
                                footerLeft={pricePill}
                                detailHint="Ouvrir l'événement →"
                                onOpenDetail={() => router.push(`/evenements/tous-evenements?id=${req.eventId}`)}
                                childrenActions={
                                    <>
                                        <button
                                            type="button"
                                            className="action-cta task-action-btn"
                                            style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", whiteSpace: "nowrap" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setReasonTarget(req);
                                            }}
                                        >
                                            Voir le motif
                                        </button>
                                        <button
                                            type="button"
                                            className="action-cta task-action-btn"
                                            style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", whiteSpace: "nowrap", background: "#166534", color: "#fff" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRefundModal(req);
                                            }}
                                        >
                                            Rembourser
                                        </button>
                                        <button
                                            type="button"
                                            className="action-cta"
                                            style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", background: "#FDE8E8", color: "#a23b3b", whiteSpace: "nowrap" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRejectNote("");
                                                setActionError("");
                                                setRejectModal(req);
                                            }}
                                        >
                                            Refuser
                                        </button>
                                        <button
                                            type="button"
                                            className="action-cta"
                                            style={{ fontSize: "0.8rem", padding: "0.5rem 0.95rem", background: "#E8ECEE", color: "var(--text-main)", whiteSpace: "nowrap" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/evenements/tous-evenements?id=${req.eventId}`);
                                            }}
                                        >
                                            Voir l&apos;événement
                                        </button>
                                    </>
                                }
                            />
                        );
                    })}
            </div>

            <AdminModal open={!!reasonTarget} title="Motif de la demande" onClose={() => setReasonTarget(null)}>
                {reasonTarget && (
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                        <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)" }}>
                            <strong>{reasonTarget.eventName}</strong> — {reasonTarget.userName}
                        </p>
                        <div
                            style={{
                                fontSize: "0.92rem",
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                padding: "1rem",
                                borderRadius: "14px",
                                background: "var(--surface-sunken, #f4f7f7)",
                                border: "1px solid rgba(35,59,61,0.12)",
                                maxHeight: "50vh",
                                overflowY: "auto",
                            }}
                        >
                            {reasonTarget.reason || "—"}
                        </div>
                        <button type="button" className="action-cta" style={{ background: "#e8ecee", color: "var(--text-main)" }} onClick={() => setReasonTarget(null)}>
                            Fermer
                        </button>
                    </div>
                )}
            </AdminModal>

            <AdminModal
                open={!!refundModal}
                title={refundModal ? `Rembourser — ${refundModal.eventName}` : ""}
                onClose={() => !submitting && closeRefundModal()}
            >
                {refundModal && (
                    <form onSubmit={handleRefundSubmit} style={{ display: "grid", gap: "0.85rem" }}>
                        <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)" }}>
                            {refundModal.userName} — billet max.{" "}
                            <strong>{maxTicketEuro.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</strong>
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500 }}>
                                <input type="radio" name="refundMode" checked={refundMode === "full"} onChange={() => setRefundMode("full")} />
                                Totalité du billet
                            </label>
                            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500 }}>
                                <input type="radio" name="refundMode" checked={refundMode === "euro"} onChange={() => setRefundMode("euro")} />
                                Montant en euros
                            </label>
                            {refundMode === "euro" && (
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="ex. 12,50"
                                    value={refundEuroStr}
                                    onChange={(e) => setRefundEuroStr(e.target.value)}
                                    style={fieldStyle}
                                />
                            )}
                            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 500 }}>
                                <input type="radio" name="refundMode" checked={refundMode === "percent"} onChange={() => setRefundMode("percent")} />
                                Pourcentage du billet
                            </label>
                            {refundMode === "percent" && (
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="ex. 50 pour 50 %"
                                    value={refundPercentStr}
                                    onChange={(e) => setRefundPercentStr(e.target.value)}
                                    style={fieldStyle}
                                />
                            )}
                        </div>

                        <div
                            style={{
                                padding: "0.85rem 1rem",
                                borderRadius: "12px",
                                background: "rgba(22, 101, 52, 0.08)",
                                border: "1px solid rgba(22, 101, 52, 0.2)",
                                fontSize: "0.95rem",
                            }}
                        >
                            <strong>Montant à rembourser :</strong>{" "}
                            {computedRefundEuro.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} ({Math.round(computedRefundEuro * 100)} centimes)
                        </div>

                        {actionError && <p style={{ color: "#a23b3b", fontSize: "0.82rem", margin: 0 }}>{actionError}</p>}

                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button className="action-cta task-action-btn" type="submit" disabled={submitting}>
                                {submitting ? "Traitement…" : "Valider le remboursement"}
                            </button>
                            <button className="action-cta" type="button" disabled={submitting} style={{ background: "#e8ecee", color: "var(--text-main)" }} onClick={closeRefundModal}>
                                Annuler
                            </button>
                        </div>
                    </form>
                )}
            </AdminModal>

            <AdminModal
                open={!!rejectModal}
                title={rejectModal ? `Refuser le remboursement — ${rejectModal.eventName}` : ""}
                onClose={() => {
                    if (!submitting) {
                        setRejectModal(null);
                        setRejectNote("");
                        setActionError("");
                    }
                }}
            >
                {rejectModal && (
                    <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                        <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)" }}>
                            Le participant verra le statut « non remboursable ». Vous pouvez préciser un message (stocké avec la demande).
                        </p>
                        <label style={labelStyle}>
                            Message (optionnel)
                            <textarea rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Ex. motif du refus…" style={{ ...fieldStyle, resize: "vertical" }} />
                        </label>
                        {actionError && <p style={{ color: "#a23b3b", fontSize: "0.82rem", margin: 0 }}>{actionError}</p>}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="action-cta" style={{ background: "#FDE8E8", color: "#a23b3b" }} type="submit" disabled={submitting}>
                                {submitting ? "Envoi…" : "Confirmer le refus"}
                            </button>
                            <button className="action-cta" type="button" disabled={submitting} style={{ background: "#e8ecee", color: "var(--text-main)" }} onClick={() => { setRejectModal(null); setRejectNote(""); setActionError(""); }}>
                                Annuler
                            </button>
                        </div>
                    </form>
                )}
            </AdminModal>

            {toast && (
                <div
                    role="status"
                    style={{
                        position: "fixed",
                        bottom: "2rem",
                        right: "2rem",
                        maxWidth: "min(22rem, calc(100vw - 2rem))",
                        background: toast.type === "error" ? "var(--state-critical, #B24A4A)" : "var(--black, #0f172a)",
                        color: "#fff",
                        padding: "0.85rem 1.2rem",
                        borderRadius: "14px",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        zIndex: 10050,
                        boxShadow: "0 10px 32px rgba(0,0,0,0.22)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        lineHeight: 1.35,
                    }}
                >
                    {toast.type !== "error" ? (
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                background: "var(--green-leaf, #86efac)",
                                color: "var(--black, #0f172a)",
                                flexShrink: 0,
                            }}
                        >
                            <Check size={15} strokeWidth={2.5} />
                        </span>
                    ) : null}
                    <span style={{ fontWeight: 500 }}>{toast.msg}</span>
                </div>
            )}
        </>
    );
}

// ─── Vue principale ───────────────────────────────────────────────────────────

export default function OperationsValidationView({
    contents = [],
    events = [],
    items = [],
    projects = [],
    loadingContents,
    loadingEvents,
    loadingItems,
    loadingProjects,
    errorContents,
    errorEvents,
    errorItems,
    errorProjects,
    onReloadContents,
    onReloadEvents,
    onReloadItems,
    onReloadProjects,
    onValidateContent,
    onRejectContent,
    onValidateEvent,
    onRejectEvent,
    onValidateItem,
    onRejectItem,
    onValidateProject,
    onRejectProject,
    eventRefundRequests = [],
    loadingRefundRequests,
    errorRefundRequests,
    onReloadRefundRequests,
    onEventRefundDecision,
    initialTab,
}) {
    const [activeTab, setActiveTab] = useState(() =>
        initialTab && TABS.some((t) => t.key === initialTab) ? initialTab : "conseils"
    );

    useEffect(() => {
        if (initialTab && TABS.some((t) => t.key === initialTab)) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const pendingContentsCount = contents.filter((c) => c.status === "en_attente").length;
    const pendingEventsCount = events.filter((e) => e.validationStatus === "pending").length;
    const pendingItemsCount = items.filter((i) => {
        const st = String(i.status || "").toLowerCase().replace(/\s+/g, " ").trim();
        return st === "en attente" || st === "en_attente";
    }).length;
    const pendingProjectsCount = projects.filter((p) => (p.moderationStatus ?? p.moderation_status) === "pending").length;
    const refundRequestsCount = eventRefundRequests.length;

    const counts = { 
        conseils: pendingContentsCount, 
        evenements: pendingEventsCount,
        annonces: pendingItemsCount,
        projets: pendingProjectsCount,
        remboursements: refundRequestsCount,
    };

    return (
        <>
            <div className="header-section" style={{ marginBottom: "1.5rem" }}>
                <div className="title-area">
                    <span className="activities-label">Opérations</span>
                    <h1>Validation</h1>
                </div>
            </div>

            {/* Onglets */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "2px solid #EAF0F1", paddingBottom: "0" }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: activeTab === tab.key ? 700 : 500,
                            fontSize: "0.9rem",
                            color: activeTab === tab.key ? "var(--text-main)" : "var(--text-muted)",
                            padding: "0.6rem 1rem",
                            borderBottom: activeTab === tab.key ? "2px solid var(--text-main)" : "2px solid transparent",
                            marginBottom: "-2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            transition: "color 0.15s",
                        }}
                    >
                        {tab.label}
                        {counts[tab.key] > 0 && (
                            <span style={{ background: "#F5A623", color: "#fff", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.5rem", minWidth: "18px", textAlign: "center" }}>
                                {counts[tab.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Contenu de l'onglet actif */}
            {activeTab === "conseils" && (
                <ConseilsValidation
                    contents={contents}
                    loading={loadingContents}
                    errorMessage={errorContents}
                    onReload={onReloadContents}
                    onValidate={onValidateContent}
                    onReject={onRejectContent}
                />
            )}
            {activeTab === "evenements" && (
                <EvenementsValidation
                    events={events}
                    loading={loadingEvents}
                    errorMessage={errorEvents}
                    onReload={onReloadEvents}
                    onValidate={onValidateEvent}
                    onReject={onRejectEvent}
                />
            )}
            {activeTab === "annonces" && (
                <AnnoncesValidation
                    items={items}
                    loading={loadingItems}
                    errorMessage={errorItems}
                    onReload={onReloadItems}
                    onValidate={onValidateItem}
                    onReject={onRejectItem}
                />
            )}
            {activeTab === "projets" && (
                <ProjetsValidation
                    projects={projects}
                    loading={loadingProjects}
                    errorMessage={errorProjects}
                    onReload={onReloadProjects}
                    onValidate={onValidateProject}
                    onReject={onRejectProject}
                />
            )}
            {activeTab === "remboursements" && (
                <RemboursementsValidation
                    requests={eventRefundRequests}
                    loading={loadingRefundRequests}
                    errorMessage={errorRefundRequests}
                    onReload={onReloadRefundRequests}
                    onEventRefundDecision={onEventRefundDecision}
                />
            )}
        </>
    );
}
