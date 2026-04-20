"use client";

import { useState } from "react";
import AdminModal from "../AdminModal";
import { fieldStyle, labelStyle } from "../../../lib/styles";

export default function ResetPasswordModal({ open, user, onClose, onSubmit }) {
    const [password, setPassword] = useState("");
    const [disconnectUser, setDisconnectUser] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("Le mot de passe doit faire au moins 8 caractères.");
            return;
        }

        setSaving(true);
        try {
            await onSubmit(user.id, password, disconnectUser);
            setPassword("");
            setDisconnectUser(true); // Reset to default
            onClose();
        } catch (err) {
            setError(err.message ?? "Une erreur est survenue.");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <AdminModal
            open={open}
            title="Réinitialiser le mot de passe"
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.2rem" }}>
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    Vous allez réinitialiser le mot de passe de <strong>{user.firstname} {user.lastname}</strong> ({user.email}).
                </p>

                <label style={labelStyle}>
                    Nouveau mot de passe
                    <input
                        style={fieldStyle}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoFocus
                    />
                </label>

                <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontWeight: 500 }}>
                    <input
                        type="checkbox"
                        checked={disconnectUser}
                        onChange={(e) => setDisconnectUser(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    Déconnecter l'utilisateur sur tous ses appareils
                </label>

                {error && (
                    <p style={{ color: "#B91C1C", fontSize: "0.85rem", margin: 0, padding: "0.6rem 0.9rem", background: "#FEF2F2", borderRadius: "10px", border: "1px solid #FECACA" }}>
                        {error}
                    </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.3rem" }}>
                    <button type="button" className="action-btn" onClick={onClose} disabled={saving}>
                        Annuler
                    </button>
                    <button type="submit" className="action-btn primary" disabled={saving}>
                        {saving ? "Réinitialisation…" : "Confirmer"}
                    </button>
                </div>
            </form>
        </AdminModal>
    );
}
