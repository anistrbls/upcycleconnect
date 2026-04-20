"use client";

import { useState, useCallback } from "react";
import { pillInputStyle } from "../../lib/styles";
import AdminModal from "../admin/AdminModal";
import { TOKEN_KEY, apiUrl, buildAuthHeaders } from "../../lib/api";

const TYPE_LABELS = { formation: "Formation", atelier: "Atelier", evenement: "Événement", conference: "Conférence" };
const TYPE_COLORS = {
    formation:  { bg: "#EAF4FF", color: "#2563EB" },
    atelier:    { bg: "#E5FFBC", color: "#166534" },
    evenement:  { bg: "#FFF7ED", color: "#92400E" },
    conference: { bg: "#FAF5FF", color: "#6B21A8" },
};
const TYPE_FILTERS = [
    { key: "all",       label: "Toutes" },
    { key: "formation", label: "Formations" },
    { key: "atelier",   label: "Ateliers" },
    { key: "evenement", label: "Événements" },
];
const PRICE_FILTERS = [
    { key: "all",    label: "Gratuit & payant" },
    { key: "gratuit", label: "Gratuit" },
    { key: "payant",  label: "Payant" },
];

function formatDate(raw) {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatTime(raw) {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function formatPrice(item) {
    if (item.pricingType === "payant" && item.price > 0) return `${Number(item.price).toLocaleString("fr-FR")} €`;
    return "Gratuit";
}
function placesRestantes(item) {
    if (item.capacite == null && item.capaciteMax == null) return null;
    const max = item.capaciteMax ?? item.capacite;
    if (max == null) return null;
    return Math.max(0, max - (item.participantCount ?? 0));
}

/* ── Card événement style photo plein fond ── */
function EventCard({ item, index, onDetail, onRegister, onUnregister, onCheckout, registeredIds, loadingIds }) {
    const tc = TYPE_COLORS[item.type] || { bg: "#E6EDEE", color: "#444" };
    const start = new Date(item.dateDebut);
    const isFull = (() => { const r = placesRestantes(item); return r !== null && r <= 0; })();
    const isRegistered = registeredIds.has(item.id);
    const isLoading = loadingIds.has(item.id);
    const isPaid = item.pricingType === "payant" && item.price > 0;

    return (
        <article
            style={{ position: "relative", borderRadius: "28px", overflow: "hidden", height: "380px", background: item.imageUrl ? "#111" : tc.bg, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", cursor: "pointer", animation: "cardAppear 0.45s ease-out both", animationDelay: `${(index ?? 0) * 0.06}s` }}
            onClick={() => onDetail(item)}
        >
            {item.imageUrl ? (
                <>
                    <img src={item.imageUrl} alt={item.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                    <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", pointerEvents: "none" }} />
                </>
            ) : null}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.6) 38%, rgba(5,10,5,0.1) 62%, transparent 78%)", pointerEvents: "none" }} />

            {/* Badges haut droite */}
            <div style={{ position: "absolute", top: "14px", right: "14px", display: "flex", gap: "0.4rem", zIndex: 2, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {isFull && (
                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(220,38,38,0.75)", color: "#fff", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.22)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Complet</div>
                )}
                {isRegistered && (
                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(50,200,100,0.75)", color: "#fff", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.22)", letterSpacing: "0.04em" }}>Inscrit</div>
                )}
            </div>

            {/* Contenu bas */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem", zIndex: 2 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3, flex: 1 }}>{item.name}</h3>
                    <div style={{ padding: "5px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.88rem", fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {formatPrice(item)}
                    </div>
                </div>
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                    {!isNaN(start.getTime()) && start.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {item.lieu && ` · ${item.lieu}`}
                </p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", fontSize: "0.73rem", color: "rgba(255,255,255,0.85)", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                        {TYPE_LABELS[item.type] || item.type}
                    </span>
                    {(() => { const r = placesRestantes(item); return r !== null ? (
                        <span style={{ padding: "3px 10px", borderRadius: "999px", background: r <= 0 ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.12)", fontSize: "0.73rem", color: r <= 0 ? "#fca5a5" : "rgba(255,255,255,0.85)", fontWeight: 500, border: r <= 0 ? "1px solid rgba(220,38,38,0.4)" : "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                            {r <= 0 ? "Complet" : `${r} place${r > 1 ? "s" : ""} restante${r > 1 ? "s" : ""}`}
                        </span>
                    ) : null; })()}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button type="button" onClick={() => onDetail(item)} style={{ padding: "9px 14px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "white", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                        Voir le détail
                    </button>
                    {isRegistered ? (
                        <button type="button" disabled={isLoading} onClick={() => onUnregister(item)} style={{ flex: 1, padding: "9px 14px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.65)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
                            {isLoading ? "…" : "Se désinscrire"}
                        </button>
                    ) : isFull ? (
                        <div style={{ flex: 1, padding: "9px 14px", borderRadius: "999px", background: "rgba(220,38,38,0.2)", color: "#fca5a5", fontSize: "0.82rem", fontWeight: 600, textAlign: "center" }}>Complet</div>
                    ) : isPaid ? (
                        <button type="button" disabled={isLoading} onClick={() => onCheckout(item)} style={{ flex: 1, padding: "9px 14px", borderRadius: "999px", border: "none", background: "white", color: "#111", cursor: "pointer", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
                            {isLoading ? "…" : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Réserver</>}
                        </button>
                    ) : (
                        <button type="button" disabled={isLoading} onClick={() => onRegister(item)} style={{ flex: 1, padding: "9px 14px", borderRadius: "999px", border: "none", background: "white", color: "#111", cursor: "pointer", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 700 }}>
                            {isLoading ? "…" : "S'inscrire"}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

/* ── Modale détail ── */
function EventDetailModal({ item, open, onClose, onRegister, onUnregister, onCheckout, isRegistered, isLoading }) {
    if (!item) return null;
    const tc = TYPE_COLORS[item.type] || { bg: "#E6EDEE", color: "#444" };
    const isFull = (() => { const r = placesRestantes(item); return r !== null && r <= 0; })();
    const isPaid = item.pricingType === "payant" && item.price > 0;
    const restantes = placesRestantes(item);
    const start = new Date(item.dateDebut);
    const end = new Date(item.dateFin);

    return (
        <AdminModal open={open} title={item.name} onClose={onClose}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "16px" }} onError={e => e.target.style.display = "none"} />
                )}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, background: tc.bg, color: tc.color }}>{TYPE_LABELS[item.type] || item.type}</span>
                    {isFull && <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, background: "#FDE8E8", color: "#B24A4A" }}>Complet</span>}
                    {isRegistered && <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, background: "#E5FFBC", color: "#166534" }}>Inscrit</span>}
                </div>
                {item.description && <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.65 }}>{item.description}</p>}
                <div style={{ display: "grid", gap: "0.55rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                    {!isNaN(start.getTime()) && <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Date</span><span>{formatDate(item.dateDebut)}{!isNaN(end.getTime()) && ` → ${start.toDateString() === end.toDateString() ? formatTime(item.dateFin) : formatDate(item.dateFin)}`}</span></div>}
                    {item.lieu && <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Lieu</span><span>{item.lieu}</span></div>}
                    {item.categoryName && <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Catégorie</span><span>{item.categoryName}</span></div>}
                    {item.intervenant && <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Intervenant</span><span>{item.intervenant}</span></div>}
                    <div style={{ display: "flex", gap: "0.5rem" }}><span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Tarif</span><span style={{ fontWeight: 700 }}>{formatPrice(item)}</span></div>
                    {restantes !== null && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Places</span>
                            <span style={{ color: restantes <= 0 ? "#B24A4A" : "inherit" }}>
                                {item.participantCount ?? 0}/{item.capaciteMax ?? item.capacite} inscrits{restantes > 0 ? ` · ${restantes} restante${restantes > 1 ? "s" : ""}` : " · Complet"}
                            </span>
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", gap: "0.65rem", paddingTop: "0.25rem" }}>
                    {isRegistered ? (
                        <button type="button" disabled={isLoading} onClick={() => { onUnregister(item); onClose(); }} style={{ flex: 1, padding: "0.75rem", borderRadius: "16px", border: "none", background: "#F0F0F0", color: "var(--text-main)", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
                            {isLoading ? "…" : "Se désinscrire"}
                        </button>
                    ) : isFull ? (
                        <div style={{ flex: 1, padding: "0.75rem", borderRadius: "16px", background: "#FDE8E8", color: "#B24A4A", fontSize: "0.9rem", fontWeight: 600, textAlign: "center" }}>Complet — inscription impossible</div>
                    ) : isPaid ? (
                        <button type="button" disabled={isLoading} onClick={() => { onCheckout(item); onClose(); }} className="action-cta task-action-btn" style={{ flex: 1, fontSize: "0.9rem" }}>
                            {isLoading ? "…" : `Réserver · ${formatPrice(item)}`}
                        </button>
                    ) : (
                        <button type="button" disabled={isLoading} onClick={() => { onRegister(item); onClose(); }} className="action-cta task-action-btn" style={{ flex: 1, fontSize: "0.9rem" }}>
                            {isLoading ? "…" : "S'inscrire gratuitement"}
                        </button>
                    )}
                    <button type="button" onClick={onClose} className="action-cta" style={{ background: "#E8ECEE", color: "var(--text-main)" }}>Fermer</button>
                </div>
            </div>
        </AdminModal>
    );
}

/* ── Carte inscription (Mes inscriptions) ── */
function RegistrationCard({ item, index, onDetail, onUnregister, isLoading }) {
    const tc = TYPE_COLORS[item.type] || { bg: "#E6EDEE", color: "#444" };
    const start = new Date(item.dateDebut);
    const isPaid = item.paymentStatus === "paid";
    const isPending = item.paymentStatus === "pending";
    return (
        <article style={{ background: "var(--surface-hover)", borderRadius: "20px", padding: "1.25rem", display: "grid", gap: "0.75rem", animation: "cardAppear 0.45s ease-out both", animationDelay: `${(index ?? 0) * 0.07}s` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, flex: 1, lineHeight: 1.35 }}>{item.name}</h3>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.73rem", fontWeight: 700, background: tc.bg, color: tc.color }}>{TYPE_LABELS[item.type] || item.type}</span>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.73rem", fontWeight: 700, background: isPending ? "#FFF3E0" : isPaid ? "#EAF4FF" : "#E5FFBC", color: isPending ? "#A56A2A" : isPaid ? "#2563EB" : "#166534" }}>
                        {isPending ? "Paiement en attente" : isPaid ? "Payé" : "Gratuit"}
                    </span>
                </div>
            </div>
            <div style={{ display: "grid", gap: "0.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {!isNaN(start.getTime()) && <span>{formatDate(item.dateDebut)}</span>}
                {item.lieu && <span>{item.lieu}</span>}
                {item.intervenant && <span>Intervenant : {item.intervenant}</span>}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="button" onClick={() => onDetail(item)} className="action-cta task-action-btn" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>Détail</button>
                <button type="button" disabled={isLoading} onClick={() => onUnregister(item)} className="action-cta" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem", background: "#F0F0F0", color: "var(--text-main)" }}>
                    {isLoading ? "…" : "Se désinscrire"}
                </button>
            </div>
        </article>
    );
}

/* ══════════════════════════════════════════════════════════ */
export default function ParticulierEvenementsView({ events = [], registrations = [], loading, errorMessage, onReload, subpage = "activites" }) {
    const [typeFilter, setTypeFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [detailItem, setDetailItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [loadingIds, setLoadingIds] = useState(new Set());
    const [registeredIds, setRegisteredIds] = useState(() => new Set((registrations || []).filter(r => r.paymentStatus !== "pending").map(r => r.id ?? r.eventId)));

    // Sync registeredIds when registrations prop changes
    const syncRegistrations = useCallback((regs) => {
        setRegisteredIds(new Set((regs || []).filter(r => r.paymentStatus !== "pending").map(r => r.id ?? r.eventId)));
    }, []);

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const setLoading = (id, val) => {
        setLoadingIds(prev => {
            const next = new Set(prev);
            val ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const handleRegister = async (item) => {
        setLoading(item.id, true);
        try {
            const res = await fetch(apiUrl(`/events/${item.id}/register`), { method: "POST", headers: buildAuthHeaders() });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Erreur d'inscription");
            setRegisteredIds(prev => new Set([...prev, item.id]));
            showToast(`Inscription confirmée pour "${item.name}" !`);
            if (onReload) onReload();
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setLoading(item.id, false);
        }
    };

    const handleUnregister = async (item) => {
        setLoading(item.id, true);
        try {
            const res = await fetch(apiUrl(`/events/${item.id}/register`), { method: "DELETE", headers: buildAuthHeaders() });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Erreur de désinscription");
            setRegisteredIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
            showToast(`Désinscription effectuée.`);
            if (onReload) onReload();
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setLoading(item.id, false);
        }
    };

    const handleCheckout = async (item) => {
        setLoading(item.id, true);
        try {
            const res = await fetch(apiUrl(`/events/${item.id}/checkout`), { method: "POST", headers: buildAuthHeaders() });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Erreur de paiement");
            if (data.url) window.location.href = data.url;
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setLoading(item.id, false);
        }
    };

    /* ── Vue Activités ── */
    if (subpage === "activites" || subpage == null) {
        const visible = events.filter(item => {
            const q = query.trim().toLowerCase();
            const matchQ = !q || item.name.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q) || (item.lieu || "").toLowerCase().includes(q);
            const matchT = typeFilter === "all" || item.type === typeFilter;
            const matchP = priceFilter === "all" || item.pricingType === priceFilter || (priceFilter === "gratuit" && (!item.pricingType || item.pricingType === "gratuit"));
            return matchQ && matchT && matchP;
        });

        return (
            <>
                {toast && (
                    <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#166534" : "#B24A4A", color: "#fff", padding: "0.8rem 1.5rem", borderRadius: "999px", fontSize: "0.88rem", fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", animation: "fadeIn 0.3s ease" }}>
                        {toast.msg}
                    </div>
                )}

                <div className="header-section">
                    <div className="title-area">
                        <span className="activities-label">Espace particulier</span>
                        <h1>Activités & événements</h1>
                    </div>
                </div>

                <div className="panel" style={{ marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                        <input type="text" placeholder="Rechercher…" value={query} onChange={e => setQuery(e.target.value)}
                            style={{ flex: "1 1 200px", minWidth: 0, ...pillInputStyle }} />
                        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                            {TYPE_FILTERS.map(f => (
                                <button key={f.key} type="button" className={`action-btn ${typeFilter === f.key ? "primary" : ""}`} onClick={() => setTypeFilter(f.key)} style={{ fontSize: "0.83rem" }}>
                                    {f.label}
                                    {f.key !== "all" && (
                                        <span className="db-badge" style={{ marginLeft: "0.4rem", background: typeFilter === f.key ? "rgba(255,255,255,0.22)" : (TYPE_COLORS[f.key]?.bg || "#eee"), color: typeFilter === f.key ? "inherit" : (TYPE_COLORS[f.key]?.color || "inherit"), padding: "1px 7px", fontSize: "0.75rem" }}>
                                            {events.filter(e => e.type === f.key).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                            {PRICE_FILTERS.map(f => (
                                <button key={f.key} type="button" className={`action-btn ${priceFilter === f.key ? "primary" : ""}`} onClick={() => setPriceFilter(f.key)} style={{ fontSize: "0.83rem" }}>{f.label}</button>
                            ))}
                        </div>
                    </div>
                    {errorMessage && <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>}
                </div>

                {loading && (
                    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} style={{ borderRadius: "28px", height: "380px", background: "var(--surface-hover)", animation: `skeletonPulse 1.4s ease-in-out ${i * 0.1}s infinite` }} />
                        ))}
                    </div>
                )}
                {!loading && visible.length === 0 && (
                    <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                            {query || typeFilter !== "all" || priceFilter !== "all" ? "Aucune activité ne correspond à votre recherche." : "Aucune activité disponible pour le moment."}
                        </p>
                    </div>
                )}
                {!loading && visible.length > 0 && (
                    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                        {visible.map((item, index) => (
                            <EventCard key={item.id} index={index} item={item} onDetail={setDetailItem}
                                onRegister={handleRegister} onUnregister={handleUnregister} onCheckout={handleCheckout}
                                registeredIds={registeredIds} loadingIds={loadingIds} />
                        ))}
                    </div>
                )}

                <EventDetailModal item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)}
                    onRegister={handleRegister} onUnregister={handleUnregister} onCheckout={handleCheckout}
                    isRegistered={detailItem ? registeredIds.has(detailItem.id) : false}
                    isLoading={detailItem ? loadingIds.has(detailItem.id) : false} />
            </>
        );
    }

    /* ── Vue Mes inscriptions ── */
    if (subpage === "mes-inscriptions") {
        return (
            <>
                {toast && (
                    <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#166534" : "#B24A4A", color: "#fff", padding: "0.8rem 1.5rem", borderRadius: "999px", fontSize: "0.88rem", fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
                        {toast.msg}
                    </div>
                )}
                <div className="header-section">
                    <div className="title-area">
                        <span className="activities-label">Espace particulier</span>
                        <h1>Mes inscriptions</h1>
                    </div>
                </div>
                {loading && (
                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} style={{ borderRadius: "20px", height: "140px", background: "var(--surface-hover)", animation: `skeletonPulse 1.4s ease-in-out ${i * 0.1}s infinite` }} />
                        ))}
                    </div>
                )}
                {!loading && registrations.length === 0 && (
                    <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>Vous n'êtes inscrit à aucun événement pour le moment.</p>
                    </div>
                )}
                {!loading && registrations.length > 0 && (
                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                        {registrations.map((item, index) => (
                            <RegistrationCard key={item.id ?? item.eventId} index={index} item={item} onDetail={setDetailItem}
                                onUnregister={async (it) => { await handleUnregister(it); if (onReload) onReload(); }}
                                isLoading={loadingIds.has(item.id)} />
                        ))}
                    </div>
                )}
                <EventDetailModal item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)}
                    onRegister={handleRegister} onUnregister={handleUnregister} onCheckout={handleCheckout}
                    isRegistered={detailItem ? registeredIds.has(detailItem.id) : false}
                    isLoading={detailItem ? loadingIds.has(detailItem.id) : false} />
            </>
        );
    }

    return null;
}

// Keyframes injectés globalement une seule fois
if (typeof window !== "undefined" && !document.getElementById("pev-keyframes")) {
    const s = document.createElement("style");
    s.id = "pev-keyframes";
    s.textContent = `
        @keyframes cardAppear { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes skeletonPulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.9; } }
    `;
    document.head.appendChild(s);
}
