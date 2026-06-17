"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, Plus, Pencil, Trash2, Check, X, GripVertical, Package, Shield, Layers, Loader2, MapPin, QrCode, Lightbulb, Briefcase, Languages } from "lucide-react";
import AdminModal from "../../../components/admin/AdminModal";
import { I18N_REFRESH_EVENT } from "../../../components/i18n/I18nProvider";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import {
    loadDismissedConseilMaterialSuggestions,
    dismissConseilMaterialSuggestion,
    filterVisibleConseilMaterialSuggestions,
    materialSuggestionKey,
} from "../../../lib/materialConseilSuggestions";

// Les entités n'utilisent plus de slug. Le label fait foi.

const EMOJI_MAX_LENGTH = 8;
const emojiFontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

// Répare les emojis déjà stockés en mojibake (UTF-8 lu comme latin1/cp1252).
function normalizeEmoji(value, fallback = "") {
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    try {
        if (!/^[\x00-\xFF]+$/.test(raw)) return raw;
        const bytes = Uint8Array.from(raw, ch => ch.charCodeAt(0));
        const fixed = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
        if (!fixed || fixed.includes("\uFFFD")) return raw;
        return fixed;
    } catch {
        return raw;
    }
}

function getEmptyLanguageDraft() {
    return {
        code: "",
        label: "",
        nativeLabel: "",
        dir: "ltr",
        enabled: true,
        phrases: {},
        patterns: [],
    };
}

function languageToDraft(language) {
    return {
        code: language?.code || "",
        label: language?.label || "",
        nativeLabel: language?.nativeLabel || "",
        dir: language?.dir === "rtl" ? "rtl" : "ltr",
        enabled: language?.enabled !== false,
        phrases: language?.phrases || {},
        patterns: Array.isArray(language?.patterns) ? language.patterns : [],
    };
}

// ── Row catégorie (avec emoji) ────────────────────────────────────────────────
function CategoryRow({ cat, onSave, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ label: cat.label, emoji: cat.emoji });
    const [saving, setSaving] = useState(false);

    const commit = async () => {
        if (!draft.label.trim()) return;
        setSaving(true);
        await onSave({ ...cat, label: draft.label.trim(), emoji: draft.emoji.trim() || "📦" });
        setSaving(false);
        setEditing(false);
    };
    const cancel = () => { setDraft({ label: cat.label, emoji: cat.emoji }); setEditing(false); };

    return (
        <div style={rowStyle}>
            <span style={gripStyle}><GripVertical size={16} /></span>
            {editing ? (
                <>
                    <input value={draft.emoji} onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))} maxLength={EMOJI_MAX_LENGTH} style={emojiInput} />
                    <input autoFocus value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
                        style={{ ...textInput, flex: 1 }} />
                    <button onClick={commit} disabled={saving} style={{ ...iconBtn, background: "var(--forest-deep)", color: "white" }}>
                        {saving ? <Loader2 size={14} style={spinStyle} /> : <Check size={14} />}
                    </button>
                    <button onClick={cancel} style={iconBtn}><X size={14} /></button>
                </>
            ) : (
                <>
                    <span style={{ fontSize: "1.3rem", flexShrink: 0, fontFamily: emojiFontFamily }}>{cat.emoji}</span>
                    <span style={{ flex: 1, fontSize: "0.92rem", fontWeight: "500" }}>{cat.label}</span>
                    <button onClick={() => setEditing(true)} style={iconBtn}><Pencil size={14} /></button>
                    <button onClick={() => onDelete(cat.id)} style={{ ...iconBtn, color: "var(--state-critical)" }}><Trash2 size={14} /></button>
                </>
            )}
        </div>
    );
}

// ── Row pays ──────────────────────────────────────────────────────────────────
function CountryRow({ item, onSave, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ label: item.label, emoji: item.emoji, zip_length: item.zip_length || 5 });
    const [saving, setSaving] = useState(false);

    const commit = async () => {
        if (!draft.label.trim()) return;
        setSaving(true);
        await onSave({ ...item, label: draft.label.trim(), emoji: draft.emoji.trim() || "🌍", zip_length: parseInt(draft.zip_length, 10) || 5 });
        setSaving(false);
        setEditing(false);
    };
    const cancel = () => { setDraft({ label: item.label, emoji: item.emoji, zip_length: item.zip_length || 5 }); setEditing(false); };

    return (
        <div style={rowStyle}>
            <span style={gripStyle}><GripVertical size={16} /></span>
            {editing ? (
                <>
                    <input value={draft.emoji} onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))} maxLength={EMOJI_MAX_LENGTH} style={emojiInput} />
                    <input autoFocus value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
                        style={{ ...textInput, flex: 1 }} />
                    <input type="number" value={draft.zip_length} min={1} max={15} onChange={e => setDraft(d => ({ ...d, zip_length: e.target.value }))}
                        style={{ ...textInput, width: "70px", textAlign: "center" }} />
                    <button onClick={commit} disabled={saving} style={{ ...iconBtn, background: "var(--forest-deep)", color: "white" }}>
                        {saving ? <Loader2 size={14} style={spinStyle} /> : <Check size={14} />}
                    </button>
                    <button onClick={cancel} style={iconBtn}><X size={14} /></button>
                </>
            ) : (
                <>
                    <span style={{ fontSize: "1.3rem", flexShrink: 0, fontFamily: emojiFontFamily }}>{item.emoji}</span>
                    <span style={{ flex: 1, fontSize: "0.92rem", fontWeight: "500" }}>{item.label}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", background: "rgba(35,59,61,0.06)", padding: "2px 8px", borderRadius: "12px" }}>
                        {item.zip_length} chiffres
                    </span>
                    <button onClick={() => setEditing(true)} style={iconBtn}><Pencil size={14} /></button>
                    <button onClick={() => onDelete(item.id)} style={{ ...iconBtn, color: "var(--state-critical)" }}><Trash2 size={14} /></button>
                </>
            )}
        </div>
    );
}

// ── Row état (sans emoji) ─────────────────────────────────────────────────────
function ConditionRow({ cond, onSave, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ label: cond.label });
    const [saving, setSaving] = useState(false);

    const commit = async () => {
        if (!draft.label.trim()) return;
        setSaving(true);
        await onSave({ ...cond, label: draft.label.trim() });
        setSaving(false);
        setEditing(false);
    };
    const cancel = () => { setDraft({ label: cond.label }); setEditing(false); };

    return (
        <div style={rowStyle}>
            <span style={gripStyle}><GripVertical size={16} /></span>
            {editing ? (
                <>
                    <input autoFocus value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
                        style={{ ...textInput, flex: 1 }} />
                    <button onClick={commit} disabled={saving} style={{ ...iconBtn, background: "var(--forest-deep)", color: "white" }}>
                        {saving ? <Loader2 size={14} style={spinStyle} /> : <Check size={14} />}
                    </button>
                    <button onClick={cancel} style={iconBtn}><X size={14} /></button>
                </>
            ) : (
                <>
                    <span style={{ flex: 1, fontSize: "0.92rem", fontWeight: "500" }}>{cond.label}</span>
                    <button onClick={() => setEditing(true)} style={iconBtn}><Pencil size={14} /></button>
                    <button onClick={() => onDelete(cond.id)} style={{ ...iconBtn, color: "var(--state-critical)" }}><Trash2 size={14} /></button>
                </>
            )}
        </div>
    );
}

function MaterialConseilSuggestionRow({ label, onAccept, onDismiss, accepting }) {
    return (
        <div style={{
            ...rowStyle,
            background: "rgba(229, 255, 188, 0.35)",
            border: "1px solid rgba(46, 125, 50, 0.25)",
            flexWrap: "wrap",
        }}>
            <span style={{ flex: "1 1 200px", fontSize: "0.88rem", lineHeight: 1.45 }}>
                Le matériau « <strong style={{ color: "var(--text-main)" }}>{label}</strong> » a été saisi dans un conseil mais n&apos;est pas dans cette liste.
                L&apos;ajouter ici pour qu&apos;il soit proposé dans les futurs formulaires de conseils ?
            </span>
            <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                <button
                    type="button"
                    onClick={() => onAccept(label)}
                    disabled={accepting}
                    style={{
                        ...iconBtn,
                        width: "auto",
                        padding: "0.4rem 0.85rem",
                        background: "var(--forest-deep)",
                        color: "white",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                    }}
                >
                    {accepting ? <Loader2 size={14} style={spinStyle} /> : "Oui"}
                </button>
                <button
                    type="button"
                    onClick={() => onDismiss(label)}
                    disabled={accepting}
                    style={{
                        ...iconBtn,
                        width: "auto",
                        padding: "0.4rem 0.85rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                    }}
                >
                    Non
                </button>
            </div>
        </div>
    );
}

function ServiceCategoryRow({ category, onSave, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({
        name: category.name || "",
        description: category.description || "",
        status: category.status || "actif",
    });
    const [saving, setSaving] = useState(false);

    const commit = async () => {
        const name = draft.name.trim();
        if (!name) return;
        setSaving(true);
        await onSave({
            ...category,
            name,
            description: draft.description.trim(),
            status: draft.status,
        });
        setSaving(false);
        setEditing(false);
    };

    const cancel = () => {
        setDraft({
            name: category.name || "",
            description: category.description || "",
            status: category.status || "actif",
        });
        setEditing(false);
    };

    const handleDelete = () => {
        const linked = Number(category.linkedServices || 0);
        if (linked > 0) {
            window.alert(`La catégorie « ${category.name} » possède encore ${linked} prestation(s) liée(s). Suppression impossible.`);
            return;
        }
        if (window.confirm(`Supprimer la catégorie « ${category.name} » ?`)) {
            onDelete(category.id);
        }
    };

    return (
        <div style={{ ...rowStyle, flexWrap: editing ? "wrap" : "nowrap" }}>
            <span style={gripStyle}><GripVertical size={16} /></span>
            {editing ? (
                <>
                    <input
                        autoFocus
                        value={draft.name}
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        placeholder="Nom"
                        style={{ ...textInput, flex: "1 1 140px", minWidth: "120px" }}
                    />
                    <input
                        value={draft.description}
                        onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                        placeholder="Description (facultatif)"
                        style={{ ...textInput, flex: "2 1 180px", minWidth: "140px" }}
                    />
                    <select
                        value={draft.status}
                        onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                        style={{ ...textInput, flex: "0 0 100px" }}
                    >
                        <option value="actif">actif</option>
                        <option value="inactif">inactif</option>
                    </select>
                    <button onClick={commit} disabled={saving || !draft.name.trim()} style={{ ...iconBtn, background: "var(--forest-deep)", color: "white" }}>
                        {saving ? <Loader2 size={14} style={spinStyle} /> : <Check size={14} />}
                    </button>
                    <button onClick={cancel} style={iconBtn}><X size={14} /></button>
                </>
            ) : (
                <>
                    <span style={{ flex: 1, fontSize: "0.92rem", fontWeight: "500", minWidth: 0 }}>{category.name}</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "28%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={category.description || ""}>
                        {category.description || "—"}
                    </span>
                    <span style={{ fontSize: "0.78rem", background: category.status === "actif" ? "#E5FFBC" : "#E6EDEE", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                        {category.status}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {category.linkedServices || 0} prest.
                    </span>
                    <button onClick={() => setEditing(true)} style={iconBtn}><Pencil size={14} /></button>
                    <button onClick={handleDelete} style={{ ...iconBtn, color: "var(--state-critical)" }}><Trash2 size={14} /></button>
                </>
            )}
        </div>
    );
}

function MaterialRow({ material, onSave, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({
        label: material.label,
        impactCoefficient: String(material.impactCoefficient ?? 1),
    });
    const [saving, setSaving] = useState(false);

    const commit = async () => {
        const label = draft.label.trim();
        if (!label) return;
        const parsed = Number.parseFloat(String(draft.impactCoefficient).replace(",", "."));
        if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000) return;
        setSaving(true);
        await onSave({ ...material, label, impactCoefficient: parsed });
        setSaving(false);
        setEditing(false);
    };

    const cancel = () => {
        setDraft({
            label: material.label,
            impactCoefficient: String(material.impactCoefficient ?? 1),
        });
        setEditing(false);
    };

    return (
        <div style={rowStyle}>
            <span style={gripStyle}><GripVertical size={16} /></span>
            {editing ? (
                <>
                    <input
                        autoFocus
                        value={draft.label}
                        onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
                        style={{ ...textInput, flex: 1 }}
                    />
                    <input
                        type="number"
                        min="0.001"
                        max="1000"
                        step="0.001"
                        value={draft.impactCoefficient}
                        onChange={e => setDraft(d => ({ ...d, impactCoefficient: e.target.value }))}
                        style={{ ...textInput, width: "90px", textAlign: "right" }}
                    />
                    <button onClick={commit} disabled={saving} style={{ ...iconBtn, background: "var(--forest-deep)", color: "white" }}>
                        {saving ? <Loader2 size={14} style={spinStyle} /> : <Check size={14} />}
                    </button>
                    <button onClick={cancel} style={iconBtn}><X size={14} /></button>
                </>
            ) : (
                <>
                    <span style={{ flex: 1, fontSize: "0.92rem", fontWeight: "500" }}>{material.label}</span>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-main)", background: "rgba(35,59,61,0.08)", padding: "3px 9px", borderRadius: "12px", fontWeight: "600" }}>
                        coeff. {Number(material.impactCoefficient ?? 1).toFixed(2)}
                    </span>
                    <button onClick={() => setEditing(true)} style={iconBtn}><Pencil size={14} /></button>
                    <button onClick={() => onDelete(material.id)} style={{ ...iconBtn, color: "var(--state-critical)" }}><Trash2 size={14} /></button>
                </>
            )}
        </div>
    );
}

function LanguageRow({ language, onEdit, onToggle, onDelete, toggling }) {
    const totalRules = Number(language.phraseCount || 0) + Number(language.patternCount || 0);
    const codeLabel = String(language.code || "").toUpperCase();
    const cacheLabel = `${totalRules} texte${totalRules > 1 ? "s" : ""} en cache`;

    return (
        <div style={{ ...rowStyle, alignItems: "flex-start", flexWrap: "wrap" }}>
            <span style={{
                width: "42px",
                minWidth: "42px",
                padding: "0.35rem 0",
                borderRadius: "10px",
                background: "rgba(35,59,61,0.08)",
                color: "var(--text-main)",
                textAlign: "center",
                fontSize: "0.76rem",
                fontWeight: 700,
                letterSpacing: "0",
            }}>
                {codeLabel}
            </span>
            <div style={{ flex: "1 1 150px", minWidth: 0, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <span style={{ fontSize: "0.92rem", fontWeight: "600", color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {language.nativeLabel}
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {language.label} · {language.dir === "rtl" ? "RTL" : "LTR"}
                </span>
            </div>
            <span style={{
                fontSize: "0.76rem",
                color: "var(--text-muted)",
                background: "rgba(35,59,61,0.06)",
                padding: "0.25rem 0.55rem",
                borderRadius: "10px",
                whiteSpace: "nowrap",
            }}>
                {language.isBuiltin ? `Intégrée · ${cacheLabel}` : cacheLabel}
            </span>
            <label style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                color: language.isBuiltin ? "var(--text-muted)" : "var(--text-main)",
                cursor: language.isBuiltin ? "not-allowed" : "pointer",
                marginTop: "0.35rem",
            }}>
                <input
                    type="checkbox"
                    checked={language.enabled !== false}
                    disabled={language.isBuiltin || toggling}
                    onChange={(e) => onToggle(language, e.target.checked)}
                    style={{ width: "15px", height: "15px", accentColor: "var(--forest-deep)" }}
                />
                Active
            </label>
            <button type="button" title="Modifier" onClick={() => onEdit(language)} style={iconBtn}>
                <Pencil size={14} />
            </button>
            {!language.isBuiltin && (
                <button type="button" title="Supprimer" onClick={() => onDelete(language)} style={{ ...iconBtn, color: "var(--state-critical)" }}>
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
}

// ── Styles partagés ───────────────────────────────────────────────────────────
const rowStyle = { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "#FFFFFF", borderRadius: "16px", transition: "box-shadow 0.15s ease" };
const gripStyle = { color: "var(--text-muted)", opacity: 0.35, cursor: "grab", flexShrink: 0 };
const iconBtn = { border: "none", background: "var(--surface-hover)", borderRadius: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-main)", flexShrink: 0, transition: "background 0.15s ease" };
const emojiInput = { width: "44px", padding: "0.4rem", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "1.2rem", textAlign: "center", outline: "none", background: "var(--surface-hover)", fontFamily: emojiFontFamily };
const textInput = { padding: "0.4rem 0.75rem", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "0.9rem", outline: "none", fontFamily: "inherit" };
const spinStyle = { animation: "spin 1s linear infinite" };

// ── Section réutilisable ──────────────────────────────────────────────────────
function ConfigSection({ icon: Icon, title, description, count, loading, children, onAdd, addLabel = "Nouvel élément" }) {
    return (
        <section style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                <Icon size={18} strokeWidth={2} style={{ color: "var(--forest-deep)" }} />
                <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-main)" }}>{title}</h2>
            </div>
            {description && (
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0", lineHeight: 1.4 }}>{description}</p>
            )}
            <div style={{ background: "var(--surface-hover)", borderRadius: "24px", padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {loading ? "Chargement..." : <><strong style={{ color: "var(--text-main)" }}>{count}</strong> élément{count > 1 ? "s" : ""}</>}
                    </span>
                    <button onClick={onAdd} style={{ border: "none", background: "var(--black)", color: "white", borderRadius: "12px", padding: "0.5rem 1rem", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit", fontWeight: "500", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Plus size={14} />{addLabel}
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {loading ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}><Loader2 size={20} style={spinStyle} /></div>
                    ) : count === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>Aucun élément. Ajoutez-en un ci-dessus.</div>
                    ) : children}
                </div>

            </div>
        </section>
    );
}

// ── Composant Génération de Codes ─────────────────────────────────────────────
function CodeConfigSection() {
    const [config, setConfig] = useState({ length: 6, noAmbiguous: true, useSpecial: false, useSpaces: false });
    const [saving, setSaving] = useState(false);
    const [savedState, setSavedState] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await fetch(apiUrl("/admin/code-config"), { headers: buildAuthHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setConfig(data);
                }
            } catch (e) {
                console.error("Erreur chargement config codes", e);
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, []);

    const saveConfig = async () => {
        setSaving(true);
        try {
            const res = await fetch(apiUrl("/admin/code-config"), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(config)
            });
            if (res.ok) {
                setSavedState(true);
                setTimeout(() => setSavedState(false), 2000);
            } else {
                alert("Erreur lors de la sauvegarde.");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <section style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                    <QrCode size={18} strokeWidth={2} style={{ color: "var(--forest-deep)" }} />
                    <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-main)" }}>Codes d'autorisation</h2>
                </div>
                <div style={{ background: "var(--surface-hover)", borderRadius: "24px", padding: "1.5rem", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 size={24} style={spinStyle} />
                </div>
            </section>
        );
    }

    return (
        <section style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                <QrCode size={18} strokeWidth={2} style={{ color: "var(--forest-deep)" }} />
                <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-main)" }}>Codes d'autorisation</h2>
            </div>
            <div style={{ background: "var(--surface-hover)", borderRadius: "24px", padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                    Configurez le format des codes générés pour le dépôt et la récupération des objets.
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-main)" }}>Longueur du code</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input type="number" min={4} max={16} value={config.length} onChange={e => setConfig({...config, length: parseInt(e.target.value)||6})} style={{...textInput, width: "100px", textAlign: "center", fontWeight: "600"}} />
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>caractères</span>
                    </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", background: "rgba(255,255,255,0.6)", padding: "1rem", borderRadius: "16px", border: "1px solid rgba(35,59,61,0.06)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: "500", color: "var(--text-main)" }}>
                        <input type="checkbox" checked={config.noAmbiguous} onChange={e => setConfig({...config, noAmbiguous: e.target.checked})} style={{ width: "16px", height: "16px", accentColor: "var(--forest-deep)" }} />
                        Exclure "0, O, 1, I" (ambigus)
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: "500", color: "var(--text-main)" }}>
                        <input type="checkbox" checked={config.useSpecial} onChange={e => setConfig({...config, useSpecial: e.target.checked})} style={{ width: "16px", height: "16px", accentColor: "var(--forest-deep)" }} />
                        Inclure caractères spéciaux (!@#)
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: "500", color: "var(--text-main)" }}>
                        <input type="checkbox" checked={config.useSpaces} onChange={e => setConfig({...config, useSpaces: e.target.checked})} style={{ width: "16px", height: "16px", accentColor: "var(--forest-deep)" }} />
                        Regrouper avec des espaces (ex: ABC 123)
                    </label>
                </div>

                <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
                    <button onClick={saveConfig} disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "0.75rem", borderRadius: "14px", background: savedState ? "#10b981" : "var(--black)", color: "white", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", transition: "background 0.2s" }}>
                        {saving ? <Loader2 size={16} style={spinStyle} /> : (savedState ? <Check size={16} /> : <Check size={16} />)}
                        {savedState ? "Enregistré" : "Enregistrer format"}
                    </button>
                </div>
            </div>
        </section>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ConfigurationPage() {
    // Catégories
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(true);
    const [addCatModal, setAddCatModal] = useState(false);
    const [newCat, setNewCat] = useState({ label: "", emoji: "📦" });
    const [addingCat, setAddingCat] = useState(false);

    // États / conditions
    const [conditions, setConditions] = useState([]);
    const [condLoading, setCondLoading] = useState(true);
    const [addCondModal, setAddCondModal] = useState(false);
    const [newCond, setNewCond] = useState({ label: "" });
    const [addingCond, setAddingCond] = useState(false);

    // Matériaux
    const [materials, setMaterials] = useState([]);
    const [matLoading, setMatLoading] = useState(true);
    const [addMatModal, setAddMatModal] = useState(false);
    const [newMat, setNewMat] = useState({ label: "", impactCoefficient: "1" });
    const [addingMat, setAddingMat] = useState(false);
    const [conseilMaterialSuggestions, setConseilMaterialSuggestions] = useState([]);
    const [dismissedMaterialSuggestions, setDismissedMaterialSuggestions] = useState(new Set());
    const [acceptingMaterialSuggestion, setAcceptingMaterialSuggestion] = useState("");

    // Pays
    const [countries, setCountries] = useState([]);
    const [countryLoading, setCountryLoading] = useState(true);
    const [addCountryModal, setAddCountryModal] = useState(false);
    const [newCountry, setNewCountry] = useState({ label: "", emoji: "🌍", zip_length: 5 });
    const [addingCountry, setAddingCountry] = useState(false);

    // Types de points de dépôt
    const [dpTypes, setDpTypes] = useState([]);
    const [dpTypeLoading, setDpTypeLoading] = useState(true);
    const [addDpTypeModal, setAddDpTypeModal] = useState(false);
    const [newDpType, setNewDpType] = useState({ label: "" });
    const [addingDpType, setAddingDpType] = useState(false);

    // Catégories de prestations
    const [serviceCategories, setServiceCategories] = useState([]);
    const [serviceCatLoading, setServiceCatLoading] = useState(true);
    const [addServiceCatModal, setAddServiceCatModal] = useState(false);
    const [newServiceCat, setNewServiceCat] = useState({ name: "", description: "", status: "actif" });
    const [addingServiceCat, setAddingServiceCat] = useState(false);

    // Catégories de conseils
    const [conseilCategories, setConseilCategories] = useState([]);
    const [conseilCatLoading, setConseilCatLoading] = useState(true);
    const [addConseilCatModal, setAddConseilCatModal] = useState(false);
    const [newConseilCat, setNewConseilCat] = useState({ label: "" });
    const [addingConseilCat, setAddingConseilCat] = useState(false);

    // Motifs de moderation
    const [moderationReasons, setModerationReasons] = useState([]);
    const [reasonLoading, setReasonLoading] = useState(true);
    const [addReasonModal, setAddReasonModal] = useState(false);
    const [newReason, setNewReason] = useState({ label: "" });
    const [addingReason, setAddingReason] = useState(false);

    // Langues de l'interface
    const [interfaceLanguages, setInterfaceLanguages] = useState([]);
    const [languageLoading, setLanguageLoading] = useState(true);
    const [languageModalOpen, setLanguageModalOpen] = useState(false);
    const [editingLanguage, setEditingLanguage] = useState(null);
    const [languageDraft, setLanguageDraft] = useState(getEmptyLanguageDraft);
    const [savingLanguage, setSavingLanguage] = useState(false);
    const [togglingLanguageCode, setTogglingLanguageCode] = useState("");

    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

    const notifyI18nRefresh = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(I18N_REFRESH_EVENT));
        }
    };

    useEffect(() => {
        setDismissedMaterialSuggestions(loadDismissedConseilMaterialSuggestions());
    }, []);

    const visibleMaterialSuggestions = filterVisibleConseilMaterialSuggestions(
        conseilMaterialSuggestions,
        dismissedMaterialSuggestions
    );

    // ── Fetch catégories
    const fetchCategories = useCallback(async () => {
        setCatLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/item-categories"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setCategories((data.items || []).map(cat => ({ ...cat, emoji: normalizeEmoji(cat.emoji, "📦") })));
        } catch { showToast("Impossible de charger les catégories.", "error"); }
        finally { setCatLoading(false); }
    }, []);

    // ── Fetch états
    const fetchConditions = useCallback(async () => {
        setCondLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/item-conditions"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setConditions(data.items || []);
        } catch { showToast("Impossible de charger les états.", "error"); }
        finally { setCondLoading(false); }
    }, []);

    // ── Fetch matériaux
    const fetchMaterials = useCallback(async () => {
        setMatLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/item-materials"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setMaterials(data.items || []);
            setConseilMaterialSuggestions(data.conseilSuggestions || []);
        } catch { showToast("Impossible de charger les matériaux.", "error"); }
        finally { setMatLoading(false); }
    }, []);

    // ── Fetch pays
    const fetchCountries = useCallback(async () => {
        setCountryLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/item-countries"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setCountries((data.items || []).map(country => ({ ...country, emoji: normalizeEmoji(country.emoji, "🌍") })));
        } catch { showToast("Impossible de charger les pays.", "error"); }
        finally { setCountryLoading(false); }
    }, []);

    // ── Fetch types de points
    const fetchDpTypes = useCallback(async () => {
        setDpTypeLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/deposit-point-types"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setDpTypes(data.items || []);
        } catch { showToast("Impossible de charger les types de points.", "error"); }
        finally { setDpTypeLoading(false); }
    }, []);

    // ── Fetch catégories de prestations
    const fetchServiceCategories = useCallback(async () => {
        setServiceCatLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/service-categories"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setServiceCategories(data.items || []);
        } catch { showToast("Impossible de charger les catégories de prestations.", "error"); }
        finally { setServiceCatLoading(false); }
    }, []);

    // ── Fetch catégories de conseils
    const fetchConseilCategories = useCallback(async () => {
        setConseilCatLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/conseil-categories"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setConseilCategories(data.items || []);
        } catch { showToast("Impossible de charger les catégories de conseils.", "error"); }
        finally { setConseilCatLoading(false); }
    }, []);

    // ── Fetch motifs de moderation
    const fetchModerationReasons = useCallback(async () => {
        setReasonLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/moderation-reasons"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setModerationReasons(data.items || []);
        } catch { showToast("Impossible de charger les motifs de moderation.", "error"); }
        finally { setReasonLoading(false); }
    }, []);

    // ── Fetch langues de l'interface
    const fetchInterfaceLanguages = useCallback(async () => {
        setLanguageLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/i18n/languages"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setInterfaceLanguages(data.items || []);
        } catch {
            showToast("Impossible de charger les langues.", "error");
        } finally {
            setLanguageLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
        fetchConditions();
        fetchMaterials();
        fetchCountries();
        fetchDpTypes();
        fetchServiceCategories();
        fetchConseilCategories();
        fetchModerationReasons();
        fetchInterfaceLanguages();
    }, [fetchCategories, fetchConditions, fetchMaterials, fetchCountries, fetchDpTypes, fetchServiceCategories, fetchConseilCategories, fetchModerationReasons, fetchInterfaceLanguages]);

    // Recharger les suggestions après publication d'un conseil (autre onglet / retour sur la page).
    useEffect(() => {
        const refreshMaterials = () => {
            if (document.visibilityState === "visible") fetchMaterials();
        };
        document.addEventListener("visibilitychange", refreshMaterials);
        window.addEventListener("focus", refreshMaterials);
        return () => {
            document.removeEventListener("visibilitychange", refreshMaterials);
            window.removeEventListener("focus", refreshMaterials);
        };
    }, [fetchMaterials]);

    // ── CRUD catégories
    const handleSaveCat = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-categories/${updated.id}`), { method: "PUT", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: updated.label, emoji: updated.emoji }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            const normalized = { ...saved, emoji: normalizeEmoji(saved.emoji, "📦") };
            setCategories(prev => prev.map(c => c.id === normalized.id ? normalized : c));
            showToast("Catégorie mise à jour.");
        } catch (e) { showToast(e.message || "Erreur de mise à jour.", "error"); }
    };
    const handleDeleteCat = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-categories/${id}`), { method: "DELETE", headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            setCategories(prev => prev.filter(c => c.id !== id));
            showToast("Catégorie supprimée.");
        } catch { showToast("Impossible de supprimer.", "error"); }
    };
    const handleAddCat = async () => {
        if (!newCat.label.trim()) return;
        setAddingCat(true);
        try {
            const res = await fetch(apiUrl("/admin/item-categories"), { method: "POST", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: newCat.label.trim(), emoji: newCat.emoji.trim() || "📦" }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setCategories(prev => [...prev, { ...created, emoji: normalizeEmoji(created.emoji, "📦") }]);
            setNewCat({ label: "", emoji: "📦" });
            setAddCatModal(false);
            showToast("Catégorie ajoutée.");
        } catch (e) { showToast(e.message === "category label already exists" ? "Libellé déjà utilisé." : "Impossible de créer.", "error"); }
        finally { setAddingCat(false); }
    };

    // ── CRUD états
    const handleSaveCond = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-conditions/${updated.id}`), { method: "PUT", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: updated.label }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            setConditions(prev => prev.map(c => c.id === saved.id ? saved : c));
            showToast("État mis à jour.");
        } catch (e) { showToast(e.message || "Erreur de mise à jour.", "error"); }
    };
    const handleDeleteCond = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-conditions/${id}`), { method: "DELETE", headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            setConditions(prev => prev.filter(c => c.id !== id));
            showToast("État supprimé.");
        } catch { showToast("Impossible de supprimer.", "error"); }
    };
    const handleAddCond = async () => {
        if (!newCond.label.trim()) return;
        setAddingCond(true);
        try {
            const res = await fetch(apiUrl("/admin/item-conditions"), { method: "POST", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: newCond.label.trim() }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setConditions(prev => [...prev, created]);
            setNewCond({ label: "" });
            setAddCondModal(false);
            showToast("État ajouté.");
        } catch (e) { showToast(e.message === "condition label already exists" ? "Libellé déjà utilisé." : "Impossible de créer.", "error"); }
        finally { setAddingCond(false); }
    };

    // ── CRUD matériaux
    const handleSaveMat = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-materials/${updated.id}`), { method: "PUT", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: updated.label, impactCoefficient: updated.impactCoefficient }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            setMaterials(prev => prev.map(m => m.id === saved.id ? saved : m));
            showToast("Matériau mis à jour.");
        } catch (e) { showToast(e.message || "Erreur de mise à jour.", "error"); }
    };
    const handleDeleteMat = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-materials/${id}`), { method: "DELETE", headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            setMaterials(prev => prev.filter(m => m.id !== id));
            showToast("Matériau supprimé.");
        } catch { showToast("Impossible de supprimer.", "error"); }
    };
    const handleDismissMaterialSuggestion = (label) => {
        dismissConseilMaterialSuggestion(label);
        setDismissedMaterialSuggestions(loadDismissedConseilMaterialSuggestions());
    };

    const handleAcceptMaterialSuggestion = async (label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        setAcceptingMaterialSuggestion(trimmed);
        const suggestionKey = materialSuggestionKey(trimmed);

        const removeSuggestionFromList = () => {
            setConseilMaterialSuggestions((prev) =>
                prev.filter((l) => materialSuggestionKey(l) !== suggestionKey)
            );
        };

        try {
            const res = await fetch(apiUrl("/admin/item-materials"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ label: trimmed, impactCoefficient: 1 }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                if (data?.id) {
                    setMaterials((prev) =>
                        prev.some((m) => m.id === data.id) ? prev : [...prev, data]
                    );
                } else {
                    await fetchMaterials();
                }
                removeSuggestionFromList();
                showToast(`« ${trimmed} » ajouté au référentiel.`);
                return;
            }

            if (res.status === 409 || data.error === "material label already exists") {
                removeSuggestionFromList();
                await fetchMaterials();
                showToast(`« ${trimmed} » est déjà dans le référentiel.`);
                return;
            }

            throw new Error(data.error || "Impossible d'ajouter.");
        } catch (e) {
            const msg = String(e?.message || "").trim();
            const isDuplicate = msg === "material label already exists";
            if (isDuplicate) {
                removeSuggestionFromList();
                await fetchMaterials();
                showToast(`« ${trimmed} » est déjà dans le référentiel.`);
            } else {
                showToast(msg || "Impossible d'ajouter.", "error");
                await fetchMaterials();
            }
        } finally {
            setAcceptingMaterialSuggestion("");
        }
    };

    const handleAddMat = async () => {
        if (!newMat.label.trim()) return;
        const parsed = Number.parseFloat(String(newMat.impactCoefficient).replace(",", "."));
        if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000) {
            showToast("Coefficient invalide (0 < coeff <= 1000).", "error");
            return;
        }
        setAddingMat(true);
        try {
            const res = await fetch(apiUrl("/admin/item-materials"), { method: "POST", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: newMat.label.trim(), impactCoefficient: parsed }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setMaterials(prev => [...prev, created]);
            setNewMat({ label: "", impactCoefficient: "1" });
            setAddMatModal(false);
            showToast("Matériau ajouté.");
        } catch (e) { showToast(e.message === "material label already exists" ? "Libellé déjà utilisé." : "Impossible de créer.", "error"); }
        finally { setAddingMat(false); }
    };

    // ── CRUD pays
    const handleSaveCountry = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-countries/${updated.id}`), { method: "PUT", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: updated.label, emoji: updated.emoji, zip_length: updated.zip_length }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            const normalized = { ...saved, emoji: normalizeEmoji(saved.emoji, "🌍") };
            setCountries(prev => prev.map(c => c.id === normalized.id ? normalized : c));
            showToast("Pays mis à jour.");
        } catch (e) { showToast(e.message || "Erreur de mise à jour.", "error"); }
    };
    const handleDeleteCountry = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-countries/${id}`), { method: "DELETE", headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            setCountries(prev => prev.filter(c => c.id !== id));
            showToast("Pays supprimé.");
        } catch { showToast("Impossible de supprimer.", "error"); }
    };
    const handleAddCountry = async () => {
        if (!newCountry.label.trim()) return;
        setAddingCountry(true);
        try {
            const res = await fetch(apiUrl("/admin/item-countries"), { method: "POST", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: newCountry.label.trim(), emoji: newCountry.emoji.trim() || "🌍", zip_length: parseInt(newCountry.zip_length, 10) }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setCountries(prev => [...prev, { ...created, emoji: normalizeEmoji(created.emoji, "🌍") }]);
            setNewCountry({ label: "", emoji: "🌍", zip_length: 5 });
            setAddCountryModal(false);
            showToast("Pays ajouté.");
        } catch (e) { showToast(e.message && e.message.includes("already exists") ? "Libellé déjà utilisé." : "Impossible de créer.", "error"); }
        finally { setAddingCountry(false); }
    };

    // ── CRUD types de points
    const handleSaveDPType = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/deposit-point-types/${updated.id}`), { method: "PUT", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: updated.label }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            setDpTypes(prev => prev.map(t => t.id === saved.id ? saved : t));
            showToast("Type de point mis à jour.");
        } catch (e) { showToast(e.message || "Erreur de mise à jour.", "error"); }
    };
    const handleDeleteDPType = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/deposit-point-types/${id}`), { method: "DELETE", headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            setDpTypes(prev => prev.filter(t => t.id !== id));
            showToast("Type de point supprimé.");
        } catch { showToast("Impossible de supprimer.", "error"); }
    };
    const handleAddDPType = async () => {
        if (!newDpType.label.trim()) return;
        setAddingDpType(true);
        try {
            const res = await fetch(apiUrl("/admin/deposit-point-types"), { method: "POST", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: newDpType.label.trim() }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setDpTypes(prev => [...prev, created]);
            setNewDpType({ label: "" });
            setAddDpTypeModal(false);
            showToast("Type de point ajouté.");
        } catch (e) { showToast(e.message && e.message.includes("already exists") ? "Libellé déjà utilisé." : "Impossible de créer.", "error"); }
        finally { setAddingDpType(false); }
    };

    // ── CRUD catégories de prestations
    const handleSaveServiceCat = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/service-categories/${updated.id}`), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    name: updated.name,
                    description: updated.description || "",
                    status: updated.status,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            setServiceCategories(prev => prev.map(c => c.id === saved.id ? saved : c));
            showToast("Catégorie de prestation mise à jour.");
        } catch (e) {
            showToast(e.message === "category already exists" ? "Nom déjà utilisé." : (e.message || "Erreur de mise à jour."), "error");
        }
    };
    const handleDeleteServiceCat = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/service-categories/${id}`), { method: "DELETE", headers: buildAuthHeaders() });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "");
            }
            setServiceCategories(prev => prev.filter(c => c.id !== id));
            showToast("Catégorie de prestation supprimée.");
        } catch (e) {
            showToast(e.message?.includes("linked") ? "Impossible : des prestations sont encore liées." : "Impossible de supprimer.", "error");
        }
    };
    const handleAddServiceCat = async () => {
        if (!newServiceCat.name.trim()) return;
        setAddingServiceCat(true);
        try {
            const res = await fetch(apiUrl("/admin/service-categories"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    name: newServiceCat.name.trim(),
                    description: newServiceCat.description.trim(),
                    status: newServiceCat.status,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setServiceCategories(prev => [...prev, created]);
            setNewServiceCat({ name: "", description: "", status: "actif" });
            setAddServiceCatModal(false);
            showToast("Catégorie de prestation ajoutée.");
        } catch (e) {
            showToast(e.message === "category already exists" ? "Nom déjà utilisé." : "Impossible de créer.", "error");
        } finally { setAddingServiceCat(false); }
    };

    // ── CRUD catégories de conseils
    const handleSaveConseilCat = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/conseil-categories/${updated.id}`), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ label: updated.label }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            setConseilCategories(prev => prev.map(c => c.id === saved.id ? { ...c, ...saved } : c));
            showToast("Catégorie de conseil mise à jour.");
        } catch (e) { showToast(e.message || "Erreur de mise à jour.", "error"); }
    };
    const handleDeleteConseilCat = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/conseil-categories/${id}`), { method: "DELETE", headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            setConseilCategories(prev => prev.filter(c => c.id !== id));
            showToast("Catégorie de conseil supprimée.");
        } catch { showToast("Impossible de supprimer.", "error"); }
    };
    const handleAddConseilCat = async () => {
        if (!newConseilCat.label.trim()) return;
        setAddingConseilCat(true);
        try {
            const res = await fetch(apiUrl("/admin/conseil-categories"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ label: newConseilCat.label.trim() }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setConseilCategories(prev => [...prev, created]);
            setNewConseilCat({ label: "" });
            setAddConseilCatModal(false);
            showToast("Catégorie de conseil ajoutée.");
        } catch (e) {
            showToast(e.message === "category label already exists" ? "Libellé déjà utilisé." : "Impossible de créer.", "error");
        } finally { setAddingConseilCat(false); }
    };

    // ── CRUD motifs de moderation
    const handleSaveReason = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/moderation-reasons/${updated.id}`), { method: "PUT", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: updated.label }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            setModerationReasons(prev => prev.map(r => r.id === saved.id ? saved : r));
            showToast("Motif de moderation mis a jour.");
        } catch (e) { showToast(e.message || "Erreur de mise a jour.", "error"); }
    };
    const handleDeleteReason = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/moderation-reasons/${id}`), { method: "DELETE", headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            setModerationReasons(prev => prev.filter(r => r.id !== id));
            showToast("Motif de moderation supprime.");
        } catch { showToast("Impossible de supprimer.", "error"); }
    };
    const handleAddReason = async () => {
        if (!newReason.label.trim()) return;
        setAddingReason(true);
        try {
            const res = await fetch(apiUrl("/admin/moderation-reasons"), { method: "POST", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: newReason.label.trim() }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setModerationReasons(prev => [...prev, created]);
            setNewReason({ label: "" });
            setAddReasonModal(false);
            showToast("Motif de moderation ajoute.");
        } catch (e) { showToast(e.message && e.message.includes("already exists") ? "Libellé déjà utilisé." : "Impossible de créer.", "error"); }
        finally { setAddingReason(false); }
    };

    // ── CRUD langues de l'interface
    const openLanguageCreateModal = () => {
        setEditingLanguage(null);
        setLanguageDraft(getEmptyLanguageDraft());
        setLanguageModalOpen(true);
    };

    const openLanguageEditModal = (language) => {
        setEditingLanguage(language);
        setLanguageDraft(languageToDraft(language));
        setLanguageModalOpen(true);
    };

    const closeLanguageModal = () => {
        if (savingLanguage) return;
        setLanguageModalOpen(false);
        setEditingLanguage(null);
        setLanguageDraft(getEmptyLanguageDraft());
    };

    const languageErrorMessage = (message) => {
        if (message === "language code already exists") return "Cette langue existe déjà.";
        if (message === "invalid locale code") return "Code de langue invalide.";
        if (message === "label and nativeLabel are required") return "Nom et nom natif sont obligatoires.";
        if (message === "builtin language cannot be deleted") return "Cette langue intégrée ne peut pas être supprimée.";
        return message || "Opération impossible.";
    };

    const saveLanguagePayload = async (language, method, path) => {
        const res = await fetch(apiUrl(path), {
            method,
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(language),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Opération impossible.");
        return data;
    };

    const handleSaveLanguage = async () => {
        const code = String(editingLanguage?.code || languageDraft.code || "").trim().toLowerCase().replaceAll("_", "-");
        const label = languageDraft.label.trim();
        const nativeLabel = languageDraft.nativeLabel.trim();
        if (!code || !label || !nativeLabel) {
            showToast("Code, nom et nom natif sont obligatoires.", "error");
            return;
        }

        setSavingLanguage(true);
        try {
            const payload = {
                code,
                label,
                nativeLabel,
                dir: languageDraft.dir === "rtl" ? "rtl" : "ltr",
                enabled: Boolean(languageDraft.enabled),
                phrases: languageDraft.phrases || {},
                patterns: Array.isArray(languageDraft.patterns) ? languageDraft.patterns : [],
            };
            const isEditing = Boolean(editingLanguage);
            const saved = await saveLanguagePayload(
                payload,
                isEditing ? "PUT" : "POST",
                isEditing ? `/admin/i18n/languages/${encodeURIComponent(code)}` : "/admin/i18n/languages"
            );

            setInterfaceLanguages((prev) => {
                const next = isEditing
                    ? prev.map((language) => language.code === saved.code ? saved : language)
                    : [...prev, saved];
                return next.sort((a, b) => {
                    const order = { fr: 0, en: 1, es: 2 };
                    return (order[a.code] ?? 3) - (order[b.code] ?? 3) || a.code.localeCompare(b.code);
                });
            });
            notifyI18nRefresh();
            setLanguageModalOpen(false);
            setEditingLanguage(null);
            setLanguageDraft(getEmptyLanguageDraft());
            showToast(isEditing ? "Langue mise à jour." : "Langue ajoutée.");
        } catch (e) {
            showToast(languageErrorMessage(e.message), "error");
        } finally {
            setSavingLanguage(false);
        }
    };

    const handleToggleLanguage = async (language, enabled) => {
        if (language.isBuiltin) return;
        setTogglingLanguageCode(language.code);
        try {
            const payload = {
                code: language.code,
                label: language.label,
                nativeLabel: language.nativeLabel,
                dir: language.dir === "rtl" ? "rtl" : "ltr",
                enabled,
                phrases: language.phrases || {},
                patterns: Array.isArray(language.patterns) ? language.patterns : [],
            };
            const saved = await saveLanguagePayload(payload, "PUT", `/admin/i18n/languages/${encodeURIComponent(language.code)}`);
            setInterfaceLanguages((prev) => prev.map((item) => item.code === saved.code ? saved : item));
            notifyI18nRefresh();
            showToast(enabled ? "Langue activée." : "Langue désactivée.");
        } catch (e) {
            showToast(languageErrorMessage(e.message), "error");
        } finally {
            setTogglingLanguageCode("");
        }
    };

    const handleDeleteLanguage = async (language) => {
        if (language.isBuiltin) return;
        if (!window.confirm(`Supprimer la langue « ${language.nativeLabel || language.code} » ?`)) return;
        try {
            const res = await fetch(apiUrl(`/admin/i18n/languages/${encodeURIComponent(language.code)}`), {
                method: "DELETE",
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Suppression impossible.");
            setInterfaceLanguages((prev) => prev.filter((item) => item.code !== language.code));
            notifyI18nRefresh();
            showToast("Langue supprimée.");
        } catch (e) {
            showToast(languageErrorMessage(e.message), "error");
        }
    };

    const languageCacheStats = {
        phrases: Object.keys(languageDraft.phrases || {}).length,
        patterns: Array.isArray(languageDraft.patterns) ? languageDraft.patterns.length : 0,
    };

    return (
        <div style={{ width: "100%", padding: "1rem 3rem 4rem 1rem", animation: "fadeIn 0.4s ease-out", maxWidth: "100%" }}>

            <header style={{ marginBottom: "2.5rem" }}>
                <p className="activities-label">Paramètres</p>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.5rem 0 0.5rem", letterSpacing: "-0.02em" }}>Configuration</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Gérez les réglages globaux de la plateforme UpcycleConnect.</p>
            </header>

            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(3, 1fr)", 
                gap: "2rem",
                alignItems: "stretch"
            }}>
                {/* ── Langues de l'interface ── */}
                <ConfigSection
                    icon={Languages}
                    title="Langues de l'interface"
                    addLabel="Nouvelle langue"
                    description="Ajoutez une langue, DeepL traduit automatiquement les pages via l'API et le cache est stocké en base."
                    count={interfaceLanguages.length}
                    loading={languageLoading}
                    onAdd={openLanguageCreateModal}
                >
                    {interfaceLanguages.map(language => (
                        <LanguageRow
                            key={language.code}
                            language={language}
                            onEdit={openLanguageEditModal}
                            onToggle={handleToggleLanguage}
                            onDelete={handleDeleteLanguage}
                            toggling={togglingLanguageCode === language.code}
                        />
                    ))}
                </ConfigSection>

                {/* ── Catégories d'objets ── */}
                <ConfigSection
                    icon={Package} title="Catégories d'objets" addLabel="Nouvelle catégorie"
                    count={categories.length} loading={catLoading} onAdd={() => setAddCatModal(true)}
                >
                    {categories.map(cat => <CategoryRow key={cat.id} cat={cat} onSave={handleSaveCat} onDelete={handleDeleteCat} />)}
                </ConfigSection>

                {/* ── États des objets ── */}
                <ConfigSection
                    icon={Shield} title="États des objets" addLabel="Nouvel état"
                    count={conditions.length} loading={condLoading} onAdd={() => setAddCondModal(true)}
                >
                    {conditions.map(cond => <ConditionRow key={cond.id} cond={cond} onSave={handleSaveCond} onDelete={handleDeleteCond} />)}
                </ConfigSection>

                {/* ── Matériaux des objets ── */}
                <ConfigSection
                    icon={Layers} title="Matériaux des objets" addLabel="Nouveau matériau"
                    description="Liste proposée dans les formulaires de conseils. Les matériaux saisis à la main dans un conseil apparaissent ci-dessous pour ajout éventuel."
                    count={materials.length} loading={matLoading} onAdd={() => setAddMatModal(true)}
                >
                    {visibleMaterialSuggestions.map((label) => (
                        <MaterialConseilSuggestionRow
                            key={`suggestion-${label}`}
                            label={label}
                            onAccept={handleAcceptMaterialSuggestion}
                            onDismiss={handleDismissMaterialSuggestion}
                            accepting={acceptingMaterialSuggestion === label}
                        />
                    ))}
                    {materials.map(mat => <MaterialRow key={mat.id} material={mat} onSave={handleSaveMat} onDelete={handleDeleteMat} />)}
                </ConfigSection>

                {/* ── Catégories de conseils ── */}
                <ConfigSection
                    icon={Lightbulb} title="Catégories de conseils" addLabel="Nouvelle catégorie"
                    count={conseilCategories.length} loading={conseilCatLoading} onAdd={() => setAddConseilCatModal(true)}
                >
                    {conseilCategories.map(cat => (
                        <ConditionRow key={cat.id} cond={cat} onSave={handleSaveConseilCat} onDelete={handleDeleteConseilCat} />
                    ))}
                </ConfigSection>

                {/* ── Pays supportés ── */}
                <ConfigSection
                    icon={MapPin} title="Pays supportés" addLabel="Nouveau pays"
                    count={countries.length} loading={countryLoading} onAdd={() => setAddCountryModal(true)}
                >
                    {countries.map(country => <CountryRow key={country.id} item={country} onSave={handleSaveCountry} onDelete={handleDeleteCountry} />)}
                </ConfigSection>

                {/* ── Types de points de dépôt ── */}
                <ConfigSection
                    icon={MapPin} title="Types de points de dépôt" addLabel="Nouveau type"
                    count={dpTypes.length} loading={dpTypeLoading} onAdd={() => setAddDpTypeModal(true)}
                >
                    {dpTypes.map(t => <ConditionRow key={t.id} cond={t} onSave={handleSaveDPType} onDelete={handleDeleteDPType} />)}
                </ConfigSection>

                <ConfigSection
                    icon={Shield} title="Motifs de modération" addLabel="Nouveau motif"
                    count={moderationReasons.length} loading={reasonLoading} onAdd={() => setAddReasonModal(true)}
                >
                    {moderationReasons.map(reason => <ConditionRow key={reason.id} cond={reason} onSave={handleSaveReason} onDelete={handleDeleteReason} />)}
                </ConfigSection>

                {/* ── Génération de Codes ── */}
                <CodeConfigSection />
            </div>

            {/* ── Modal ajout catégorie ── */}
            <AdminModal open={addCatModal} title="Nouvelle catégorie" onClose={() => { setAddCatModal(false); setNewCat({ label: "", emoji: "📦" }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Emoji</label>
                            <input value={newCat.emoji} onChange={e => setNewCat(d => ({ ...d, emoji: e.target.value }))} maxLength={EMOJI_MAX_LENGTH} style={{ width: "56px", padding: "0.6rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "1.4rem", textAlign: "center", outline: "none", background: "var(--surface-hover)", fontFamily: emojiFontFamily }} />
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Nom *</label>
                            <input autoFocus placeholder="Ex : Textile, Livres..." value={newCat.label} onChange={e => setNewCat(d => ({ ...d, label: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleAddCat(); }}
                                style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddCatModal(false); setNewCat({ label: "", emoji: "📦" }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
                        <button onClick={handleAddCat} disabled={!newCat.label.trim() || addingCat}
                            style={{ border: "none", background: newCat.label.trim() ? "var(--black)" : "var(--border)", color: newCat.label.trim() ? "white" : "var(--text-muted)", borderRadius: "12px", padding: "0.6rem 1.4rem", cursor: newCat.label.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {addingCat ? <Loader2 size={14} style={spinStyle} /> : <Plus size={14} />} Ajouter
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Modal ajout état ── */}
            <AdminModal open={addCondModal} title="Nouvel état" onClose={() => { setAddCondModal(false); setNewCond({ label: "" }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Libellé *</label>
                        <input autoFocus placeholder="Ex : Reconditionné, Endommagé..." value={newCond.label} onChange={e => setNewCond({ label: e.target.value })} onKeyDown={e => { if (e.key === "Enter") handleAddCond(); }}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddCondModal(false); setNewCond({ label: "" }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
                        <button onClick={handleAddCond} disabled={!newCond.label.trim() || addingCond}
                            style={{ border: "none", background: newCond.label.trim() ? "var(--black)" : "var(--border)", color: newCond.label.trim() ? "white" : "var(--text-muted)", borderRadius: "12px", padding: "0.6rem 1.4rem", cursor: newCond.label.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {addingCond ? <Loader2 size={14} style={spinStyle} /> : <Plus size={14} />} Ajouter
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Modal ajout catégorie de prestation ── */}
            <AdminModal open={addServiceCatModal} title="Nouvelle catégorie de prestation" onClose={() => { setAddServiceCatModal(false); setNewServiceCat({ name: "", description: "", status: "actif" }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Nom *</label>
                        <input autoFocus placeholder="Ex : Atelier textile, Réparation…" value={newServiceCat.name} onChange={e => setNewServiceCat(d => ({ ...d, name: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleAddServiceCat(); }}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Description</label>
                        <textarea placeholder="Description courte (facultatif)" value={newServiceCat.description} onChange={e => setNewServiceCat(d => ({ ...d, description: e.target.value }))} rows={2}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)", resize: "vertical" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Statut</label>
                        <select value={newServiceCat.status} onChange={e => setNewServiceCat(d => ({ ...d, status: e.target.value }))}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }}>
                            <option value="actif">actif</option>
                            <option value="inactif">inactif</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddServiceCatModal(false); setNewServiceCat({ name: "", description: "", status: "actif" }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
                        <button onClick={handleAddServiceCat} disabled={!newServiceCat.name.trim() || addingServiceCat}
                            style={{ border: "none", background: newServiceCat.name.trim() ? "var(--black)" : "var(--border)", color: newServiceCat.name.trim() ? "white" : "var(--text-muted)", borderRadius: "12px", padding: "0.6rem 1.4rem", cursor: newServiceCat.name.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {addingServiceCat ? <Loader2 size={14} style={spinStyle} /> : <Plus size={14} />} Ajouter
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Modal ajout catégorie de conseil ── */}
            <AdminModal open={addConseilCatModal} title="Nouvelle catégorie de conseil" onClose={() => { setAddConseilCatModal(false); setNewConseilCat({ label: "" }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Libellé *</label>
                        <input autoFocus placeholder="Ex : Réparation, Tutoriel DIY…" value={newConseilCat.label} onChange={e => setNewConseilCat({ label: e.target.value })} onKeyDown={e => { if (e.key === "Enter") handleAddConseilCat(); }}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddConseilCatModal(false); setNewConseilCat({ label: "" }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
                        <button onClick={handleAddConseilCat} disabled={!newConseilCat.label.trim() || addingConseilCat}
                            style={{ border: "none", background: newConseilCat.label.trim() ? "var(--black)" : "var(--border)", color: newConseilCat.label.trim() ? "white" : "var(--text-muted)", borderRadius: "12px", padding: "0.6rem 1.4rem", cursor: newConseilCat.label.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {addingConseilCat ? <Loader2 size={14} style={spinStyle} /> : <Plus size={14} />} Ajouter
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Modal ajout matériau ── */}
            <AdminModal open={addMatModal} title="Nouveau matériau" onClose={() => { setAddMatModal(false); setNewMat({ label: "", impactCoefficient: "1" }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Libellé *</label>
                        <input autoFocus placeholder="Ex : Bambou, Aluminium..." value={newMat.label} onChange={e => setNewMat(d => ({ ...d, label: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleAddMat(); }}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Coefficient d'impact *</label>
                        <input type="number" min="0.001" max="1000" step="0.001" value={newMat.impactCoefficient} onChange={e => setNewMat(d => ({ ...d, impactCoefficient: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleAddMat(); }}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                        <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Utilisé ensuite pour calculer le score: poids (kg) × coefficient.</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddMatModal(false); setNewMat({ label: "", impactCoefficient: "1" }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
                        <button onClick={handleAddMat} disabled={!newMat.label.trim() || addingMat}
                            style={{ border: "none", background: newMat.label.trim() ? "var(--black)" : "var(--border)", color: newMat.label.trim() ? "white" : "var(--text-muted)", borderRadius: "12px", padding: "0.6rem 1.4rem", cursor: newMat.label.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {addingMat ? <Loader2 size={14} style={spinStyle} /> : <Plus size={14} />} Ajouter
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Modal ajout pays ── */}
            <AdminModal open={addCountryModal} title="Nouveau pays" onClose={() => { setAddCountryModal(false); setNewCountry({ label: "", emoji: "🌍", zip_length: 5 }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Emoji</label>
                            <input value={newCountry.emoji} onChange={e => setNewCountry(d => ({ ...d, emoji: e.target.value }))} maxLength={EMOJI_MAX_LENGTH} style={{ width: "56px", padding: "0.6rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "1.4rem", textAlign: "center", outline: "none", background: "var(--surface-hover)", fontFamily: emojiFontFamily }} />
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Nom *</label>
                            <input autoFocus placeholder="Ex : France, Suisse..." value={newCountry.label} onChange={e => setNewCountry(d => ({ ...d, label: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleAddCountry(); }}
                                style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Longueur code postal *</label>
                        <input type="number" value={newCountry.zip_length} onChange={e => setNewCountry(d => ({ ...d, zip_length: e.target.value }))} min={1} max={15}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)", width: "100%" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddCountryModal(false); setNewCountry({ label: "", emoji: "🌍", zip_length: 5 }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
                        <button onClick={handleAddCountry} disabled={!newCountry.label.trim() || addingCountry}
                            style={{ border: "none", background: newCountry.label.trim() ? "var(--black)" : "var(--border)", color: newCountry.label.trim() ? "white" : "var(--text-muted)", borderRadius: "12px", padding: "0.6rem 1.4rem", cursor: newCountry.label.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {addingCountry ? <Loader2 size={14} style={spinStyle} /> : <Plus size={14} />} Ajouter
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Modal ajout type de point ── */}
            <AdminModal open={addDpTypeModal} title="Nouveau type de point" onClose={() => { setAddDpTypeModal(false); setNewDpType({ label: "" }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Libellé *</label>
                        <input autoFocus placeholder="Ex : Box mobile, Casiers..." value={newDpType.label} onChange={e => setNewDpType({ label: e.target.value })} onKeyDown={e => { if (e.key === "Enter") handleAddDPType(); }}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddDpTypeModal(false); setNewDpType({ label: "" }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
                        <button onClick={handleAddDPType} disabled={!newDpType.label.trim() || addingDpType}
                            style={{ border: "none", background: newDpType.label.trim() ? "var(--black)" : "var(--border)", color: newDpType.label.trim() ? "white" : "var(--text-muted)", borderRadius: "12px", padding: "0.6rem 1.4rem", cursor: newDpType.label.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {addingDpType ? <Loader2 size={14} style={spinStyle} /> : <Plus size={14} />} Ajouter
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Modal ajout motif de moderation ── */}
            <AdminModal open={addReasonModal} title="Nouveau motif de modération" onClose={() => { setAddReasonModal(false); setNewReason({ label: "" }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Libellé *</label>
                        <input autoFocus placeholder="Ex : Contenu non conforme a la charte" value={newReason.label} onChange={e => setNewReason({ label: e.target.value })} onKeyDown={e => { if (e.key === "Enter") handleAddReason(); }}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddReasonModal(false); setNewReason({ label: "" }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
                        <button onClick={handleAddReason} disabled={!newReason.label.trim() || addingReason}
                            style={{ border: "none", background: newReason.label.trim() ? "var(--black)" : "var(--border)", color: newReason.label.trim() ? "white" : "var(--text-muted)", borderRadius: "12px", padding: "0.6rem 1.4rem", cursor: newReason.label.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {addingReason ? <Loader2 size={14} style={spinStyle} /> : <Plus size={14} />} Ajouter
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Modal langue d'interface ── */}
            <AdminModal
                open={languageModalOpen}
                title={editingLanguage ? "Modifier la langue" : "Nouvelle langue"}
                onClose={closeLanguageModal}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Code *</label>
                            <input
                                autoFocus={!editingLanguage}
                                disabled={Boolean(editingLanguage)}
                                placeholder="it"
                                value={languageDraft.code}
                                onChange={e => setLanguageDraft(d => ({ ...d, code: e.target.value.toLowerCase().replaceAll("_", "-") }))}
                                style={{
                                    padding: "0.65rem 0.9rem",
                                    borderRadius: "12px",
                                    border: "1px solid var(--border)",
                                    fontSize: "0.95rem",
                                    outline: "none",
                                    fontFamily: "inherit",
                                    color: "var(--text-main)",
                                    background: editingLanguage ? "var(--surface-hover)" : "#fff",
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Nom *</label>
                            <input
                                autoFocus={Boolean(editingLanguage)}
                                placeholder="Italien"
                                value={languageDraft.label}
                                onChange={e => setLanguageDraft(d => ({ ...d, label: e.target.value }))}
                                style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }}
                            />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Nom natif *</label>
                            <input
                                placeholder="Italiano"
                                value={languageDraft.nativeLabel}
                                onChange={e => setLanguageDraft(d => ({ ...d, nativeLabel: e.target.value }))}
                                style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "end" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Direction</label>
                            <select
                                value={languageDraft.dir}
                                onChange={e => setLanguageDraft(d => ({ ...d, dir: e.target.value }))}
                                style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }}
                            >
                                <option value="ltr">LTR</option>
                                <option value="rtl">RTL</option>
                            </select>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.65rem 0", fontSize: "0.88rem", fontWeight: "500", color: "var(--text-main)", cursor: editingLanguage?.isBuiltin ? "not-allowed" : "pointer" }}>
                            <input
                                type="checkbox"
                                checked={languageDraft.enabled}
                                disabled={Boolean(editingLanguage?.isBuiltin)}
                                onChange={e => setLanguageDraft(d => ({ ...d, enabled: e.target.checked }))}
                                style={{ width: "16px", height: "16px", accentColor: "var(--forest-deep)" }}
                            />
                            Langue active
                        </label>
                    </div>

                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "1rem",
                        padding: "1rem",
                        borderRadius: "16px",
                        background: "rgba(229, 255, 188, 0.35)",
                        border: "1px solid rgba(46, 125, 50, 0.18)",
                    }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 }}>
                            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)" }}>
                                Traduction automatique via DeepL
                            </span>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                                Aucun catalogue à saisir. Dès qu'un utilisateur sélectionne cette langue, les textes visibles sont traduits par l'API puis enregistrés en cache.
                            </span>
                        </div>
                        <span style={{
                            fontSize: "0.74rem",
                            color: "var(--text-muted)",
                            background: "rgba(35,59,61,0.06)",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "10px",
                            whiteSpace: "nowrap",
                        }}>
                            {languageCacheStats.phrases} texte{languageCacheStats.phrases > 1 ? "s" : ""} en cache
                        </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button
                            onClick={closeLanguageModal}
                            disabled={savingLanguage}
                            style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: savingLanguage ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSaveLanguage}
                            disabled={!languageDraft.code.trim() || !languageDraft.label.trim() || !languageDraft.nativeLabel.trim() || savingLanguage}
                            style={{
                                border: "none",
                                background: languageDraft.code.trim() && languageDraft.label.trim() && languageDraft.nativeLabel.trim() ? "var(--black)" : "var(--border)",
                                color: languageDraft.code.trim() && languageDraft.label.trim() && languageDraft.nativeLabel.trim() ? "white" : "var(--text-muted)",
                                borderRadius: "12px",
                                padding: "0.6rem 1.4rem",
                                cursor: languageDraft.code.trim() && languageDraft.label.trim() && languageDraft.nativeLabel.trim() && !savingLanguage ? "pointer" : "not-allowed",
                                fontFamily: "inherit",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                            }}
                        >
                            {savingLanguage ? <Loader2 size={14} style={spinStyle} /> : <Check size={14} />}
                            {editingLanguage ? "Enregistrer" : "Ajouter"}
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ── Toast ── */}
            {toast && (
                <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: toast.type === "error" ? "var(--state-critical)" : "var(--black)", color: "white", padding: "0.75rem 1.25rem", borderRadius: "14px", fontSize: "0.85rem", fontWeight: "500", zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: "0.5rem", animation: "fadeIn 0.25s ease-out" }}>
                    {toast.type !== "error" && <Check size={14} />}{toast.msg}
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
