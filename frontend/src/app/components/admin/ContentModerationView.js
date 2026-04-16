"use client";

import { useState } from "react";
import AdminModal from "./AdminModal";
import { fieldStyle, labelStyle, pillInputStyle } from "../../lib/styles";

const STATUS_COLORS = {
    en_attente: { bg: "#FFF3E0", color: "#A56A2A" },
    publie:     { bg: "#E5FFBC", color: "#3A6A2A" },
    brouillon:  { bg: "#E6EDEE", color: "#4F6163" },
};

const TYPE_LABELS = {
    conseil:   "Conseil",
    actualite: "Actualité",
};

export default function ContentModerationView({ contents = [], loading, errorMessage, onReload, onValidate, onReject }) {
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = contents.filter((c) => {
        const q = query.trim().toLowerCase();
        const matchQ = !q || c.title.toLowerCase().includes(q) || (c.authorName || "").toLowerCase().includes(q);
        const matchT = typeFilter === "all" || c.type === typeFilter;
        return c.status === "en_attente" && matchQ && matchT;
    });

    const handleValidate = async (item) => {
        if (!window.confirm(`Publier "${item.title}" ?`)) return;
        try {
            await onValidate(item.id);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de valider."));
        }
    };

    const openReject = (item) => {
        setRejectTarget(item);
        setRejectComment("");
        setLocalError("");
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
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Opérations</span>
                    <h1>Modération des contenus</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher un contenu ou un auteur…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ flex: "1 1 240px", minWidth: 0, ...pillInputStyle }}
                    />
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...pillInputStyle, appearance: "none" }}>
                        <option value="all">Tous les types</option>
                        <option value="conseil">Conseils</option>
                        <option value="actualite">Actualités</option>
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                </div>
                {errorMessage && <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>}
            </div>

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Contenus en attente de validation</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>{pending.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun contenu en attente de modération.</p>
                )}

                {!loading && pending.map((item) => (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start", padding: "1rem 0", borderBottom: "1px solid #EAF0F1" }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.title}</span>
                                <span className="db-badge" style={{ background: "#EAF4FF", textTransform: "capitalize" }}>
                                    {TYPE_LABELS[item.type] || item.type}
                                </span>
                                {item.authorName && (
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>par {item.authorName}</span>
                                )}
                            </div>
                            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, maxHeight: "3rem", overflow: "hidden" }}>{item.body}</p>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, paddingTop: "0.15rem" }}>
                            <button
                                className="action-cta task-action-btn"
                                style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem" }}
                                type="button"
                                onClick={() => handleValidate(item)}
                            >
                                Publier
                            </button>
                            <button
                                className="action-cta"
                                style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", background: "#FDE8E8", color: "#a23b3b" }}
                                type="button"
                                onClick={() => openReject(item)}
                            >
                                Refuser
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <AdminModal
                open={!!rejectTarget}
                title={`Refuser : ${rejectTarget?.title || ""}`}
                onClose={() => setRejectTarget(null)}
            >
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea
                            rows={3}
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="Précisez la raison pour informer le salarié…"
                            style={{ ...fieldStyle, resize: "vertical" }}
                        />
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button
                            className="action-cta"
                            style={{ background: "#FDE8E8", color: "#a23b3b" }}
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Enregistrement…" : "Confirmer le refus"}
                        </button>
                        <button
                            className="action-cta"
                            type="button"
                            onClick={() => setRejectTarget(null)}
                            style={{ background: "#e8ecee", color: "var(--text-main)" }}
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}
