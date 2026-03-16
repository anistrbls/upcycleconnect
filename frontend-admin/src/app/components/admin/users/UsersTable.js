"use client";

import { formatDateFR } from "../../../lib/formatters";

// Badges visuels pour rôle et statut
const ROLE_COLORS = {
    particulier: { bg: "#E5FFBC", color: "#3E686C" },
    prestataire: { bg: "#D6EEF0", color: "#2E5C60" },
    admin:       { bg: "#151A1B", color: "#C8D2D4" },
};

const STATUS_COLORS = {
    active:    { bg: "#E5FFBC", color: "#3E4A1A", label: "Actif" },
    pending:   { bg: "#EAF0F1", color: "#4F6163", label: "En attente" },
    suspended: { bg: "#151A1B", color: "#C8D2D4", label: "Suspendu" },
};

function Badge({ value, map }) {
    const style = map[value] ?? { bg: "#E5E7EB", color: "#374151" };
    return (
        <span style={{
            background: style.bg,
            color: style.color,
            borderRadius: "999px",
            padding: "0.22rem 0.65rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
        }}>
            {style.label ?? value}
        </span>
    );
}

// Tableau principal des utilisateurs
// Reçoit la liste filtrée + les callbacks d'action depuis UsersAdminView.
export default function UsersTable({ users, loading, onView, onEdit, onDelete, onValidate, onToggleStatus }) {
    if (loading) {
        return <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement…</p>;
    }

    if (users.length === 0) {
        return (
            <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Aucun utilisateur correspondant aux critères.
            </div>
        );
    }

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid #E2EAEA" }}>
                        {["Nom complet", "Email", "Rôle", "Statut", "Validé", "Inscription", "Dernière connexion", "Actions"].map((col) => (
                            <th key={col} style={{
                                textAlign: "left",
                                padding: "0.55rem 0.75rem",
                                color: "var(--text-muted)",
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                whiteSpace: "nowrap",
                            }}>
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id} style={{ borderBottom: "1px solid #F0F5F5" }}>
                            <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>
                                {u.firstname} {u.lastname}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>
                                {u.email}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem" }}>
                                <Badge value={u.role} map={ROLE_COLORS} />
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem" }}>
                                <Badge value={u.status} map={STATUS_COLORS} />
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                                {u.isValidated ? "✓" : "–"}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                {formatDateFR(u.createdAt)}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                {u.lastLoginAt ? formatDateFR(u.lastLoginAt) : "–"}
                            </td>
                            <td style={{ padding: "0.6rem 0.75rem" }}>
                                <ActionButtons
                                    user={u}
                                    onView={onView}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onValidate={onValidate}
                                    onToggleStatus={onToggleStatus}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ActionButtons({ user, onView, onEdit, onDelete, onValidate, onToggleStatus }) {
    const btn = (extra) => ({
        border: "none",
        borderRadius: "999px",
        padding: "0.28rem 0.7rem",
        fontSize: "0.72rem",
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        ...extra,
    });

    // Bouton contextuel : Valider > Réactiver > Suspendre (priorité décroissante)
    const contextual = !user.isValidated ? (
        <button style={btn({ background: "#E5FFBC", color: "#3E4A1A" })} onClick={() => onValidate(user.id)}>
            ✓ Valider
        </button>
    ) : user.status === "suspended" ? (
        <button style={btn({ background: "#E5FFBC", color: "#3E4A1A" })} onClick={() => onToggleStatus(user.id, "active")}>
            ↺ Réactiver
        </button>
    ) : user.status === "active" ? (
        <button style={btn({ background: "#EAF0F1", color: "#4F6163" })} onClick={() => onToggleStatus(user.id, "suspended")}>
            ⏸ Suspendre
        </button>
    ) : null;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem", minWidth: "160px" }}>
            {/* Ligne 1 : consulter + éditer */}
            <button style={btn({ background: "#EAF0F1", color: "#233B3D" })} onClick={() => onView(user)}>
                Voir
            </button>
            <button style={btn({ background: "#233B3D", color: "#E5FFBC" })} onClick={() => onEdit(user)}>
                Modifier
            </button>

            {/* Ligne 2 : action contextuelle + supprimer */}
            <div>{contextual}</div>
            <button style={btn({ background: "#151A1B", color: "#C8D2D4" })} onClick={() => onDelete(user.id)}>
                Supprimer
            </button>
        </div>
    );
}
