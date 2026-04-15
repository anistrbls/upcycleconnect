"use client";

import { useState } from "react";
import { formatDateFR } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";
import AdminModal from "../AdminModal";

const VALIDATION_COLORS = {
    pending:  { bg: "#FFF3E0", color: "#A56A2A" },
    approved: { bg: "#E5FFBC", color: "#3A6A2A" },
    rejected: { bg: "#FDE8E8", color: "#B24A4A" },
};

const VALIDATION_LABELS = {
    pending:  "En attente",
    approved: "Validé",
    rejected: "Refusé",
};

export default function EventValidationView({ events = [], loading, errorMessage, onReload, onValidate, onReject }) {
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectComment, setRejectComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState("");

    const pending = events.filter((e) => {
        const q = query.trim().toLowerCase();
        return (
            e.validationStatus === "pending" &&
            (!q ||
                e.name.toLowerCase().includes(q) ||
                (e.intervenant || "").toLowerCase().includes(q) ||
                (e.lieu || "").toLowerCase().includes(q))
        );
    });

    const handleValidate = async (event) => {
        if (!window.confirm(`Valider l'événement "${event.name}" ?`)) return;
        try {
            await onValidate(event.id);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de valider l'événement."));
        }
    };

    const openRejectModal = (event) => {
        setRejectTarget(event);
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
            setLocalError(String(err?.message || "Impossible de refuser l'événement."));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Événements</span>
                    <h1>Validation des événements</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher un événement en attente…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ flex: "1 1 260px", minWidth: 0, ...pillInputStyle }}
                    />
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>
                        Actualiser
                    </button>
                </div>
                {errorMessage && (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>
                )}
            </div>

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Événements en attente de validation</span>
                    <span className="db-badge" style={{ background: "#FFF3E0", color: "#A56A2A" }}>
                        {pending.length}
                    </span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && pending.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        Aucun événement en attente de validation.
                    </p>
                )}

                {!loading &&
                    pending.map((item) => {
                        const start = new Date(item.dateDebut);
                        const end = new Date(item.dateFin);
                        const vs = VALIDATION_COLORS[item.validationStatus] || VALIDATION_COLORS.pending;
                        return (
                            <div
                                key={item.id}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    gap: "1rem",
                                    alignItems: "start",
                                    padding: "1rem 0",
                                    borderBottom: "1px solid #EAF0F1",
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            flexWrap: "wrap",
                                            marginBottom: "0.3rem",
                                        }}
                                    >
                                        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.name}</span>
                                        <span
                                            className="db-badge"
                                            style={{ background: vs.bg, color: vs.color }}
                                        >
                                            {VALIDATION_LABELS[item.validationStatus] || item.validationStatus}
                                        </span>
                                        <span
                                            className="db-badge"
                                            style={{ background: "#EDF2F1", textTransform: "capitalize" }}
                                        >
                                            {item.type}
                                        </span>
                                        {item.categoryName && (
                                            <span className="db-badge" style={{ background: "#EAF4FF" }}>
                                                {item.categoryName}
                                            </span>
                                        )}
                                    </div>
                                    <p
                                        style={{
                                            fontSize: "0.82rem",
                                            color: "var(--text-muted)",
                                            lineHeight: 1.5,
                                            maxHeight: "2.5rem",
                                            overflow: "hidden",
                                            marginBottom: "0.4rem",
                                        }}
                                    >
                                        {item.description || "—"}
                                    </p>
                                    <div
                                        style={{
                                            fontSize: "0.78rem",
                                            color: "var(--text-muted)",
                                            display: "flex",
                                            gap: "1rem",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <span>
                                            {Number.isNaN(start.getTime())
                                                ? "—"
                                                : start.toLocaleString("fr-FR", {
                                                      day: "2-digit",
                                                      month: "short",
                                                      year: "numeric",
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                  })}
                                        </span>
                                        {item.lieu && <span>{item.lieu}</span>}
                                        {item.capacite != null && <span>{item.capacite} places</span>}
                                        {item.intervenant && <span>Intervenant : {item.intervenant}</span>}
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, paddingTop: "0.15rem" }}>
                                    <button
                                        className="action-cta task-action-btn"
                                        style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem" }}
                                        type="button"
                                        onClick={() => handleValidate(item)}
                                    >
                                        Valider
                                    </button>
                                    <button
                                        className="action-cta"
                                        style={{
                                            fontSize: "0.78rem",
                                            padding: "0.4rem 0.85rem",
                                            background: "#FDE8E8",
                                            color: "#a23b3b",
                                        }}
                                        type="button"
                                        onClick={() => openRejectModal(item)}
                                    >
                                        Refuser
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>

            <AdminModal
                open={!!rejectTarget}
                title={`Refuser : ${rejectTarget?.name || ""}`}
                onClose={() => setRejectTarget(null)}
            >
                <form onSubmit={handleRejectSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Motif du refus (optionnel)
                        <textarea
                            rows={3}
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="Précisez la raison du refus pour informer le salarié…"
                            style={{ ...fieldStyle, resize: "vertical" }}
                        />
                    </label>
                    {localError && (
                        <p style={{ color: "#a23b3b", fontSize: "0.82rem" }}>{localError}</p>
                    )}
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
