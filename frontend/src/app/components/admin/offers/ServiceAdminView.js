"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateFR, formatTargetAudienceLabel } from "../../../lib/formatters";
import { pillInputStyle } from "../../../lib/styles";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";
import { useAdminFeedback } from "../useAdminFeedback";

const STATUS_LABELS = { actif: "Actif", inactif: "Inactif", brouillon: "Brouillon" };
const STATUS_BADGE = {
    actif: { bg: "rgba(50,200,100,0.15)", color: "#E5FFBC", border: "rgba(50,200,100,0.3)" },
    inactif: { bg: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", border: "rgba(255,255,255,0.22)" },
    brouillon: { bg: "rgba(245,158,11,0.18)", color: "#FCD34D", border: "rgba(245,158,11,0.35)" },
};
const FALLBACK_GRADIENT = "linear-gradient(135deg, #2E7D6E 0%, #1a4d44 100%)";

const tagStyle = {
    padding: "4px 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.9)",
    fontWeight: 500,
    border: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
};

const actionIconStyle = {
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
};

const IconPencil = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
    </svg>
);

function ServiceCard({ item, index, onEdit, onDelete, onDuplicate, onToggleStatus, onOpen }) {
    const statusKey = item.status || "brouillon";
    const sBadge = STATUS_BADGE[statusKey] || STATUS_BADGE.brouillon;
    const hasImage = Boolean(item.imageUrl);
    const bookingMode = item.bookingMode || item.type || (item.isBookable ? "booking" : "inquiry");
    const linkedBookings = Number(item.linkedBookings || 0);
    const canDelete = linkedBookings === 0;

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={() => onOpen(item)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(item);
                }
            }}
            style={{
                position: "relative",
                borderRadius: "28px",
                overflow: "hidden",
                height: "400px",
                background: hasImage ? "#111" : undefined,
                backgroundImage: hasImage ? undefined : FALLBACK_GRADIENT,
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                animation: "cardAppear 0.45s ease-out both",
                animationDelay: `${(index ?? 0) * 0.06}s`,
                cursor: "pointer",
            }}
        >
            {hasImage ? (
                <>
                    {previewLooksLikeVideo(item.imageUrl) ? (
                        <video
                            src={item.imageUrl}
                            muted
                            playsInline
                            preload="metadata"
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                            aria-label={item.name}
                        />
                    ) : (
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                            onError={(e) => { e.target.style.display = "none"; }}
                        />
                    )}
                </>
            ) : null}
            <GradientOverlay hasImage={hasImage} />

            <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 2 }}>
                <div
                    style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: sBadge.bg,
                        color: sBadge.color,
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        border: `1px solid ${sBadge.border}`,
                        letterSpacing: "0.04em",
                        textTransform: "capitalize",
                    }}
                >
                    {STATUS_LABELS[statusKey] || statusKey}
                </div>
            </div>

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem", zIndex: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3, flex: 1 }}>{item.name}</h3>
                    <div style={{ padding: "5px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.88rem", fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {Number(item.price || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </div>
                </div>
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {item.shortDescription || item.description || "—"}
                </p>
                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
                    Créé le {formatDateFR(item.createdAt)}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={tagStyle}>{item.categoryName || "Sans catégorie"}</span>
                    {item.durationMinutes > 0 ? <span style={tagStyle}>{item.durationMinutes} min</span> : null}
                    <span style={tagStyle}>{formatTargetAudienceLabel(item.targetAudience)}</span>
                    <span style={tagStyle}>{bookingMode === "booking" ? "Réservation" : "Demande"}</span>
                    {linkedBookings > 0 ? (
                        <span style={tagStyle}>{linkedBookings} réservation{linkedBookings > 1 ? "s" : ""}</span>
                    ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(item); }} title="Modifier" style={actionIconStyle}>
                        <IconPencil />
                    </button>
                    {onDuplicate ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDuplicate(item); }}
                            title="Dupliquer"
                            style={actionIconStyle}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        </button>
                    ) : null}
                    {canDelete ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                            title="Supprimer"
                            style={{
                                ...actionIconStyle,
                                border: "1px solid rgba(220,60,60,0.35)",
                                background: "rgba(220,60,60,0.15)",
                                color: "#ff8080",
                            }}
                        >
                            <IconTrash />
                        </button>
                    ) : (
                        <span
                            title="Des réservations sont liées — désactivez la prestation plutôt que de la supprimer"
                            style={{
                                fontSize: "0.7rem",
                                color: "rgba(255,255,255,0.75)",
                                padding: "0.35rem 0.5rem",
                                maxWidth: "140px",
                                lineHeight: 1.3,
                            }}
                        >
                            Suppression impossible
                        </span>
                    )}
                    {onToggleStatus && item.status !== "actif" ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(item.id, "actif"); }}
                            style={{
                                flex: 1,
                                minWidth: "100px",
                                padding: "0.72rem 0.75rem",
                                borderRadius: "999px",
                                border: "1px solid rgba(255,255,255,0.3)",
                                background: "rgba(229,255,188,0.2)",
                                color: "#E5FFBC",
                                fontFamily: "inherit",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                            }}
                        >
                            Activer
                        </button>
                    ) : null}
                    {onToggleStatus && item.status === "actif" ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(item.id, "inactif"); }}
                            style={{
                                flex: 1,
                                minWidth: "100px",
                                padding: "0.72rem 0.75rem",
                                borderRadius: "999px",
                                border: "1px solid rgba(255,255,255,0.3)",
                                background: "rgba(255,255,255,0.12)",
                                color: "white",
                                fontFamily: "inherit",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                            }}
                        >
                            Désactiver
                        </button>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function GradientOverlay({ hasImage }) {
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                background: hasImage
                    ? "linear-gradient(to top, rgba(5,10,5,0.95) 0%, rgba(5,10,5,0.6) 40%, transparent 100%)"
                    : "linear-gradient(to top, rgba(5,10,5,0.75) 0%, rgba(5,10,5,0.25) 50%, transparent 100%)",
                pointerEvents: "none",
            }}
        />
    );
}

export default function ServiceAdminView({ services, categories, loading, errorMessage, onReload, onDelete, onToggleStatus, onDuplicate }) {
    const router = useRouter();
    const { showToast, askConfirm, FeedbackUI } = useAdminFeedback();
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const hasCategories = categories.length > 0;

    const visibleServices = services.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryMatch = !normalizedQuery
            || item.name.toLowerCase().includes(normalizedQuery)
            || (item.description || "").toLowerCase().includes(normalizedQuery)
            || (item.shortDescription || "").toLowerCase().includes(normalizedQuery);
        const statusMatch = statusFilter === "all" || item.status === statusFilter;
        const categoryMatch = categoryFilter === "all" || String(item.categoryId) === categoryFilter;
        return queryMatch && statusMatch && categoryMatch;
    });

    const handleNew = () => {
        if (!hasCategories) {
            window.alert("Aucune catégorie disponible. Créez une catégorie avant d'ajouter une prestation.");
            return;
        }
        router.push("/offres-prestations/ajouter");
    };

    const handleEdit = (item) => {
        router.push(`/offres-prestations/prestations/${item.id}/modifier`);
    };

    const handleOpen = (item) => {
        router.push(`/offres-prestations/prestations/${item.id}`);
    };

    const handleDelete = (item) => {
        const linked = Number(item.linkedBookings || 0);
        if (linked > 0) {
            showToast(
                "Impossible de supprimer : des réservations sont liées à cette prestation. Désactivez-la à la place.",
                "error",
            );
            return;
        }
        askConfirm({
            title: "Supprimer la prestation",
            message: `Êtes-vous sûr de vouloir supprimer « ${item.name} » ? Cette action est irréversible.`,
            confirmLabel: "Supprimer",
            tone: "danger",
            onConfirm: async () => {
                try {
                    await onDelete(item.id);
                    showToast("Prestation supprimée.", "success");
                } catch (err) {
                    showToast(String(err?.message || "Impossible de supprimer la prestation."), "error");
                    throw err;
                }
            },
        });
    };

    const handleDuplicate = async (item) => {
        if (!onDuplicate) return;
        if (!window.confirm(`Dupliquer la prestation « ${item.name} » en brouillon ?`)) return;
        try {
            const created = await onDuplicate(item.id);
            if (created?.id) {
                router.push(`/offres-prestations/prestations/${created.id}/modifier`);
            }
        } catch (err) {
            window.alert(String(err?.message || "Impossible de dupliquer la prestation."));
        }
    };

    return (
        <>
            {FeedbackUI}
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Offres & prestations</span>
                    <h1>Prestations</h1>
                </div>
            </div>

            {!hasCategories ? (
                <div className="panel" style={{ marginBottom: "1rem" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Aucune catégorie n'existe encore. Créez d'abord une catégorie de prestations pour pouvoir ajouter une prestation.
                    </p>
                </div>
            ) : null}

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher une prestation"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        style={{ flex: "1 1 220px", minWidth: 0, ...pillInputStyle }}
                    />
                    <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Toutes les catégories</option>
                        {categories.map((item) => (
                            <option key={item.id} value={String(item.id)}>{item.name}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="actif">actif</option>
                        <option value="inactif">inactif</option>
                        <option value="brouillon">brouillon</option>
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                    <button className="action-cta task-action-btn" type="button" onClick={handleNew}>Ajouter une prestation</button>
                </div>
                {errorMessage && (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>
                )}
            </div>

            <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                {loading
                    ? [...Array(6)].map((_, i) => (
                        <div key={i} style={{ borderRadius: "28px", height: "400px", background: "var(--surface-hover)", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
                    ))
                    : null}
                {!loading && visibleServices.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucune prestation trouvée.</p>
                ) : null}
                {!loading && visibleServices.map((item, index) => (
                    <ServiceCard
                        key={item.id}
                        item={item}
                        index={index}
                        onOpen={handleOpen}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onDuplicate={onDuplicate ? handleDuplicate : null}
                        onToggleStatus={onToggleStatus}
                    />
                ))}
            </div>

            <style jsx global>{`
                @keyframes cardAppear {
                    from { opacity: 0; transform: translateY(18px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes skeletonPulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                }
            `}</style>
        </>
    );
}
