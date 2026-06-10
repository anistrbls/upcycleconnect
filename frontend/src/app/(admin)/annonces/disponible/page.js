"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { formatBuyerCardPrice } from "../../../lib/salePrice";
import { Filter, Star, Check } from "lucide-react";
import AdminModal from "../../../components/admin/AdminModal";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";

const SELECT_ARROW_BG = "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='292.4' height='292.4'%3E%3Cpath fill='%232b4548' d='M287 69.4a17.6 17.6 0 0 0-13-5.4H18.4c-5 0-9.3 1.8-12.9 5.4A17.6 17.6 0 0 0 0 82.2c0 5 1.8 9.3 5.4 12.9l128 127.9c3.6 3.6 7.8 5.4 12.8 5.4s9.2-1.8 12.8-5.4L287 95c3.5-3.5 5.4-7.8 5.4-12.8 0-5-1.9-9.2-5.5-12.8z'/%3E%3C/svg%3E\")";

/** Valeur du select « matériau » pour le mode recherche hors catalogue affiché. */
const MATERIAL_FILTER_OTHER = "__autre__";

function itemMatchesMaterialLabel(item, materialLabel) {
    const material = String(item?.material || "").toLowerCase().trim();
    const needle = String(materialLabel || "").toLowerCase().trim();
    if (!needle) return false;
    return material === needle || material.includes(needle);
}

const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    header: {
        marginBottom: "2rem",
    },
    title: {
        margin: "0.5rem 0",
        fontSize: "2.5rem",
        fontWeight: 500,
        letterSpacing: "-0.02em",
        color: "var(--text-main)",
    },
    subtitle: {
        margin: "0.4rem 0 0",
        color: "var(--text-muted)",
        fontSize: "1.05rem",
    },
    filtersWrap: {
        marginBottom: "2rem",
        display: "flex",
        gap: "1rem",
        alignItems: "center",
    },
    searchFieldWrap: {
        position: "relative",
        flex: "1 1 0%",
        maxWidth: "300px",
    },
    searchInput: {
        width: "100%",
        border: "none",
        borderRadius: "999px",
        background: "rgb(229, 255, 188)",
        color: "var(--text-main)",
        padding: "0.6rem 1.2rem",
        fontSize: "0.9rem",
        fontFamily: "inherit",
        outline: "none",
    },
    filterField: {
        border: "none",
        borderRadius: "999px",
        padding: "0.6rem 2.4rem 0.6rem 1.2rem",
        background: `${SELECT_ARROW_BG} right 0.9rem center / 0.65rem auto no-repeat rgb(229, 255, 188)`,
        color: "var(--text-main)",
        fontFamily: "inherit",
        fontSize: "0.9rem",
        outline: "none",
        cursor: "pointer",
        appearance: "none",
    },
    toggleBtn: (active) => ({
        border: "1px solid var(--border)",
        borderRadius: "12px",
        background: active ? "#1f3336" : "#fff",
        color: active ? "#fff" : "var(--text-main)",
        padding: "0.62rem 0.8rem",
        fontSize: "0.86rem",
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.42rem",
        whiteSpace: "nowrap",
    }),
    clearBtn: {
        border: "none",
        borderRadius: "12px",
        background: "#e8ecee",
        color: "var(--text-main)",
        padding: "0.62rem 0.8rem",
        fontSize: "0.86rem",
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    materialFilterGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "nowrap",
    },
    materialAlertBtn: {
        border: "none",
        borderRadius: "999px",
        padding: "0.6rem 1rem",
        fontWeight: 700,
        fontSize: "0.85rem",
        cursor: "pointer",
        background: "var(--forest-deep, #2b4548)",
        color: "#fff",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    filterMeta: {
        marginBottom: "1rem",
        color: "var(--text-muted)",
        fontSize: "0.86rem",
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
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
    blurLayer: {
        position: "absolute",
        inset: 0,
        backdropFilter: "blur(18px)",
        maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)",
        pointerEvents: "none",
    },
    gradientLayer: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.55) 35%, rgba(5,10,5,0.08) 60%, transparent 75%)",
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
        background: "rgba(255,255,255,0.18)",
        color: "white",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.22)",
        letterSpacing: "0.04em",
        zIndex: 2,
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
    titlePriceRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: "0.75rem",
    },
    cardTitle: {
        fontSize: "1.2rem",
        fontWeight: "700",
        color: "white",
        margin: 0,
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
        border: "1px solid rgba(255,255,255,0.25)",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    description: {
        fontSize: "0.82rem",
        color: "rgba(255,255,255,0.72)",
        margin: 0,
        lineHeight: "1.5",
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
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
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
        transition: "opacity 0.2s ease",
    },
    reserveBtn: {
        flex: 1,
        padding: "0.72rem 1rem",
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,0.3)",
        background: "rgba(255,255,255,0.12)",
        color: "white",
        backdropFilter: "blur(8px)",
        fontFamily: "inherit",
        fontSize: "0.9rem",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    watchBtn: (active) => ({
        width: "38px",
        height: "38px",
        borderRadius: "999px",
        border: "1px solid rgba(255,255,255,0.34)",
        background: active ? "rgba(250,204,21,0.95)" : "rgba(255,255,255,0.12)",
        color: active ? "#1f2937" : "#fff",
        backdropFilter: "blur(8px)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        flexShrink: 0,
    }),
    emptyState: {
        color: "var(--text-muted)",
        fontSize: "0.95rem",
    },
    error: {
        color: "#b42318",
        fontWeight: 600,
        marginBottom: "1rem",
    },
    toast: {
        position: "fixed",
        bottom: "2.5rem",
        right: "2.5rem",
        padding: "1rem 1.5rem",
        borderRadius: "16px",
        background: "#0f172a",
        color: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "0.88rem",
        fontWeight: "500",
        border: "1px solid rgba(255,255,255,0.1)",
        animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    },
};

function formatPublishDate(item) {
    const raw = item.createdAt || item.created_at || item.publishedAt || item.published_at;
    if (!raw) return "Date non renseignee";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "Date non renseignee";
    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function ProfessionalAvailablePage() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(0);
    const [reserveConfirmItem, setReserveConfirmItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [materialFilter, setMaterialFilter] = useState("");
    const [conditionFilter, setConditionFilter] = useState("");
    const [containerFilter, setContainerFilter] = useState("");
    const [watchlistOnly, setWatchlistOnly] = useState(false);
    const [watchlistIds, setWatchlistIds] = useState([]);
    const [watchBusyId, setWatchBusyId] = useState(0);
    /** Libellés issus de `item_materials` (référentiel complet). */
    const [catalogMaterialLabels, setCatalogMaterialLabels] = useState([]);
    /** Recherche dans le référentiel lorsque le filtre « Autre » est actif. */
    const [otherMaterialSearch, setOtherMaterialSearch] = useState("");

    const normalize = (value) => String(value || "").toLowerCase().trim();

    const fetchWatchlist = async () => {
        const res = await fetch(apiUrl("/pro/watchlist"), {
            headers: buildAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || "Erreur chargement watchlist");
        }
        const ids = Array.isArray(data.item_ids) ? data.item_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];
        setWatchlistIds(ids);
    };

    const fetchItems = async () => {
        setLoading(true);
        setError("");
        try {
            const [itemsRes, watchlistRes] = await Promise.all([
                fetch(apiUrl("/pro/items"), {
                    headers: buildAuthHeaders(),
                }),
                fetch(apiUrl("/pro/watchlist"), {
                    headers: buildAuthHeaders(),
                }),
            ]);

            const itemsData = await itemsRes.json();
            const watchlistData = await watchlistRes.json();

            if (!itemsRes.ok) {
                throw new Error(itemsData.error || "Erreur chargement annonces professionnelles");
            }
            if (!watchlistRes.ok) {
                throw new Error(watchlistData.error || "Erreur chargement watchlist");
            }

            setItems(itemsData.items || []);
            const ids = Array.isArray(watchlistData.item_ids)
                ? watchlistData.item_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
                : [];
            setWatchlistIds(ids);
        } catch (err) {
            setError(err.message || "Erreur inattendue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(apiUrl("/item-materials"));
                const data = await res.json();
                if (!res.ok || cancelled) return;
                const labels = (data.items || [])
                    .map((row) => String(row.label || "").trim())
                    .filter(Boolean);
                const uniq = Array.from(new Set(labels));
                uniq.sort((a, b) => a.localeCompare(b, "fr"));
                if (!cancelled) setCatalogMaterialLabels(uniq);
            } catch {
                if (!cancelled) setCatalogMaterialLabels([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const conditionOptions = useMemo(() => {
        const uniq = Array.from(new Set(items.map((it) => String(it.condition || "").trim()).filter(Boolean)));
        return uniq.sort((a, b) => a.localeCompare(b, "fr"));
    }, [items]);

    const containerOptions = useMemo(() => {
        const uniq = Array.from(new Set(items.map((it) => String(it.containerName || "").trim()).filter(Boolean)));
        return uniq.sort((a, b) => a.localeCompare(b, "fr"));
    }, [items]);

    const catalogMatchesForOtherSearch = useMemo(() => {
        const q = normalize(otherMaterialSearch);
        if (!q) return [];
        return catalogMaterialLabels.filter((label) => {
            const nl = normalize(label);
            return nl.includes(q) || nl === q;
        });
    }, [catalogMaterialLabels, otherMaterialSearch]);

    const filteredItems = useMemo(() => {
        const search = normalize(searchText);
        const watchSet = new Set(watchlistIds);
        return items.filter((item) => {
            const material = normalize(item.material);
            const condition = normalize(item.condition);
            const container = normalize(item.containerName);
            const haystack = [
                item.title,
                item.description,
                item.category,
                item.material,
                item.condition,
                item.containerName,
            ]
                .map(normalize)
                .join(" ");

            if (search && !haystack.includes(search)) return false;

            if (materialFilter === MATERIAL_FILTER_OTHER) {
                const q = normalize(otherMaterialSearch);
                if (q) {
                    const matches = catalogMaterialLabels.filter((label) => {
                        const nl = normalize(label);
                        return nl.includes(q) || nl === q;
                    });
                    if (matches.length > 0) {
                        const ok = matches.some((m) => {
                            const nm = normalize(m);
                            return material === nm || material.includes(nm);
                        });
                        if (!ok) return false;
                    }
                }
            } else if (materialFilter && material !== normalize(materialFilter)) {
                return false;
            }

            if (conditionFilter && condition !== normalize(conditionFilter)) return false;
            if (containerFilter && container !== normalize(containerFilter)) return false;
            if (watchlistOnly && !watchSet.has(item.id)) return false;
            return true;
        });
    }, [
        items,
        searchText,
        materialFilter,
        otherMaterialSearch,
        catalogMaterialLabels,
        conditionFilter,
        containerFilter,
        watchlistOnly,
        watchlistIds,
    ]);

    const materialAlertContext = useMemo(() => {
        const q = otherMaterialSearch.trim();

        if (materialFilter && materialFilter !== MATERIAL_FILTER_OTHER) {
            const hasAnnonces = items.some((it) => itemMatchesMaterialLabel(it, materialFilter));
            if (!hasAnnonces) {
                return {
                    show: true,
                    label: materialFilter,
                    message: `Aucune annonce disponible pour le matériau « ${materialFilter} ».`,
                };
            }
            return { show: false, label: "", message: "" };
        }

        if (materialFilter !== MATERIAL_FILTER_OTHER || normalize(q).length < 2) {
            return { show: false, label: "", message: "" };
        }

        if (catalogMatchesForOtherSearch.length === 0) {
            return {
                show: true,
                label: q,
                message: `Aucun matériau enregistré ne correspond à « ${q} ».`,
            };
        }

        const labelsWithAnnonces = catalogMatchesForOtherSearch.filter((label) =>
            items.some((it) => itemMatchesMaterialLabel(it, label)),
        );
        if (labelsWithAnnonces.length === 0) {
            const labelText =
                catalogMatchesForOtherSearch.length === 1
                    ? catalogMatchesForOtherSearch[0]
                    : q;
            return {
                show: true,
                label: labelText,
                message:
                    catalogMatchesForOtherSearch.length === 1
                        ? `Aucune annonce disponible pour le matériau « ${catalogMatchesForOtherSearch[0]} ».`
                        : `Aucune annonce disponible pour les matériaux correspondant à « ${q} ».`,
            };
        }

        return { show: false, label: "", message: "" };
    }, [items, materialFilter, otherMaterialSearch, catalogMatchesForOtherSearch]);

    const hasActiveFilters = Boolean(
        searchText ||
            materialFilter ||
            (materialFilter === MATERIAL_FILTER_OTHER && otherMaterialSearch.trim()) ||
            conditionFilter ||
            containerFilter ||
            watchlistOnly,
    );

    const clearFilters = () => {
        setSearchText("");
        setMaterialFilter("");
        setOtherMaterialSearch("");
        setConditionFilter("");
        setContainerFilter("");
        setWatchlistOnly(false);
    };

    const toggleWatchlist = async (itemId) => {
        setWatchBusyId(itemId);
        setError("");
        try {
            const isAlreadyInWatchlist = watchlistIds.includes(itemId);
            const res = await fetch(apiUrl(`/pro/items/${itemId}/watchlist`), {
                method: isAlreadyInWatchlist ? "DELETE" : "POST",
                headers: buildAuthHeaders(),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Erreur mise a jour watchlist");
            }

            await fetchWatchlist();
        } catch (err) {
            setError(err.message || "Erreur watchlist");
        } finally {
            setWatchBusyId(0);
        }
    };

    const reserve = async () => {
        const item = reserveConfirmItem;
        if (!item) return;

        setBusyId(item.id);
        setError("");
        try {
            const reserveRes = await fetch(apiUrl(`/pro/items/${item.id}/reserve`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({}),
            });
            const reserveData = await reserveRes.json();
            if (!reserveRes.ok) {
                throw new Error(reserveData.error || "Reservation impossible");
            }

            const wf = reserveData.logistics?.workflow_status || reserveData.logistics?.workflowStatus;
            const pickupCode = reserveData.pickup_code || "";

            if (wf === "pending_payment") {
                const checkoutRes = await fetch(apiUrl(`/pro/items/${item.id}/checkout-session`), {
                    method: "POST",
                    headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({}),
                });
                const checkoutData = await checkoutRes.json();
                if (!checkoutRes.ok || !checkoutData.checkout_url) {
                    throw new Error(checkoutData.error || "Impossible de creer la session de paiement");
                }
                setReserveConfirmItem(null);
                window.location.assign(checkoutData.checkout_url);
                return;
            } else {
                setReserveConfirmItem(null);
                setToast(`Le matériau "${item.title}" a bien été réservé.`);
                setTimeout(() => setToast(null), 4000);
            }

            await fetchItems();
        } catch (err) {
            setError(err.message || "Erreur lors de la réservation");
        } finally {
            setBusyId(0);
        }
    };

    const content = useMemo(() => {
        if (loading) return <p style={styles.emptyState}>Chargement des annonces disponibles...</p>;
        if (!filteredItems.length) {
            return (
                <p style={styles.emptyState}>
                    {items.length ? "Aucun resultat pour ces filtres." : "Aucune annonce disponible pour le moment."}
                </p>
            );
        }

        return (
            <div style={styles.grid}>
                {filteredItems.map((item) => {
                    const thumb = item.image || (item.photos && item.photos[0]) || "/img/placeholder-object.jpg";
                    return (
                    <article key={item.id} style={styles.card} className="annonce-card">
                        {previewLooksLikeVideo(thumb) ? (
                            <video
                                src={thumb}
                                muted
                                playsInline
                                preload="metadata"
                                aria-label={item.title}
                                style={styles.cardImage}
                            />
                        ) : (
                            <img
                                src={thumb}
                                alt={item.title}
                                style={styles.cardImage}
                            />
                        )}
                        <div style={styles.blurLayer} />
                        <div style={styles.gradientLayer} />
                        <div style={styles.statusBadge}>DISPONIBLE</div>

                        <div style={styles.cardOverlay}>
                            <div style={styles.titlePriceRow}>
                                <h3 style={styles.cardTitle}>{item.title}</h3>
                                <div style={styles.pricePill}>{item.type === "don" ? "GRATUIT" : formatBuyerCardPrice(item)}</div>
                            </div>

                            <p style={styles.description}>Publiée le {formatPublishDate(item)}</p>

                            <div style={styles.tagsRow}>
                                {item.category && <span style={styles.tag}>{item.category}</span>}
                                {item.material && <span style={styles.tag}>{item.material}</span>}
                                {item.condition && <span style={styles.tag}>{item.condition}</span>}
                            </div>

                            <div style={styles.cardActions}>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/annonces/disponible/${item.id}`)}
                                    style={styles.viewBtn}
                                    className="view-btn-card"
                                >
                                    Voir détail
                                </button>
                                <button
                                    type="button"
                                    disabled={busyId === item.id}
                                    onClick={() => setReserveConfirmItem(item)}
                                    style={{ ...styles.reserveBtn, opacity: busyId === item.id ? 0.7 : 1 }}
                                    className="reserve-btn-card"
                                >
                                    {busyId === item.id ? "Réservation..." : "Réserver"}
                                </button>
                                <button
                                    type="button"
                                    disabled={watchBusyId === item.id}
                                    onClick={() => toggleWatchlist(item.id)}
                                    style={{ ...styles.watchBtn(watchlistIds.includes(item.id)), opacity: watchBusyId === item.id ? 0.7 : 1 }}
                                    title={watchlistIds.includes(item.id) ? "Retirer de la watchlist" : "Ajouter a la watchlist"}
                                    aria-label={watchlistIds.includes(item.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                                >
                                    <Star size={16} fill={watchlistIds.includes(item.id) ? "currentColor" : "none"} />
                                </button>
                            </div>
                        </div>
                    </article>
                    );
                })}
            </div>
        );
    }, [filteredItems, items.length, loading, busyId, watchlistIds, watchBusyId]);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">Espace Professionnel</p>
                <h1 style={styles.title}>Annonces disponibles</h1>
                <p style={styles.subtitle}>Objets déposés et récupérables par les professionnels.</p>
            </header>

            <section style={{ ...styles.filtersWrap, flexWrap: "wrap", alignItems: "center" }}>
                <div style={styles.searchFieldWrap}>
                    <input
                        type="text"
                        placeholder="Rechercher une annonce..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>

                <div style={styles.materialFilterGroup}>
                    <select
                        value={materialFilter}
                        onChange={(e) => {
                            const v = e.target.value;
                            setMaterialFilter(v);
                            if (v !== MATERIAL_FILTER_OTHER) setOtherMaterialSearch("");
                        }}
                        style={styles.filterField}
                    >
                        <option value="">Matériau</option>
                        {catalogMaterialLabels.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                        <option value={MATERIAL_FILTER_OTHER}>Autre</option>
                    </select>
                    {materialAlertContext.show && (
                        <button
                            type="button"
                            title={materialAlertContext.message}
                            style={styles.materialAlertBtn}
                        >
                            Être alerté
                        </button>
                    )}
                </div>

                <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} style={styles.filterField}>
                    <option value="">Etat</option>
                    {conditionOptions.map((value) => (
                        <option key={value} value={value}>{value}</option>
                    ))}
                </select>

                <select value={containerFilter} onChange={(e) => setContainerFilter(e.target.value)} style={styles.filterField}>
                    <option value="">Conteneur</option>
                    {containerOptions.map((value) => (
                        <option key={value} value={value}>{value}</option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={() => setWatchlistOnly((v) => !v)}
                    style={styles.toggleBtn(watchlistOnly)}
                >
                    <Star size={15} fill={watchlistOnly ? "currentColor" : "none"} />
                    Watchlist
                </button>

                <button type="button" onClick={clearFilters} style={styles.clearBtn} disabled={!hasActiveFilters}>
                    Reinitialiser
                </button>
            </section>

            {materialFilter === MATERIAL_FILTER_OTHER && (
                <div
                    style={{
                        width: "100%",
                        maxWidth: "520px",
                        marginBottom: "1.25rem",
                        padding: "1rem 1.15rem",
                        borderRadius: "18px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "var(--surface-hover, #f4f7f6)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.65rem",
                    }}
                >
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
                        Nom du matériau
                    </label>
                    <input
                        type="text"
                        value={otherMaterialSearch}
                        onChange={(e) => setOtherMaterialSearch(e.target.value)}
                        placeholder="Tapez pour chercher dans le référentiel…"
                        style={{
                            ...styles.searchInput,
                            maxWidth: "100%",
                            borderRadius: "14px",
                            background: "#fff",
                            border: "1px solid rgba(0,0,0,0.08)",
                        }}
                    />
                    {catalogMatchesForOtherSearch.length > 0 && (
                        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                            Correspondances dans le référentiel
                        </div>
                    )}
                    {catalogMatchesForOtherSearch.length > 0 && (
                        <ul
                            style={{
                                margin: 0,
                                padding: "0.35rem 0",
                                listStyle: "none",
                                maxHeight: "200px",
                                overflowY: "auto",
                                borderRadius: "12px",
                                background: "#fff",
                                border: "1px solid rgba(0,0,0,0.06)",
                            }}
                        >
                            {catalogMatchesForOtherSearch.map((label) => (
                                <li key={label}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMaterialFilter(label);
                                            setOtherMaterialSearch("");
                                        }}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "0.55rem 0.85rem",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            fontSize: "0.9rem",
                                            fontFamily: "inherit",
                                        }}
                                        className="catalog-material-suggest-btn"
                                    >
                                        {label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div style={styles.filterMeta}>
                <Filter size={14} />
                <span>
                    {filteredItems.length} resultat{filteredItems.length > 1 ? "s" : ""} · {watchlistIds.length} favori{watchlistIds.length > 1 ? "s" : ""}
                </span>
            </div>

            {error && <p style={styles.error}>{error}</p>}
            {content}

            <AdminModal
                open={Boolean(reserveConfirmItem)}
                title="Confirmation de réservation"
                onClose={() => {
                    if (busyId) return;
                    setReserveConfirmItem(null);
                }}
            >
                <div style={{ display: "grid", gap: "1rem", paddingTop: "0.2rem" }}>
                    <p style={{ margin: 0, color: "var(--text-main)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                        Êtes-vous sûr de vouloir réserver le matériau "{reserveConfirmItem?.title}" ?
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.7rem" }}>
                        <button
                            type="button"
                            onClick={() => setReserveConfirmItem(null)}
                            disabled={Boolean(busyId)}
                            style={{
                                border: "none",
                                borderRadius: "12px",
                                padding: "0.62rem 1rem",
                                background: "#e8ecee",
                                color: "var(--text-main)",
                                fontWeight: 700,
                                cursor: busyId ? "not-allowed" : "pointer",
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={reserve}
                            disabled={Boolean(busyId)}
                            style={{
                                border: "none",
                                borderRadius: "12px",
                                padding: "0.62rem 1rem",
                                background: "#1f3336",
                                color: "#fff",
                                fontWeight: 700,
                                cursor: busyId ? "not-allowed" : "pointer",
                                opacity: busyId ? 0.75 : 1,
                            }}
                        >
                            {busyId ? "Confirmation..." : "Confirmer"}
                        </button>
                    </div>
                </div>
            </AdminModal>

            {toast && (
                <div style={styles.toast}>
                    <Check size={16} color="#4ade80" />
                    <span>{toast}</span>
                </div>
            )}

            <style jsx>{`
                .annonce-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                }
                .view-btn-card:hover {
                    background: #e8e8e8 !important;
                }
                .reserve-btn-card:hover {
                    background: rgba(255,255,255,0.24) !important;
                }
                .catalog-material-suggest-btn:hover {
                    background: rgb(229, 255, 188) !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
