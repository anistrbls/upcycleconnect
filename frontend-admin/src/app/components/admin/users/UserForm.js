"use client";

import { useEffect, useState } from "react";
import AdminModal from "../AdminModal";
import { fieldStyle, labelStyle } from "../../../lib/styles";

const ROLES = ["particulier", "prestataire", "admin"];
const STATUSES = [
    { value: "active",    label: "Actif" },
    { value: "pending",   label: "En attente" },
    { value: "suspended", label: "Suspendu" },
];

// Formulaire utilisé pour la création ET la modification d'un utilisateur.
// Si `editingUser` est non null → mode modification (pas de champ password).
// Si `editingUser` est null → mode création (avec champ password).
export default function UserForm({ open, editingUser, onClose, onSubmit }) {
    const isEdit = editingUser !== null;

    const emptyForm = {
        firstname:   "",
        lastname:    "",
        email:       "",
        password:    "",
        role:        "particulier",
        status:      "pending",
        isValidated: false,
        adminNote:   "",
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    // Pré-remplit le formulaire quand la modale s'ouvre ou que l'utilisateur change
    useEffect(() => {
        if (!open) return;
        if (isEdit) {
            setForm({
                firstname:   editingUser.firstname   ?? "",
                lastname:    editingUser.lastname    ?? "",
                email:       editingUser.email       ?? "",
                password:    "",
                role:        editingUser.role        ?? "particulier",
                status:      editingUser.status      ?? "pending",
                isValidated: editingUser.isValidated ?? false,
                adminNote:   editingUser.adminNote   ?? "",
            });
        } else {
            setForm(emptyForm);
        }
        setError("");
    }, [open, editingUser]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (key) => (e) => {
        const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [key]: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.firstname.trim()) { setError("Le prénom est requis."); return; }
        if (!form.lastname.trim())  { setError("Le nom est requis.");    return; }
        if (!form.email.trim())     { setError("L'email est requis.");   return; }
        if (!isEdit && form.password.trim().length < 8) {
            setError("Le mot de passe doit faire au moins 8 caractères.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                firstname:   form.firstname.trim(),
                lastname:    form.lastname.trim(),
                email:       form.email.trim(),
                role:        form.role,
                status:      form.status,
                isValidated: form.isValidated,
                adminNote:   form.adminNote.trim(),
            };
            if (!isEdit) {
                payload.password = form.password;
            }
            await onSubmit(payload);
            onClose();
        } catch (err) {
            setError(err.message ?? "Une erreur est survenue.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminModal
            open={open}
            title={isEdit ? "Modifier l'utilisateur" : "Créer un utilisateur"}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.9rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                    <label style={labelStyle}>
                        Prénom
                        <input style={fieldStyle} value={form.firstname} onChange={set("firstname")} placeholder="Marie" required />
                    </label>
                    <label style={labelStyle}>
                        Nom
                        <input style={fieldStyle} value={form.lastname} onChange={set("lastname")} placeholder="Dupont" required />
                    </label>
                </div>

                <label style={labelStyle}>
                    Email
                    <input style={fieldStyle} type="email" value={form.email} onChange={set("email")} placeholder="marie@exemple.fr" required />
                </label>

                {!isEdit && (
                    <label style={labelStyle}>
                        Mot de passe <span style={{ color: "var(--text-muted)" }}>(min. 8 caractères)</span>
                        <input style={fieldStyle} type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
                    </label>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                    <label style={labelStyle}>
                        Rôle
                        <select style={fieldStyle} value={form.role} onChange={set("role")}>
                            {ROLES.map((r) => (
                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                        </select>
                    </label>
                    <label style={labelStyle}>
                        Statut
                        <select style={fieldStyle} value={form.status} onChange={set("status")}>
                            {STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={form.isValidated}
                        onChange={set("isValidated")}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    Compte validé
                </label>

                <label style={labelStyle}>
                    Note admin <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                    <textarea
                        style={{ ...fieldStyle, resize: "vertical", minHeight: "72px" }}
                        value={form.adminNote}
                        onChange={set("adminNote")}
                        placeholder="Remarques internes visibles uniquement par les admins…"
                    />
                </label>

                {error && (
                    <p style={{ color: "#B91C1C", fontSize: "0.85rem", margin: 0 }}>{error}</p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.3rem" }}>
                    <button type="button" className="action-btn" onClick={onClose} disabled={saving}>
                        Annuler
                    </button>
                    <button type="submit" className="action-btn primary" disabled={saving}>
                        {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
                    </button>
                </div>
            </form>
        </AdminModal>
    );
}

