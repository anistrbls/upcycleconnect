"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "../../conseils/ConseilMetaDisplay";
import ConseilRejectModal from "../../conseils/ConseilRejectModal";
import {
    CONSEIL_LIST_ALL,
    CONSEIL_LIST_PENDING,
    conseilDetailHref,
} from "../../../lib/conseilDetailRoutes";
import ConseilFeedCardText from "../../conseils/ConseilFeedCardText";
import { formatDateFR } from "../../../lib/formatters";
import ConseilFilterFields from "../../conseils/ConseilFilterFields";

// ─── Styles inline partagés ────────────────────────────────────────────────────

// ─── Icônes ────────────────────────────────────────────────────────────────────

const IconPencil = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);
const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" /></svg>
);
const IconCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const IconX = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const IconEye = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IconCamera = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);
const IconPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
);
const IcVerified = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#1D9BF0"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.8c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.26-2.52.8-3.91C21.37 14.67 22.25 13.43 22.25 12zm-5.74-1.53l-4.6 4.6a.75.75 0 0 1-1.06 0l-2.3-2.3a.75.75 0 1 1 1.06-1.06l1.77 1.77 4.07-4.07a.75.75 0 0 1 1.06 1.06z" /></svg>
);

// ─── Card style X pour la vue admin ───────────────────────────────────────────

function AdminConseilCard({ item, onDetail, onEdit, onValidate, onOpenReject, onDelete, delay = 0 }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="x-card" style={{ animationDelay: `${delay}s` }}>
            {item.isPinned && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#71767B", marginBottom: "0.6rem" }}>
                    <IconPin /> <span style={{ fontWeight: 600 }}>Conseil épinglé</span>
                </div>
            )}
            <div className="conseil-card-head">
                <div className="conseil-card-head__author">
                    <span className="conseil-card-head__name">{item.authorName}</span>
                    <IcVerified />
                    <span style={{ color: "#71767B", fontSize: "0.84rem" }}>·</span>
                    <span className="conseil-card-head__date">{formatDateFR(item.createdAt)}</span>
                </div>
                <StatusBadge status={item.status} />
            </div>
            <ConseilFeedCardText
                item={item}
                expanded={expanded}
                onToggleExpand={() => setExpanded((p) => !p)}
                preferFullBody
            />
            {item.imageUrl && (
                <div style={{ marginTop: "0.85rem", borderRadius: "16px", overflow: "hidden", border: "1px solid #EFF3F4" }}>
                    <img src={item.imageUrl} alt={item.title || "Image"} style={{ width: "100%", maxHeight: "260px", objectFit: "cover", display: "block" }} onError={(e) => { e.target.parentElement.style.display = "none"; }} />
                </div>
            )}
            {item.rejectionComment && (
                <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.85rem", borderRadius: "12px", background: "#FDE8E8", border: "1px solid #f5c6c6" }}>
                    <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#B24A4A", margin: "0 0 0.15rem 0" }}>Motif de refus</p>
                    <p style={{ fontSize: "0.8rem", color: "#B24A4A", margin: 0 }}>{item.rejectionComment}</p>
                </div>
            )}
            <div style={{ borderTop: "1px solid #EFF3F4", marginTop: "0.85rem", paddingTop: "0.65rem", display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#71767B", marginBottom: "0.5rem" }}>
                <span><strong style={{ color: "#0F1419" }}>{item.likeCount ?? 0}</strong> J&apos;aime</span>
                <span><strong style={{ color: "#0F1419" }}>{item.favoriteCount ?? 0}</strong> Favoris</span>
            </div>
            <div style={{ borderTop: "1px solid #EFF3F4", paddingTop: "0.55rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" onClick={() => onDetail(item)} title="Voir" style={btnIcon}><IconEye /></button>
                <button type="button" onClick={() => onEdit(item)} title="Modifier" style={btnIcon}><IconPencil /></button>
                {item.status === "en_attente" && (
                    <>
                        <button type="button" onClick={() => onValidate(item)} title="Valider" style={{ ...btnIcon, background: "#E5FFBC", color: "#2E7D32" }}><IconCheck /></button>
                        <button type="button" onClick={() => onOpenReject(item)} title="Refuser" style={{ ...btnIcon, background: "#FDE8E8", color: "#B24A4A" }}><IconX /></button>
                    </>
                )}
                <button type="button" onClick={() => onDelete(item)} title="Supprimer" style={{ ...btnIcon, background: "#FDE8E8", color: "#B24A4A", marginLeft: "auto" }}><IconTrash /></button>
            </div>
        </div>
    );
}

// ─── Vue principale ────────────────────────────────────────────────────────────

export default function ConseilsAdminView({ items = [], loading, errorMessage, filterPending, onReload, onDelete, onValidate, onReject }) {
    const router = useRouter();
    const listBack = filterPending ? CONSEIL_LIST_PENDING : CONSEIL_LIST_ALL;
    const [query, setQuery] = useState("");
    const [listFilters, setListFilters] = useState({ category: "", difficulty: "", material: "", audience: "" });

    // Modal refus
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [rejectSaving, setRejectSaving] = useState(false);
    const [rejectError, setRejectError] = useState("");

    // Conseil épinglé
    const pinnedItem = items.find((i) => i.isPinned);

    // Filtrage
    const visible = items.filter((i) => {
        if (filterPending && i.status !== "en_attente") return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return i.title.toLowerCase().includes(q) || (i.authorName || "").toLowerCase().includes(q);
    });

    // ── Helpers ─────────────────────────────────────────────────────────────────

    const openCreate = () => router.push("/conseils/nouveau");

    const openEdit = (item) => router.push(`/conseils/modifier/${item.id}`);

    const openDetail = (item) => router.push(conseilDetailHref(item.id, listBack));

    const handleDelete = async (item) => {
        if (!window.confirm(`Supprimer le conseil "${item.title}" ?`)) return;
        try { await onDelete(item.id); } catch (err) { window.alert(String(err?.message || "Impossible de supprimer.")); }
    };

    const handleValidate = async (item) => {
        try { await onValidate(item.id); } catch (err) { window.alert(String(err?.message || "Erreur lors de la validation.")); }
    };

    const openRejectModal = (item) => { setRejectTarget(item); setRejectComment(""); setRejectError(""); setRejectOpen(true); };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setRejectError("");
        if (!rejectComment.trim()) { setRejectError("Veuillez indiquer un motif de refus."); return; }
        setRejectSaving(true);
        try {
            await onReject(rejectTarget.id, rejectComment.trim());
            setRejectOpen(false);
        } catch (err) {
            setRejectError(String(err?.message || "Erreur lors du refus."));
        } finally {
            setRejectSaving(false);
        }
    };

    return (
        <>
            <style>{`
                @keyframes cardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .x-card { background:#fff; border:1px solid #EFF3F4; border-radius:20px; padding:1.2rem 1.35rem 0.85rem; box-shadow:0 1px 8px rgba(0,0,0,0.06); transition:box-shadow 0.18s; animation:cardIn 0.22s ease both; }
                .x-card:hover { box-shadow:0 4px 18px rgba(0,0,0,0.10); }
            `}</style>
            {/* En-tête */}
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Contenu</span>
                    <h1>{filterPending ? "Conseils en attente de validation" : "Tous les conseils"}</h1>
                </div>
            </div>

            {/* Conseil épinglé (uniquement sur la vue "tous") */}
            {!filterPending && pinnedItem && (
                <div className="panel" style={{ marginBottom: "1rem", background: "#FFF8EC", border: "1px solid #f3d9a0", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <div style={{ color: "#A56A2A", paddingTop: "2px", flexShrink: 0 }}><IconPin /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#A56A2A", margin: "0 0 0.2rem 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>Conseil épinglé du jour</p>
                        <p style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.15rem 0" }}>{pinnedItem.title}</p>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>par {pinnedItem.authorName}</p>
                    </div>
                    <button type="button" className="action-cta" onClick={() => openDetail(pinnedItem)} style={{ flexShrink: 0, fontSize: "0.82rem", padding: "0.4rem 0.9rem" }}>Voir</button>
                </div>
            )}

            {/* Barre d'outils */}
            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div className="conseil-toolbar">
                    <input
                        type="text"
                        className="conseil-filter-input"
                        placeholder="Rechercher par titre ou auteur…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {!filterPending && (
                        <ConseilFilterFields filters={listFilters} onChange={setListFilters} />
                    )}
                    <button className="action-cta task-action-btn" type="button" onClick={() => onReload(listFilters)}>Actualiser</button>
                    {!filterPending && (
                        <button className="action-cta task-action-btn" type="button" onClick={openCreate}>+ Créer un conseil</button>
                    )}
                </div>
                {errorMessage && <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>}
            </div>

            {/* Feed cartes */}
            {loading && (
                <div style={{ display: "grid", gap: "0.85rem" }}>
                    {[1, 2, 3].map((k) => (
                        <div key={k} style={{ background: "#F7F9F9", borderRadius: "20px", height: "130px", opacity: 0.5 }} />
                    ))}
                </div>
            )}
            {!loading && visible.length === 0 && (
                <div className="panel" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>Aucun conseil trouvé.</p>
                </div>
            )}
            {!loading && visible.length > 0 && (
                <div style={{ display: "grid", gap: "0.85rem" }}>
                    {visible.map((item, idx) => (
                        <AdminConseilCard
                            key={item.id}
                            item={item}
                            onDetail={openDetail}
                            onEdit={openEdit}
                            onValidate={handleValidate}
                            onOpenReject={openRejectModal}
                            onDelete={handleDelete}
                            delay={idx * 0.04}
                        />
                    ))}
                </div>
            )}

            {/* Modal refus */}
            <ConseilRejectModal
                open={rejectOpen}
                comment={rejectComment}
                setComment={setRejectComment}
                saving={rejectSaving}
                error={rejectError}
                onSubmit={handleRejectSubmit}
                onClose={() => setRejectOpen(false)}
            />
        </>
    );
}

const btnIcon = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "30px", height: "30px", borderRadius: "50%",
    border: "none", background: "#e8ecee", color: "var(--text-main)",
    cursor: "pointer", flexShrink: 0,
};
