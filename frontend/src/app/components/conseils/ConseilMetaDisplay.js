"use client";

import { STATUS_COLORS, STATUS_LABELS } from "../../lib/conseilConstants";
import { estimatedTimeDisplayLabel } from "../../lib/conseilEstimatedTime";

const tagStyle = {
    display: "inline-block",
    padding: "0.2rem 0.55rem",
    borderRadius: "999px",
    background: "#EAF0F1",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#3d5a66",
    marginRight: "0.35rem",
    marginBottom: "0.35rem",
};

export function StatusBadge({ status }) {
    const s = STATUS_COLORS[status] || { bg: "#E6EDEE", color: "#556" };
    return (
        <span className="db-badge" style={{ background: s.bg, color: s.color, flexShrink: 0 }}>
            {STATUS_LABELS[status] || status}
        </span>
    );
}

export function ConseilMetaBadges({ item, compact = false, className = "" }) {
    if (!item) return null;
    const chips = [];
    if (item.category) chips.push({ label: item.category, accent: true });
    if (item.difficultyLevel) chips.push({ label: item.difficultyLevel });
    const timeLabel = estimatedTimeDisplayLabel(item);
    if (timeLabel) chips.push({ label: timeLabel });
    (item.targetAudience || []).forEach((a) => chips.push({ label: a }));
    if (!chips.length && compact) return null;
    return (
        <div className={`conseil-meta-badges ${className}`.trim()} style={compact ? undefined : { marginTop: "0.5rem" }}>
            {chips.map((c) => (
                <span
                    key={c.label}
                    className={`conseil-meta-chip${c.accent ? " conseil-meta-chip--accent" : ""}`}
                    style={compact ? undefined : {
                        ...tagStyle,
                        background: c.accent ? "#E5FFBC" : tagStyle.background,
                        color: c.accent ? "#2E7D32" : tagStyle.color,
                    }}
                >
                    {c.label}
                </span>
            ))}
        </div>
    );
}

/** Catégorie, niveau, durée, public — sous le titre. */
export function ConseilCardFactsStrip({ item }) {
    if (!item) return null;

    const category = (item.category || "").trim();
    const difficulty = (item.difficultyLevel || "").trim();
    const timeLabel = estimatedTimeDisplayLabel(item);
    const audiences = (item.targetAudience || []).map((a) => String(a).trim()).filter(Boolean);

    const pills = [];
    if (category) pills.push({ key: "cat", label: category, variant: "category" });
    if (difficulty) pills.push({ key: "diff", label: difficulty, variant: "default" });
    if (timeLabel) pills.push({ key: "time", label: timeLabel, variant: "default" });
    audiences.forEach((a, i) => pills.push({ key: `aud-${i}`, label: a, variant: "default" }));

    if (!pills.length) return null;

    return (
        <div className="conseil-card-facts">
            {pills.map((p) => (
                <span key={p.key} className={`conseil-card-facts__pill conseil-card-facts__pill--${p.variant}`}>
                    {p.label}
                </span>
            ))}
        </div>
    );
}

export function ConseilTagsRow({ tags, variant = "inline" }) {
    if (!tags?.length) return null;

    if (variant === "detail") {
        return (
            <section className="conseil-detail__tags-section">
                <h2 className="conseil-detail__section-title">Mots-clés</h2>
                <div className="conseil-detail__tags">
                    {tags.map((t) => (
                        <span key={t} className="conseil-detail__tag">
                            {t}
                        </span>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <div className="conseil-tags-row">
            {tags.map((t) => (
                <span key={t} className="conseil-tags-row__chip">#{t}</span>
            ))}
        </div>
    );
}

const IcTool = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9aa8ad" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
);

export function ConseilToolsGrid({ tools }) {
    if (!tools?.length) return null;
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginTop: "0.75rem" }}>
            {tools.map((tool) => (
                <div
                    key={tool.id || `${tool.name}-${tool.sortOrder}`}
                    style={{
                        background: "#fff",
                        borderRadius: "18px",
                        padding: "1rem",
                        border: "1px solid #e8ecee",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                    }}
                >
                    <div
                        style={{
                            height: "100px",
                            borderRadius: "12px",
                            background: "#f4f7f8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                        }}
                    >
                        {tool.imageUrl ? (
                            <img src={tool.imageUrl} alt={tool.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <IcTool />
                        )}
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>{tool.name}</p>
                    {tool.description && (
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{tool.description}</p>
                    )}
                    {tool.externalUrl && tool.externalUrl !== tool.imageUrl && !/\.(jpe?g|png|gif|webp|avif|bmp)(\?|$)/i.test(tool.externalUrl) && (
                        <a href={tool.externalUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", color: "#1D9BF0" }}>
                            En savoir plus
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
}

/** Outils, sécurité, tags (résumé et matériaux : en-tête + corps de la page détail). */
export function ConseilDetailSections({ item }) {
    if (!item) return null;
    return (
        <>
            {item.tools?.length > 0 && (
                <section className="conseil-detail__section">
                    <h2 className="conseil-detail__section-title">Outils nécessaires</h2>
                    <ConseilToolsGrid tools={item.tools} />
                </section>
            )}
            {item.safetyTips?.trim() && (
                <section className="conseil-detail__safety" aria-label="Conseils de sécurité">
                    <div className="conseil-detail__safety-card">
                        <div className="conseil-detail__safety-head">
                            <span className="conseil-detail__safety-icon" aria-hidden>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="M12 8v4" />
                                    <path d="M12 16h.01" />
                                </svg>
                            </span>
                            <h2 className="conseil-detail__safety-title">Conseils de sécurité</h2>
                        </div>
                        <p className="conseil-detail__safety-text">{item.safetyTips}</p>
                    </div>
                </section>
            )}
            <ConseilTagsRow tags={item.tags} variant="detail" />
            {item.externalUrl && (
                <p className="conseil-detail__external">
                    <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                        Ressource externe
                    </a>
                </p>
            )}
        </>
    );
}
