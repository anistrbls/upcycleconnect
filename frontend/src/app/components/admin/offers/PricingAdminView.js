"use client";

import { useState } from "react";
import AdminModal from "../AdminModal";
import { formatDateFR } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";

// Labels lisibles pour les types de règles
const TYPE_LABELS = {
    commission:   "Commission",
    subscription: "Abonnement",
    promotion:    "Promotion",
    flat_fee:     "Frais fixe",
};

const TYPE_COLORS = {
    commission:   { bg: "#E5FFBC", color: "#233B3D" },
    subscription: { bg: "#D6EEF0", color: "#2E5C60" },
    promotion:    { bg: "#FFF5D6", color: "#7A5E00" },
    flat_fee:     { bg: "#EAF0F1", color: "#4F6163" },
};

function TypeBadge({ type }) {
    const style = TYPE_COLORS[type] ?? { bg: "#E5E7EB", color: "#374151" };
    return (
        <span style={{
            background: style.bg,
            color: style.color,
            borderRadius: "999px",
            padding: "0.18rem 0.6rem",
            fontSize: "0.73rem",
            fontWeight: 600,
        }}>
            {TYPE_LABELS[type] ?? type}
        </span>
    );
}

const emptyForm = { label: "", type: "commission", amount: "0", isActive: true };

export default function PricingAdminView({ rules, loading, errorMessage, onReload, onCreate, onUpdate, onDelete }) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [formState, setFormState] = useState(emptyForm);
    const [localError, setLocalError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const resetForm = () => {
        setEditingRule(null);
        setFormState(emptyForm);
        setLocalError("");
    };

    const handleNew = () => {
        resetForm();
        setFormOpen(true);
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormState({
            label:    rule.label,
            type:     rule.type,
            amount:   String(rule.amount),
            isActive: rule.isActive,
        });
        setLocalError("");
        setFormOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");

        if (!formState.label.trim()) {
            setLocalError("Le libellé est requis.");
            return;
        }
        const parsedAmount = Number(formState.amount);
        if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
            setLocalError("Le montant doit être un nombre positif.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                label:    formState.label.trim(),
                type:     formState.type,
                amount:   parsedAmount,
                isActive: formState.isActive,
            };
            if (editingRule) {
                await onUpdate(editingRule.id, payload);
            } else {
                await onCreate(payload);
            }
            setFormOpen(false);
            resetForm();
        } catch (err) {
            setLocalError(String(err?.message || "Une erreur est survenue."));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (rule) => {
        if (!onDelete) return;
        if (!window.confirm(`Supprimer la règle « ${rule.label} » ?`)) return;
        try {
            await onDelete(rule.id);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de supprimer la règle."));
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Offres &amp; prestations</span>
                    <h1>Tarification</h1>
                </div>
            </div>

            {/* Barre d'actions */}
            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                    <button className="action-cta task-action-btn" type="button" onClick={handleNew}>Ajouter une règle</button>
                </div>
                {errorMessage && (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>
                )}
            </div>

            {/* Formulaire modal */}
            <AdminModal
                open={formOpen}
                title={editingRule ? "Modifier une règle tarifaire" : "Créer une règle tarifaire"}
                onClose={() => { setFormOpen(false); resetForm(); }}
            >
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Libellé
                        <input
                            type="text"
                            placeholder="Ex: Commission plateforme"
                            value={formState.label}
                            onChange={(e) => setFormState((prev) => ({ ...prev, label: e.target.value }))}
                            style={fieldStyle}
                            required
                        />
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
                        <label style={labelStyle}>
                            Type
                            <select
                                value={formState.type}
                                onChange={(e) => setFormState((prev) => ({ ...prev, type: e.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                            >
                                <option value="commission">Commission</option>
                                <option value="subscription">Abonnement</option>
                                <option value="promotion">Promotion</option>
                                <option value="flat_fee">Frais fixe</option>
                            </select>
                        </label>
                        <label style={labelStyle}>
                            Montant (€ ou %)
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formState.amount}
                                onChange={(e) => setFormState((prev) => ({ ...prev, amount: e.target.value }))}
                                style={fieldStyle}
                            />
                        </label>
                    </div>
                    <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={formState.isActive}
                            onChange={(e) => setFormState((prev) => ({ ...prev, isActive: e.target.checked }))}
                            style={{ width: "1rem", height: "1rem", accentColor: "#3E686C" }}
                        />
                        Règle active
                    </label>
                    {localError && <p style={{ color: "#a23b3b", fontSize: "0.85rem" }}>{localError}</p>}
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>
                            {isSaving ? "Enregistrement..." : (editingRule ? "Mettre à jour" : "Créer")}
                        </button>
                        <button
                            className="action-cta"
                            type="button"
                            onClick={() => { setFormOpen(false); resetForm(); }}
                            style={{ background: "#e8ecee", color: "var(--text-main)" }}
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            </AdminModal>

            {/* Liste des règles */}
            {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement…</p>
            ) : (
                <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                    {rules.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                            Aucune règle tarifaire. Utilisez &laquo; Ajouter une règle &raquo; pour commencer.
                        </p>
                    ) : rules.map((rule) => (
                        <article
                            key={rule.id}
                            style={{
                                background: "#F1F6F6",
                                borderRadius: "18px",
                                padding: "1.25rem",
                                display: "grid",
                                gap: "0.75rem",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                    <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{rule.label}</span>
                                    <TypeBadge type={rule.type} />
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-main)" }}>
                                        {Number(rule.amount).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>€ / %</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <span style={{
                                        display: "inline-block",
                                        width: "8px", height: "8px",
                                        borderRadius: "50%",
                                        background: rule.isActive ? "#5A8C3E" : "#AAB5B6",
                                    }} />
                                    <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                                        {rule.isActive ? "Active" : "Inactive"}
                                    </span>
                                    <span style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                                        · {formatDateFR(rule.createdAt)}
                                    </span>
                                </div>
                                <div style={{ display: "flex", gap: "0.45rem" }}>
                                    <button
                                        className="action-cta"
                                        type="button"
                                        onClick={() => handleEdit(rule)}
                                        style={{ background: "#e8ecee", color: "var(--text-main)" }}
                                    >
                                        Modifier
                                    </button>
                                    {onDelete ? (
                                        <button
                                            className="action-cta"
                                            type="button"
                                            onClick={() => handleDelete(rule)}
                                            style={{ background: "#f4e8e8", color: "#8e2d2d" }}
                                        >
                                            Supprimer
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    );
}
