"use client";

import { useRef, useState } from "react";
import {
    CONSEIL_AUDIENCES,
    CONSEIL_DIFFICULTIES,
    CONSEIL_STATUSES,
    emptyTool,
    MAX_CONSEIL_PHOTOS,
} from "../../lib/conseilConstants";
import { useConseilReferentials } from "../../lib/useConseilReferentials";
import { CONSEIL_TIME_UNITS } from "../../lib/conseilEstimatedTime";

const fieldBase = {
    padding: "0.75rem 1rem",
    borderRadius: "14px",
    border: "none",
    background: "#fff",
    fontSize: "0.92rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
};

const S = {
    card: { background: "var(--surface-hover)", borderRadius: "28px", padding: "2rem", marginBottom: "1.5rem" },
    sectionTitle: { fontSize: "1rem", fontWeight: 700, margin: "0 0 1.25rem 0" },
    label: { display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)", marginBottom: "0.75rem", fontFamily: "inherit" },
    input: { ...fieldBase },
    select: { ...fieldBase, appearance: "none", cursor: "pointer" },
    textarea: { ...fieldBase, resize: "vertical", minHeight: "120px" },
    photoBox: { border: "2px dashed #d0d8da", borderRadius: "20px", padding: "2rem 1rem", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.75)", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" },
    chip: { display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.7rem", borderRadius: "999px", background: "#EAF0F1", fontSize: "0.8rem", fontWeight: 600 },
    toolCard: { background: "#fff", borderRadius: "18px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e0e8ea" },
};

const IcCamera = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);

function readImageFile(file, onDone) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => onDone(ev.target.result);
    reader.readAsDataURL(file);
}

function TagEditor({ label, values, onChange, suggestions = [], placeholder }) {
    const [draft, setDraft] = useState("");
    const add = (raw) => {
        const v = (raw || draft).trim();
        if (!v || values.includes(v)) return;
        onChange([...values, v]);
        setDraft("");
    };
    return (
        <label style={S.label}>
            {label}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
                {values.map((v) => (
                    <span key={v} style={S.chip}>
                        {v}
                        <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontSize: "1rem", lineHeight: 1 }}>×</button>
                    </span>
                ))}
            </div>
            {suggestions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
                    {suggestions.filter((s) => !values.includes(s)).map((s) => (
                        <button key={s} type="button" onClick={() => add(s)} style={{ ...S.chip, cursor: "pointer", border: "1px dashed #c5d0d4", background: "#fff" }}>+ {s}</button>
                    ))}
                </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    placeholder={placeholder}
                    style={{ ...S.input, flex: 1 }}
                />
                <button type="button" className="action-cta" onClick={() => add()} style={{ flexShrink: 0, fontSize: "0.82rem" }}>Ajouter</button>
            </div>
        </label>
    );
}

function MultiCheck({ label, options, values, onChange }) {
    const toggle = (opt) => {
        if (opt === "Tous") {
            onChange(values.includes("Tous") ? [] : ["Tous"]);
            return;
        }
        let next = values.filter((v) => v !== "Tous");
        if (next.includes(opt)) next = next.filter((v) => v !== opt);
        else next = [...next, opt];
        onChange(next);
    };
    return (
        <label style={S.label}>
            {label}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {options.map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => toggle(opt)}
                        style={{
                            ...S.chip,
                            cursor: "pointer",
                            border: values.includes(opt) ? "2px solid var(--black)" : "1px solid #d0d8da",
                            background: values.includes(opt) ? "#E5FFBC" : "#fff",
                        }}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </label>
    );
}

function ConseilPhotosField({ photos, coverIndex, onPhotosChange, onCoverIndexChange }) {
    const fileRef = useRef();
    const [urlDraft, setUrlDraft] = useState("");
    const list = photos || [];
    const safeCover = list.length ? Math.min(Math.max(0, coverIndex ?? 0), list.length - 1) : 0;

    const setPhotos = (next) => {
        const trimmed = next.map((p) => String(p).trim()).filter(Boolean).slice(0, MAX_CONSEIL_PHOTOS);
        onPhotosChange(trimmed);
        if (!trimmed.length) {
            onCoverIndexChange(0);
        } else if (safeCover >= trimmed.length) {
            onCoverIndexChange(trimmed.length - 1);
        }
    };

    const addPhoto = (url) => {
        const u = String(url || "").trim();
        if (!u || list.includes(u) || list.length >= MAX_CONSEIL_PHOTOS) return;
        setPhotos([...list, u]);
        if (list.length === 0) onCoverIndexChange(0);
    };

    const removePhoto = (index) => {
        const next = list.filter((_, i) => i !== index);
        setPhotos(next);
        if (safeCover === index) onCoverIndexChange(0);
        else if (safeCover > index) onCoverIndexChange(safeCover - 1);
    };

    const handleFiles = (fileList) => {
        Array.from(fileList || []).forEach((file) => {
            if (list.length >= MAX_CONSEIL_PHOTOS) return;
            readImageFile(file, (dataUrl) => addPhoto(dataUrl));
        });
    };

    return (
        <div style={S.card} className="conseil-form-photos">
            <h2 style={S.sectionTitle}>Photos du conseil</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 1rem 0" }}>
                Ajoutez jusqu&apos;à {MAX_CONSEIL_PHOTOS} images. Cliquez sur une vignette pour la définir comme image principale.
            </p>

            {list.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", margin: "0 0 0.5rem 0" }}>Image principale</p>
                    <div style={{ borderRadius: "16px", overflow: "hidden", border: "2px solid var(--black)", maxWidth: "420px" }}>
                        <img src={list[safeCover]} alt="Image principale" style={{ width: "100%", maxHeight: "240px", objectFit: "contain", display: "block", background: "#000" }} />
                    </div>
                </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1rem" }}>
                {list.map((url, idx) => (
                    <div
                        key={`${url}-${idx}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onCoverIndexChange(idx)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCoverIndexChange(idx); } }}
                        style={{
                            position: "relative",
                            width: "96px",
                            height: "96px",
                            borderRadius: "12px",
                            overflow: "hidden",
                            cursor: "pointer",
                            border: idx === safeCover ? "3px solid var(--black)" : "2px solid #e0e8ea",
                            boxShadow: idx === safeCover ? "0 0 0 2px var(--green-leaf)" : "none",
                        }}
                        title={idx === safeCover ? "Image principale" : "Définir comme image principale"}
                    >
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        {idx === safeCover && (
                            <span style={{ position: "absolute", left: 4, bottom: 4, fontSize: "0.65rem", fontWeight: 700, background: "var(--green-leaf)", color: "#2E7D32", padding: "0.1rem 0.35rem", borderRadius: "6px" }}>
                                Principale
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                            style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1 }}
                            aria-label="Supprimer"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />

            {list.length < MAX_CONSEIL_PHOTOS && (
                <div
                    style={{ ...S.photoBox, marginBottom: "0.75rem" }}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                >
                    <IcCamera />
                    <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Glisser-déposer des images</span>
                </div>
            )}

            <label style={{ ...S.label, fontSize: "0.78rem" }}>
                URL d&apos;une image (facultatif)
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                        type="url"
                        value={urlDraft}
                        onChange={(e) => setUrlDraft(e.target.value)}
                        style={{ ...S.input, fontSize: "0.82rem", flex: 1 }}
                        placeholder="https://…"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addPhoto(urlDraft);
                                setUrlDraft("");
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="action-cta"
                        style={{ flexShrink: 0, fontSize: "0.82rem" }}
                        onClick={() => {
                            addPhoto(urlDraft);
                            setUrlDraft("");
                        }}
                    >
                        Ajouter
                    </button>
                </div>
            </label>
        </div>
    );
}

function ToolsEditor({ tools, setTools }) {
    const updateTool = (idx, patch) => {
        setTools((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
    };
    const moveTool = (idx, dir) => {
        setTools((prev) => {
            const next = [...prev];
            const j = idx + dir;
            if (j < 0 || j >= next.length) return prev;
            [next[idx], next[j]] = [next[j], next[idx]];
            return next.map((t, i) => ({ ...t, sortOrder: i + 1 }));
        });
    };
    const removeTool = (idx) => {
        setTools((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            return next.map((t, i) => ({ ...t, sortOrder: i + 1 }));
        });
    };
    return (
        <div style={S.card}>
            <h2 style={S.sectionTitle}>Outils nécessaires</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 1rem 0" }}>Ajoutez chaque outil avec son image dédiée (facultative).</p>
            {tools.map((tool, idx) => (
                <div key={idx} style={S.toolCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>Outil {idx + 1}</span>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                            <button type="button" className="action-cta" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} disabled={idx === 0} onClick={() => moveTool(idx, -1)}>↑</button>
                            <button type="button" className="action-cta" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} disabled={idx === tools.length - 1} onClick={() => moveTool(idx, 1)}>↓</button>
                            <button type="button" className="action-cta" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", background: "#FDE8E8", color: "#B24A4A" }} onClick={() => removeTool(idx)}>Supprimer</button>
                        </div>
                    </div>
                    <label style={S.label}>
                        Nom de l&apos;outil *
                        <input type="text" value={tool.name} onChange={(e) => updateTool(idx, { name: e.target.value })} style={S.input} placeholder="Ex. Ponceuse" />
                    </label>
                    <label style={S.label}>
                        Description courte (facultatif)
                        <textarea value={tool.description} onChange={(e) => updateTool(idx, { description: e.target.value })} style={{ ...S.textarea, minHeight: "72px" }} rows={2} />
                    </label>
                    <ToolImageField
                        imageUrl={tool.imageUrl}
                        onChange={(url) => updateTool(idx, { imageUrl: url })}
                    />
                </div>
            ))}
            <button
                type="button"
                className="action-cta task-action-btn"
                onClick={() => setTools((prev) => [...prev, emptyTool(prev.length + 1)])}
            >
                + Ajouter un outil
            </button>
        </div>
    );
}

function ToolImageField({ imageUrl, onChange }) {
    const fileRef = useRef();
    const [urlDraft, setUrlDraft] = useState("");
    return (
        <label style={{ ...S.label, fontSize: "0.78rem" }}>
            Image de l&apos;outil (facultatif)
            {imageUrl ? (
                <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", maxWidth: "220px" }}>
                    <img src={imageUrl} alt="" style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }} />
                    <button type="button" onClick={() => onChange("")} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: "0.85rem" }}>×</button>
                </div>
            ) : (
                <>
                    <button type="button" className="action-cta" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }} onClick={() => fileRef.current?.click()}>Choisir une image</button>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                            type="url"
                            value={urlDraft}
                            onChange={(e) => setUrlDraft(e.target.value)}
                            style={{ ...S.input, fontSize: "0.82rem", flex: 1 }}
                            placeholder="https://…"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (urlDraft.trim()) onChange(urlDraft.trim());
                                }
                            }}
                        />
                        <button type="button" className="action-cta" style={{ fontSize: "0.8rem" }} onClick={() => urlDraft.trim() && onChange(urlDraft.trim())}>OK</button>
                    </div>
                </>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" style={{ display: "none" }} onChange={(e) => readImageFile(e.target.files[0], onChange)} />
        </label>
    );
}

export default function ConseilFormSections({ formState, setFormState, isAdmin = false, authorName = "" }) {
    const { categories, materials, loading: refLoading } = useConseilReferentials();
    const set = (key) => (e) => setFormState((p) => ({ ...p, [key]: e.target.value }));
    const statusOptions = isAdmin
        ? CONSEIL_STATUSES.filter(
            (s) => s.value !== "en_attente" || formState.status === "en_attente"
        )
        : CONSEIL_STATUSES.filter((s) => s.value === "brouillon" || s.value === "en_attente");

    return (
        <div className="conseil-form">
            <ConseilPhotosField
                photos={formState.photos}
                coverIndex={formState.coverIndex}
                onPhotosChange={(photos) => setFormState((p) => ({ ...p, photos }))}
                onCoverIndexChange={(coverIndex) => setFormState((p) => ({ ...p, coverIndex }))}
            />

            <div style={S.card}>
                <h2 style={S.sectionTitle}>Informations générales</h2>
                <label style={S.label}>
                    Titre *
                    <input type="text" value={formState.title} onChange={set("title")} style={S.input} required placeholder="Ex. Comment transformer une vieille palette…" />
                </label>
                <label style={S.label}>
                    Résumé court (recommandé, max. 250 car.)
                    <textarea value={formState.summary} onChange={set("summary")} style={{ ...S.textarea, minHeight: "80px" }} maxLength={250} placeholder="Aperçu affiché dans les listes…" />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{(formState.summary || "").length}/250</span>
                </label>
                <label style={S.label}>
                    Catégorie du conseil *
                    <select value={formState.category} onChange={set("category")} style={S.select} required disabled={refLoading}>
                        <option value="">{refLoading ? "Chargement…" : "— Choisir —"}</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        {formState.category && !categories.includes(formState.category) && (
                            <option value={formState.category}>{formState.category}</option>
                        )}
                    </select>
                </label>
                <MultiCheck
                    label="Public visé *"
                    options={CONSEIL_AUDIENCES}
                    values={formState.targetAudience}
                    onChange={(v) => setFormState((p) => ({ ...p, targetAudience: v }))}
                />
                <label style={S.label}>
                    Niveau de difficulté *
                    <select value={formState.difficultyLevel} onChange={set("difficultyLevel")} style={S.select} required>
                        <option value="">— Choisir —</option>
                        {CONSEIL_DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </label>
                <label style={S.label}>
                    Temps estimé (recommandé)
                    <div style={{ display: "flex", gap: "0.65rem", alignItems: "stretch" }}>
                        <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={formState.estimatedTimeValue}
                            onChange={set("estimatedTimeValue")}
                            style={{ ...S.input, flex: "1 1 120px", maxWidth: "160px" }}
                            placeholder="Ex. 2"
                        />
                        <select
                            value={formState.estimatedTimeUnit}
                            onChange={set("estimatedTimeUnit")}
                            style={{ ...S.select, flex: "1 1 180px" }}
                        >
                            {CONSEIL_TIME_UNITS.map((u) => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                        </select>
                    </div>
                </label>
            </div>

            <div style={S.card}>
                <h2 style={S.sectionTitle}>Contenu du conseil</h2>
                <label style={S.label}>
                    Contenu principal *
                    <textarea value={formState.body} onChange={set("body")} style={{ ...S.textarea, minHeight: "200px" }} required placeholder="Rédigez le conseil en détail…" />
                </label>
                <TagEditor
                    label="Matériaux concernés (facultatif)"
                    values={formState.materials}
                    onChange={(v) => setFormState((p) => ({ ...p, materials: v }))}
                    suggestions={materials}
                    placeholder="Choisir dans la liste ou saisir un matériau…"
                />
                <ToolsEditor
                    tools={formState.tools}
                    setTools={(fn) => setFormState((p) => ({ ...p, tools: typeof fn === "function" ? fn(p.tools) : fn }))}
                />
                <label style={S.label}>
                    Conseils de sécurité (facultatif)
                    <textarea value={formState.safetyTips} onChange={set("safetyTips")} style={S.textarea} placeholder="Précautions à respecter…" />
                </label>
            </div>

            <div style={S.card}>
                <h2 style={S.sectionTitle}>Publication</h2>
                <TagEditor
                    label="Tags / mots-clés (facultatif)"
                    values={formState.tags}
                    onChange={(v) => setFormState((p) => ({ ...p, tags: v }))}
                    suggestions={[]}
                    placeholder="Ex. palette, DIY, récup…"
                />
                <label style={S.label}>
                    Statut de publication *
                    <select value={formState.status} onChange={set("status")} style={S.select}>
                        {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </label>
                <label style={S.label}>
                    Date de publication prévue (facultatif)
                    <input type="datetime-local" value={formState.scheduledPublishAt} onChange={set("scheduledPublishAt")} style={S.input} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                        Avec une date future, choisissez le statut « Publié » : le conseil restera en brouillon jusqu&apos;à cette date, puis sera publié automatiquement.
                    </span>
                </label>
                {authorName && (
                    <label style={S.label}>
                        Auteur (automatique)
                        <input type="text" value={authorName} readOnly disabled style={{ ...S.input, opacity: 0.85 }} />
                    </label>
                )}
            </div>
        </div>
    );
}
