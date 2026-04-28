"use client";

import { useRef, useState } from "react";
import AdminModal from "../AdminModal";
import { formatDateFR } from "../../../lib/formatters";
import { buildAuthHeaders } from "../../../lib/api";

// ─── Constantes ────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
    brouillon: "Brouillon",
    en_attente: "En attente",
    publie: "Publié",
    archive: "Archivé",
};

const STATUS_COLORS = {
    brouillon:  { bg: "#E6EDEE",  color: "#556" },
    en_attente: { bg: "#FFF3E0",  color: "#A56A2A" },
    publie:     { bg: "#E5FFBC",  color: "#2E7D32" },
    archive:    { bg: "#F0F0F0",  color: "#888" },
};

const EMPTY_FORM = { title: "", body: "", status: "brouillon", imageUrl: "" };

// ─── Styles inline partagés ────────────────────────────────────────────────────

const S = {
    container: { width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" },
    grid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" },
    card: { background: "var(--surface-hover)", borderRadius: "28px", padding: "2rem", marginBottom: "1.5rem" },
    sectionTitle: { fontSize: "1rem", fontWeight: 700, margin: "0 0 1.25rem 0" },
    label: { display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: "0.75rem" },
    input: { padding: "0.75rem 1rem", borderRadius: "14px", border: "none", background: "#fff", fontSize: "0.92rem", outline: "none", width: "100%", boxSizing: "border-box" },
    select: { padding: "0.75rem 1rem", borderRadius: "14px", border: "none", background: "#fff", fontSize: "0.92rem", outline: "none", width: "100%", appearance: "none", cursor: "pointer" },
    textarea: { padding: "0.75rem 1rem", borderRadius: "14px", border: "none", background: "#fff", fontSize: "0.92rem", outline: "none", width: "100%", resize: "vertical", minHeight: "160px", boxSizing: "border-box", fontFamily: "inherit" },
    btnPrimary: { padding: "0.75rem 1.5rem", borderRadius: "20px", border: "none", background: "var(--black)", color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", width: "100%" },
    btnSecondary: { padding: "0.6rem 1.25rem", borderRadius: "20px", border: "none", background: "#e8ecee", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", width: "100%", marginTop: "0.65rem" },
    errorBox: { padding: "0.75rem 1rem", borderRadius: "14px", background: "#FDE8E8", color: "#B24A4A", fontSize: "0.83rem", marginTop: "0.75rem" },
    photoBox: { border: "2px dashed #d0d8da", borderRadius: "20px", padding: "2rem 1rem", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.75)", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" },
};

// ─── Icônes ────────────────────────────────────────────────────────────────────

const IconChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
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
    const body = item.body || "";
    const needsTrunc = body.length > 300;
    const displayBody = needsTrunc && !expanded ? body.slice(0, 300) + "\u2026" : body;

    return (
        <div className="x-card" style={{ animationDelay: `${delay}s` }}>
            {item.isPinned && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#71767B", marginBottom: "0.6rem" }}>
                    <IconPin /> <span style={{ fontWeight: 600 }}>Conseil épinglé</span>
                </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.93rem", color: "#0F1419" }}>{item.authorName}</span>
                    <IcVerified />
                    <span style={{ color: "#71767B", fontSize: "0.84rem" }}>·</span>
                    <span style={{ color: "#71767B", fontSize: "0.84rem", whiteSpace: "nowrap" }}>{formatDateFR(item.createdAt)}</span>
                </div>
                <StatusBadge status={item.status} />
            </div>
            {item.title && (
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0F1419", marginBottom: "0.35rem", lineHeight: 1.4 }}>{item.title}</p>
            )}
            <p style={{ fontSize: "0.93rem", lineHeight: 1.65, color: "#0F1419", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0 0 0.5rem 0" }}>{displayBody}</p>
            {needsTrunc && (
                <button type="button" onClick={() => setExpanded((p) => !p)} style={{ fontSize: "0.82rem", color: "#1D9BF0", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontWeight: 500 }}>
                    {expanded ? "Voir moins" : "Lire la suite"}
                </button>
            )}
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

// ─── Badge statut ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const s = STATUS_COLORS[status] || { bg: "#E6EDEE", color: "#556" };
    return (
        <span className="db-badge" style={{ background: s.bg, color: s.color, flexShrink: 0 }}>
            {STATUS_LABELS[status] || status}
        </span>
    );
}

// ─── Formulaire pleine-page ────────────────────────────────────────────────────

function ConseilForm({ editingItem, formState, setFormState, onSubmit, onCancel, isSaving, localError }) {
    const fileRef = useRef();
    const set = (key) => (e) => setFormState((p) => ({ ...p, [key]: e.target.value }));

    const handleFileDrop = (file) => {
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (ev) => setFormState((p) => ({ ...p, imageUrl: ev.target.result }));
        reader.readAsDataURL(file);
    };

    return (
        <div style={S.container}>
            <div style={{ marginBottom: "2rem" }}>
                <button type="button" onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem", padding: 0 }}>
                    <IconChevronLeft /> Retour
                </button>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Conseils</span>
                <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
                    {editingItem ? "Modifier le conseil" : "Créer un conseil"}
                </h1>
            </div>
            <form onSubmit={onSubmit}>
                <div style={S.grid}>
                    {/* Colonne principale */}
                    <div>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Contenu</h2>
                            <label style={S.label}>
                                Titre *
                                <input type="text" value={formState.title} onChange={set("title")} style={S.input} required placeholder="Ex. Comment trier les matériaux en bois…" />
                            </label>
                            <label style={S.label}>
                                Contenu *
                                <textarea value={formState.body} onChange={set("body")} style={S.textarea} required placeholder="Rédigez le conseil…" />
                            </label>
                        </div>

                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Image de couverture</h2>
                            {formState.imageUrl ? (
                                <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", marginBottom: "0.75rem" }}>
                                    <img src={formState.imageUrl} alt="Aperçu" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", display: "block" }} />
                                    <button type="button" onClick={() => setFormState((p) => ({ ...p, imageUrl: "" }))} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem" }}>×</button>
                                </div>
                            ) : (
                                <div style={S.photoBox} onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFileDrop(e.dataTransfer.files[0]); }}>
                                    <IconCamera />
                                    <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Cliquer ou glisser une image</span>
                                    <span style={{ fontSize: "0.78rem" }}>JPG, PNG, WEBP</span>
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileDrop(e.target.files[0])} />
                            <div style={{ marginTop: "0.75rem" }}>
                                <label style={{ ...S.label, fontSize: "0.78rem" }}>
                                    URL externe (facultatif)
                                    <input type="url" value={formState.imageUrl} onChange={set("imageUrl")} style={{ ...S.input, fontSize: "0.82rem" }} placeholder="https://…" />
                                </label>
                            </div>
                        </div>

                        {localError && <div style={S.errorBox}>{localError}</div>}
                    </div>

                    {/* Colonne latérale */}
                    <div style={{ position: "sticky", top: "1rem" }}>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Publication</h2>
                            <label style={{ ...S.label, marginBottom: "1rem" }}>
                                Statut
                                <select value={formState.status} onChange={set("status")} style={S.select}>
                                    <option value="brouillon">Brouillon</option>
                                    <option value="en_attente">En attente</option>
                                    <option value="publie">Publié</option>
                                    <option value="archive">Archivé</option>
                                </select>
                            </label>
                            <button type="submit" disabled={isSaving} style={S.btnPrimary}>
                                {isSaving ? "Enregistrement…" : editingItem ? "Mettre à jour" : "Créer le conseil"}
                            </button>
                            <button type="button" onClick={onCancel} style={S.btnSecondary}>Annuler</button>
                        </div>
                        <div style={{ ...S.card, background: "#E5FFBC", marginTop: 0 }}>
                            <p style={{ fontSize: "0.83rem", color: "#166534", margin: 0, lineHeight: 1.55 }}>
                                En tant qu'admin, vous pouvez publier directement un conseil sans validation.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ─── Vue détail ────────────────────────────────────────────────────────────────

function ConseilDetailView({ item, onBack, onEdit, onDelete, onValidate, onOpenReject }) {
    return (
        <div style={S.container}>
            <div style={{ marginBottom: "2rem" }}>
                <button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem", padding: 0 }}>
                    <IconChevronLeft /> Retour
                </button>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Conseils</span>
                        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {item.isPinned && <span title="Conseil épinglé" style={{ color: "#A56A2A" }}><IconPin /></span>}
                            {item.title}
                        </h1>
                    </div>
                    <StatusBadge status={item.status} />
                </div>
            </div>

            <div style={S.grid}>
                <div>
                    {item.imageUrl && (
                        <div style={{ borderRadius: "24px", overflow: "hidden", marginBottom: "1.5rem" }}>
                            <img src={item.imageUrl} alt={item.title} style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }} />
                        </div>
                    )}
                    <div style={{ ...S.card }}>
                        <p style={{ fontSize: "0.95rem", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>{item.body}</p>
                    </div>
                    {item.status === "brouillon" && item.rejectionComment && (
                        <div style={{ ...S.card, background: "#FDE8E8", border: "1px solid #f5c6c6" }}>
                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#B24A4A", margin: "0 0 0.35rem 0" }}>Motif de refus</p>
                            <p style={{ fontSize: "0.88rem", color: "#B24A4A", margin: 0, lineHeight: 1.6 }}>{item.rejectionComment}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar métadonnées + actions */}
                <div style={{ position: "sticky", top: "1rem" }}>
                    <div style={S.card}>
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem" }}>Informations</h3>
                        <div style={{ display: "grid", gap: "0.6rem", fontSize: "0.84rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Auteur</span>
                                <span style={{ fontWeight: 600 }}>{item.authorName}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "var(--text-muted)" }}>Statut</span>
                                <StatusBadge status={item.status} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Créé le</span>
                                <span>{formatDateFR(item.createdAt)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Modifié le</span>
                                <span>{formatDateFR(item.updatedAt)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>J&apos;aime</span>
                                <span style={{ fontWeight: 600 }}>{item.likeCount ?? 0}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-muted)" }}>Favoris</span>
                                <span style={{ fontWeight: 600 }}>{item.favoriteCount ?? 0}</span>
                            </div>
                            {item.isPinned && (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem", padding: "0.45rem 0.65rem", borderRadius: "10px", background: "#FFF8EC", border: "1px solid #f3d9a0" }}>
                                    <IconPin />
                                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#A56A2A" }}>Conseil épinglé du jour</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ ...S.card, display: "grid", gap: "0.5rem" }}>
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem", marginTop: 0 }}>Actions rapides</h3>
                        <button type="button" onClick={onEdit} className="action-cta task-action-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                            <IconPencil /> Modifier
                        </button>
                        {item.status === "en_attente" && (
                            <>
                                <button type="button" onClick={() => onValidate(item)} className="action-cta task-action-btn" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "#E5FFBC", color: "#2E7D32" }}>
                                    <IconCheck /> Valider
                                </button>
                                <button type="button" onClick={() => onOpenReject(item)} className="action-cta" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "#FDE8E8", color: "#B24A4A" }}>
                                    <IconX /> Refuser
                                </button>
                            </>
                        )}
                        <button type="button" onClick={() => onDelete(item)} className="action-cta" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "#FDE8E8", color: "#B24A4A" }}>
                            <IconTrash /> Supprimer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Vue principale ────────────────────────────────────────────────────────────

export default function ConseilsAdminView({ items = [], loading, errorMessage, filterPending, onReload, onCreate, onUpdate, onDelete, onValidate, onReject }) {
    const [view, setView] = useState("list"); // "list" | "form" | "detail"
    const [editingItem, setEditingItem] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const [formState, setFormState] = useState(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");
    const [query, setQuery] = useState("");

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

    const resetForm = () => { setEditingItem(null); setFormState(EMPTY_FORM); setLocalError(""); };

    const openCreate = () => { resetForm(); setView("form"); };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormState({ title: item.title || "", body: item.body || "", status: item.status || "brouillon", imageUrl: item.imageUrl || "" });
        setLocalError("");
        setView("form");
    };

    const openDetail = (item) => { setDetailItem(item); setView("detail"); };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        if (!formState.title.trim()) { setLocalError("Le titre est requis."); return; }
        if (!formState.body.trim()) { setLocalError("Le contenu est requis."); return; }
        setIsSaving(true);
        try {
            const payload = { title: formState.title.trim(), body: formState.body.trim(), status: formState.status, imageUrl: formState.imageUrl.trim(), type: "conseil" };
            if (editingItem) { await onUpdate(editingItem.id, payload); } else { await onCreate(payload); }
            setView("list");
            resetForm();
        } catch (err) {
            setLocalError(String(err?.message || "Une erreur est survenue."));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Supprimer le conseil "${item.title}" ?`)) return;
        try { await onDelete(item.id); setView("list"); } catch (err) { window.alert(String(err?.message || "Impossible de supprimer.")); }
    };

    const handleValidate = async (item) => {
        try { await onValidate(item.id); if (view === "detail") setView("list"); } catch (err) { window.alert(String(err?.message || "Erreur lors de la validation.")); }
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
            if (view === "detail") setView("list");
        } catch (err) {
            setRejectError(String(err?.message || "Erreur lors du refus."));
        } finally {
            setRejectSaving(false);
        }
    };

    // ── Vue formulaire ───────────────────────────────────────────────────────────

    if (view === "form") {
        return (
            <ConseilForm
                editingItem={editingItem}
                formState={formState}
                setFormState={setFormState}
                onSubmit={handleFormSubmit}
                onCancel={() => { setView("list"); resetForm(); }}
                isSaving={isSaving}
                localError={localError}
            />
        );
    }

    // ── Vue détail ───────────────────────────────────────────────────────────────

    if (view === "detail" && detailItem) {
        // Récupérer la version à jour depuis la liste (après reload)
        const freshItem = items.find((i) => i.id === detailItem.id) || detailItem;
        return (
            <>
                <ConseilDetailView
                    item={freshItem}
                    onBack={() => setView("list")}
                    onEdit={() => openEdit(freshItem)}
                    onDelete={handleDelete}
                    onValidate={handleValidate}
                    onOpenReject={openRejectModal}
                />
                <RejectModal
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

    // ── Vue liste ────────────────────────────────────────────────────────────────

    return (
        <>
            <style>{`
                @keyframes cardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .x-card { background:#fff; border:1px solid #EFF3F4; border-radius:20px; padding:1.1rem 1.25rem 0.7rem; box-shadow:0 1px 8px rgba(0,0,0,0.06); transition:box-shadow 0.18s; animation:cardIn 0.22s ease both; }
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
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher par titre ou auteur…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ flex: "1 1 220px", minWidth: 0, padding: "0.65rem 1.1rem", borderRadius: "999px", border: "none", background: "var(--surface-hover)", fontSize: "0.88rem", outline: "none" }}
                    />
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
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
            <RejectModal
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

// ─── Bouton icône partagé ─────────────────────────────────────────────────────

const btnIcon = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "30px", height: "30px", borderRadius: "50%",
    border: "none", background: "#e8ecee", color: "var(--text-main)",
    cursor: "pointer", flexShrink: 0,
};

// ─── Modal refus ───────────────────────────────────────────────────────────────

function RejectModal({ open, comment, setComment, saving, error, onSubmit, onClose }) {
    return (
        <AdminModal open={open} title="Refuser le conseil" onClose={onClose}>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    Motif de refus *
                    <textarea
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Expliquez pourquoi ce conseil est refusé…"
                        style={{ padding: "0.7rem 0.85rem", borderRadius: "14px", border: "none", background: "#EAF0F1", fontSize: "0.9rem", outline: "none", resize: "vertical", fontFamily: "inherit" }}
                        required
                    />
                </label>
                {error && <p style={{ color: "#B24A4A", fontSize: "0.82rem", margin: 0 }}>{error}</p>}
                <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button className="action-cta" type="submit" disabled={saving} style={{ background: "#FDE8E8", color: "#B24A4A" }}>
                        {saving ? "Refus en cours…" : "Confirmer le refus"}
                    </button>
                    <button className="action-cta" type="button" onClick={onClose} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                </div>
            </form>
        </AdminModal>
    );
}
