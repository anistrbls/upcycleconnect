"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { formatTargetAudienceLabel } from "../../../lib/formatters";
import { pillInputStyle } from "../../../lib/styles";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";

const FALLBACK_GRADIENT = "linear-gradient(135deg, #2E7D6E 0%, #1a4d44 100%)";

const pillSelectStyle = {
    ...pillInputStyle,
    appearance: "none",
    paddingRight: "2.25rem",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%232b4548' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.85rem center",
    backgroundSize: "14px",
    cursor: "pointer",
};

const tagStyle = {
    padding: "3px 10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    fontSize: "0.73rem",
    color: "rgba(255,255,255,0.85)",
    fontWeight: 500,
    border: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
};

const pricePillStyle = {
    padding: "5px 14px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.15)",
    color: "white",
    fontSize: "0.88rem",
    fontWeight: 700,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.25)",
    whiteSpace: "nowrap",
    flexShrink: 0,
};

function formatPrice(item) {
    const price = Number(item?.price || 0);
    if (price <= 0) return "Gratuit";
    return `${price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function getBookingMode(item) {
    return item?.bookingMode || item?.type || (item?.isBookable ? "booking" : "request");
}

function CatalogueServiceCard({ item, index, onSelect }) {
    const bookingMode = getBookingMode(item);
    const hasImage = Boolean(item.imageUrl);

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={() => onSelect(item)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(item);
                }
            }}
            style={{
                position: "relative",
                borderRadius: "28px",
                overflow: "hidden",
                height: "380px",
                background: hasImage ? "#111" : undefined,
                backgroundImage: hasImage ? undefined : FALLBACK_GRADIENT,
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                cursor: "pointer",
                animation: "cardAppear 0.45s ease-out both",
                animationDelay: `${(index ?? 0) * 0.06}s`,
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
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            aria-hidden
                        />
                    ) : (
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { e.target.style.display = "none"; }}
                        />
                    )}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backdropFilter: "blur(18px)",
                            WebkitBackdropFilter: "blur(18px)",
                            maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)",
                            WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)",
                            pointerEvents: "none",
                        }}
                    />
                </>
            ) : null}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.6) 38%, rgba(5,10,5,0.1) 62%, transparent 78%)",
                    pointerEvents: "none",
                }}
            />

            <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 2 }}>
                <div
                    style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: "rgba(255,255,255,0.15)",
                        color: "white",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.25)",
                        letterSpacing: "0.04em",
                    }}
                >
                    {bookingMode === "booking" ? "Réservation" : "Demande"}
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    zIndex: 2,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3, flex: 1 }}>
                        {item.name}
                    </h3>
                    <div style={pricePillStyle}>{formatPrice(item)}</div>
                </div>
                <p
                    style={{
                        fontSize: "0.82rem",
                        color: "rgba(255,255,255,0.85)",
                        margin: 0,
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {item.shortDescription || item.description || "Découvrez cette prestation sur UpcycleConnect."}
                </p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={tagStyle}>{item.categoryName || "Sans catégorie"}</span>
                    {item.durationMinutes > 0 ? <span style={tagStyle}>{item.durationMinutes} min</span> : null}
                    <span style={tagStyle}>{formatTargetAudienceLabel(item.targetAudience)}</span>
                </div>
                <button
                    type="button"
                    onClick={() => onSelect(item)}
                    style={{
                        marginTop: "0.15rem",
                        padding: "9px 14px",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.25)",
                        background: "rgba(255,255,255,0.12)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        color: "white",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        width: "100%",
                    }}
                >
                    Voir le détail
                </button>
            </div>
        </article>
    );
}

export default function CatalogueView({ services, loading, errorMessage, onReload, readOnly = false }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const categories = useMemo(
        () => Array.from(new Set(services.map((s) => s.categoryName).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")),
        [services],
    );

    const visibleServices = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return services.filter((s) => {
            const matchesSearch = !q
                || s.name.toLowerCase().includes(q)
                || (s.shortDescription || "").toLowerCase().includes(q)
                || (s.description || "").toLowerCase().includes(q);
            const matchesCategory = categoryFilter === "all" || s.categoryName === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [services, searchQuery, categoryFilter]);

    const hasActiveFilters = searchQuery.trim() !== "" || categoryFilter !== "all";

    const openDetail = (item) => {
        router.push(`/prestations/catalogue/${item.id}`);
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Prestations</span>
                    <h1>Catalogue de prestations</h1>
                    <p style={{ margin: "0.4rem 0 0", color: "var(--text-muted)", fontSize: "1.05rem" }}>
                        {readOnly
                            ? "Consultez les prestations proposées (lecture seule)."
                            : "Parcourez les prestations proposées et réservez en quelques clics."}
                    </p>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="search"
                        placeholder="Rechercher une prestation…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: "1 1 200px", minWidth: 0, ...pillInputStyle }}
                    />
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={pillSelectStyle}
                        aria-label="Filtrer par catégorie"
                    >
                        <option value="all">Toutes les catégories</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <button className="action-btn" type="button" onClick={onReload}>
                        Actualiser
                    </button>
                </div>
                {errorMessage ? (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem", marginBottom: 0 }}>{errorMessage}</p>
                ) : null}
            </div>

            {!loading && visibleServices.length > 0 ? (
                <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.86rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <Filter size={15} aria-hidden />
                    {visibleServices.length} prestation{visibleServices.length > 1 ? "s" : ""}
                    {hasActiveFilters ? " correspondant à votre recherche" : ` disponible${visibleServices.length > 1 ? "s" : ""}`}
                </p>
            ) : null}

            {loading ? (
                <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            style={{
                                borderRadius: "28px",
                                height: "380px",
                                background: "var(--surface-hover)",
                                animation: `skeletonPulse 1.4s ease-in-out ${i * 0.1}s infinite`,
                            }}
                        />
                    ))}
                </div>
            ) : null}

            {!loading && visibleServices.length === 0 ? (
                <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                        {hasActiveFilters
                            ? "Aucune prestation ne correspond à votre recherche."
                            : "Aucune prestation disponible pour le moment."}
                    </p>
                </div>
            ) : null}

            {!loading && visibleServices.length > 0 ? (
                <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                    {visibleServices.map((item, index) => (
                        <CatalogueServiceCard
                            key={item.id}
                            item={item}
                            index={index}
                            onSelect={openDetail}
                        />
                    ))}
                </div>
            ) : null}

            <style jsx global>{`
                @keyframes cardAppear {
                    from { opacity: 0; transform: translateY(20px); }
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
