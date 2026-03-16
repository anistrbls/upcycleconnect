"use client";

// Barre de recherche + filtres par rôle et statut
// Reçoit les valeurs actuelles + callbacks de changement depuis UsersAdminView.

export default function UserFilters({ query, role, status, onQueryChange, onRoleChange, onStatusChange }) {
    const roleOptions = [
        { value: "",            label: "Tous les rôles" },
        { value: "particulier", label: "Particuliers" },
        { value: "prestataire", label: "Prestataires" },
        { value: "admin",       label: "Admins" },
    ];

    const statusOptions = [
        { value: "",          label: "Tous les statuts" },
        { value: "active",    label: "Actifs" },
        { value: "pending",   label: "En attente" },
        { value: "suspended", label: "Suspendus" },
    ];

    return (
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Recherche texte */}
            <input
                type="text"
                placeholder="Rechercher par nom, prénom ou email…"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                style={{
                    flex: "1 1 220px",
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.6rem 1rem",
                    background: "#EAF0F1",
                    color: "var(--text-main)",
                    fontFamily: "inherit",
                    fontSize: "0.88rem",
                    outline: "none",
                    minWidth: "180px",
                }}
            />

            {/* Filtre rôle */}
            <select
                value={role}
                onChange={(e) => onRoleChange(e.target.value)}
                style={{
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.6rem 1rem",
                    background: "#EAF0F1",
                    color: "var(--text-main)",
                    fontFamily: "inherit",
                    fontSize: "0.88rem",
                    outline: "none",
                    cursor: "pointer",
                }}
            >
                {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>

            {/* Filtre statut */}
            <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                style={{
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.6rem 1rem",
                    background: "#EAF0F1",
                    color: "var(--text-main)",
                    fontFamily: "inherit",
                    fontSize: "0.88rem",
                    outline: "none",
                    cursor: "pointer",
                }}
            >
                {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
