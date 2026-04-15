"use client";

import { useState } from "react";

const STATUS_COLORS = {
    en_attente: { bg: "#FFF3E0", color: "#A56A2A" },
    brouillon: { bg: "#E6EDEE", color: "#4F6163" },
    signale: { bg: "#FDE8E8", color: "#B24A4A" },
};

export default function SalarieModerationView({ contents = [], loading, errorMessage, onValidate, onHide, onDelete }) {
    const [query, setQuery] = useState("");

    const toModerate = contents.filter(c => {
        const q = query.trim().toLowerCase();
        const isPending = c.status === "en_attente" || c.status === "brouillon" || c.status === "signale";
        return isPending && (!q || c.title.toLowerCase().includes(q));
    });

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Espace salarié</span>
                    <h1>Modération</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher un contenu…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{ flex: "1 1 200px", minWidth: 0, border: "none", borderRadius: "999px", padding: "0.68rem 0.95rem", background: "#E5FFBC", color: "var(--text-main)", fontFamily: "inherit", fontSize: "0.88rem", outline: "none" }}
                    />
                </div>
                {errorMessage && <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>}
            </div>

            <div className="panel">
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                    <span className="section-title">Contenus à modérer</span>
                    <span className="db-badge">{toModerate.length}</span>
                </div>

                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>}
                {!loading && toModerate.length === 0 && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun contenu en attente de modération.</p>
                )}

                {!loading && toModerate.map(item => {
                    const statusStyle = STATUS_COLORS[item.status] || { bg: "#E6EDEE", color: "#4F6163" };
                    return (
                        <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.85rem 0", borderBottom: "1px solid #EAF0F1" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{item.title}</span>
                                    <span className="db-badge" style={{ background: statusStyle.bg, color: statusStyle.color, textTransform: "capitalize" }}>{item.status?.replace("_", " ")}</span>
                                    <span className="db-badge" style={{ background: "#EDF2F1", textTransform: "capitalize" }}>{item.type}</span>
                                </div>
                                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem", lineHeight: 1.5, maxHeight: "2.5rem", overflow: "hidden" }}>{item.body}</p>
                            </div>
                            <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                                <button
                                    className="action-cta task-action-btn"
                                    style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                                    type="button"
                                    title="Valider"
                                    onClick={() => onValidate(item.id)}
                                >
                                    Valider
                                </button>
                                <button
                                    className="action-cta"
                                    style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", background: "#E6EDEE", color: "var(--text-main)" }}
                                    type="button"
                                    title="Masquer"
                                    onClick={() => onHide(item.id)}
                                >
                                    Masquer
                                </button>
                                <button
                                    className="action-cta"
                                    style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", background: "#FDE8E8", color: "#a23b3b" }}
                                    type="button"
                                    title="Supprimer"
                                    onClick={() => onDelete(item.id)}
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
