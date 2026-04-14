"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, Plus, Pencil, Trash2, Check, X, GripVertical, Package, Shield, Layers, Loader2, MapPin, QrCode } from "lucide-react";
import AdminModal from "../../../components/admin/AdminModal";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";

// Les entités n'utilisent plus de slug. Le label fait foi.

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
                    <input value={draft.emoji} onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))} maxLength={2} style={emojiInput} />
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
                    <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{cat.emoji}</span>
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
                    <input value={draft.emoji} onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))} maxLength={2} style={emojiInput} />
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
                    <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{item.emoji}</span>
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

// ── Styles partagés ───────────────────────────────────────────────────────────
const rowStyle = { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "#FFFFFF", borderRadius: "16px", transition: "box-shadow 0.15s ease" };
const gripStyle = { color: "var(--text-muted)", opacity: 0.35, cursor: "grab", flexShrink: 0 };
const iconBtn = { border: "none", background: "var(--surface-hover)", borderRadius: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-main)", flexShrink: 0, transition: "background 0.15s ease" };
const emojiInput = { width: "44px", padding: "0.4rem", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "1.2rem", textAlign: "center", outline: "none", background: "var(--surface-hover)" };
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
    const [newMat, setNewMat] = useState({ label: "" });
    const [addingMat, setAddingMat] = useState(false);

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

    // Motifs de moderation
    const [moderationReasons, setModerationReasons] = useState([]);
    const [reasonLoading, setReasonLoading] = useState(true);
    const [addReasonModal, setAddReasonModal] = useState(false);
    const [newReason, setNewReason] = useState({ label: "" });
    const [addingReason, setAddingReason] = useState(false);

    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

    // ── Fetch catégories
    const fetchCategories = useCallback(async () => {
        setCatLoading(true);
        try {
            const res = await fetch(apiUrl("/admin/item-categories"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setCategories(data.items || []);
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
            setCountries(data.items || []);
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

    useEffect(() => { fetchCategories(); fetchConditions(); fetchMaterials(); fetchCountries(); fetchDpTypes(); fetchModerationReasons(); }, [fetchCategories, fetchConditions, fetchMaterials, fetchCountries, fetchDpTypes, fetchModerationReasons]);

    // ── CRUD catégories
    const handleSaveCat = async (updated) => {
        try {
            const res = await fetch(apiUrl(`/admin/item-categories/${updated.id}`), { method: "PUT", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: updated.label, emoji: updated.emoji }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const saved = await res.json();
            setCategories(prev => prev.map(c => c.id === saved.id ? saved : c));
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
            setCategories(prev => [...prev, created]);
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
            const res = await fetch(apiUrl(`/admin/item-materials/${updated.id}`), { method: "PUT", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: updated.label }) });
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
    const handleAddMat = async () => {
        if (!newMat.label.trim()) return;
        setAddingMat(true);
        try {
            const res = await fetch(apiUrl("/admin/item-materials"), { method: "POST", headers: buildAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ label: newMat.label.trim() }) });
            if (!res.ok) throw new Error((await res.json()).error || "");
            const created = await res.json();
            setMaterials(prev => [...prev, created]);
            setNewMat({ label: "" });
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
            setCountries(prev => prev.map(c => c.id === saved.id ? saved : c));
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
            setCountries(prev => [...prev, created]);
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
                    count={materials.length} loading={matLoading} onAdd={() => setAddMatModal(true)}
                >
                    {materials.map(mat => <ConditionRow key={mat.id} cond={mat} onSave={handleSaveMat} onDelete={handleDeleteMat} />)}
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
                            <input value={newCat.emoji} onChange={e => setNewCat(d => ({ ...d, emoji: e.target.value }))} maxLength={2} style={{ width: "56px", padding: "0.6rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "1.4rem", textAlign: "center", outline: "none", background: "var(--surface-hover)", fontFamily: "inherit" }} />
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

            {/* ── Modal ajout matériau ── */}
            <AdminModal open={addMatModal} title="Nouveau matériau" onClose={() => { setAddMatModal(false); setNewMat({ label: "" }); }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>Libellé *</label>
                        <input autoFocus placeholder="Ex : Bambou, Aluminium..." value={newMat.label} onChange={e => setNewMat({ label: e.target.value })} onKeyDown={e => { if (e.key === "Enter") handleAddMat(); }}
                            style={{ padding: "0.65rem 0.9rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "0.95rem", outline: "none", fontFamily: "inherit", color: "var(--text-main)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", paddingTop: "0.5rem" }}>
                        <button onClick={() => { setAddMatModal(false); setNewMat({ label: "" }); }} style={{ border: "none", background: "var(--surface-hover)", borderRadius: "12px", padding: "0.6rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>Annuler</button>
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
                            <input value={newCountry.emoji} onChange={e => setNewCountry(d => ({ ...d, emoji: e.target.value }))} maxLength={2} style={{ width: "56px", padding: "0.6rem", borderRadius: "12px", border: "1px solid var(--border)", fontSize: "1.4rem", textAlign: "center", outline: "none", background: "var(--surface-hover)", fontFamily: "inherit" }} />
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
