"use client";

// Barre de recherche + filtres par rôle et statut
// Reçoit les valeurs actuelles + callbacks de changement depuis UsersAdminView.

export default function UserFilters({ query, role, status, onQueryChange, onRoleChange, onStatusChange, hideRole = false }) {
    const roleOptions = [
        { value: "", label: "Tous les rôles" },
        { value: "particulier", label: "Particuliers" },
        { value: "professionnel", label: "Professionnels" },
        { value: "salarie", label: "Salariés" },
        { value: "admin", label: "Admins" },
    ];

    const statusOptions = [
        { value: "", label: "Tous les statuts" },
        { value: "active", label: "Actifs" },
        { value: "pending", label: "En attente" },
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
                    width: "240px",
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.6rem 1rem",
                    background: "rgb(229, 255, 188)",
                    color: "var(--text-main)",
                    fontFamily: "inherit",
                    fontSize: "0.88rem",
                    outline: "none",
                    minWidth: "180px",
                }}
            />

            {!hideRole && (
                <select
                    value={role}
                    onChange={(e) => onRoleChange(e.target.value)}
                    style={{
                        border: "none",
                        borderRadius: "999px",
                        padding: "0.6rem 2.6rem 0.6rem 1.1rem",
                        background: "rgb(229, 255, 188)",
                        color: "var(--text-main)",
                        fontFamily: "inherit",
                        fontSize: "0.88rem",
                        outline: "none",
                        cursor: "pointer",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232b4548%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 0.9rem center",
                        backgroundSize: "0.65rem auto",
                    }}
                >
                    {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            )}

            {/* Filtre statut */}
            <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                style={{
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.6rem 2.6rem 0.6rem 1.1rem",
                    background: "rgb(229, 255, 188)",
                    color: "var(--text-main)",
                    fontFamily: "inherit",
                    fontSize: "0.88rem",
                    outline: "none",
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232b4548%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.9rem center",
                    backgroundSize: "0.65rem auto",
                }}
            >
                {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
