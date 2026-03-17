"use client";

import AdminModal from "../AdminModal";
import { formatDateFR, formatDateTimeFR } from "../../../lib/formatters";

const ROLE_LABELS = {
    particulier: "Particulier",
    prestataire: "Professionnel",
    salarie: "Salarié",
    admin: "Administrateur",
};

const STATUS_LABELS = {
    active: "Actif",
    pending: "En attente de validation",
    suspended: "Suspendu",
};

const EMP_STATUS_LABELS = {
    temps_plein: "Temps plein",
    temps_partiel: "Temps partiel",
};

const JOB_FUNCTION_LABELS = {
    animateur: "Animateur",
    formateur: "Formateur",
    intervenant: "Intervenant",
};

// Modale de fiche détail d'un utilisateur — lecture seule.
export default function UserDetails({ open, user, onClose, onEdit }) {
    if (!user) return null;

    return (
        <AdminModal open={open} title="Fiche utilisateur" onClose={onClose}>
            <div style={{ display: "grid", gap: "0.9rem" }}>

                {/* Identité */}
                <Section title="Identité">
                    <Row label="Prénom" value={user.firstname} />
                    <Row label="Nom" value={user.lastname} />
                    <Row label="Email" value={user.email} />
                </Section>

                {/* Rôle & statut */}
                <Section title="Compte">
                    <Row label="Rôle" value={ROLE_LABELS[user.role] ?? user.role} />
                    <Row label="Statut" value={STATUS_LABELS[user.status] ?? user.status} />
                </Section>

                {/* Attributs Salarié */}
                {user.role === "salarie" && (
                    <Section title="Détails Salarié">
                        <Row label="Statut d'emploi" value={EMP_STATUS_LABELS[user.employmentStatus] ?? user.employmentStatus} />
                        <Row label="Fonction" value={JOB_FUNCTION_LABELS[user.jobFunction] ?? user.jobFunction} />
                    </Section>
                )}

                {/* Dates */}
                <Section title="Dates">
                    <Row label="Inscription" value={formatDateFR(user.createdAt)} />
                    <Row label="Dernière connexion" value={user.lastLoginAt ? formatDateTimeFR(user.lastLoginAt) : "–"} />
                    <Row label="Mise à jour" value={formatDateFR(user.updatedAt)} />
                </Section>

                {/* Note admin */}
                {user.adminNote && (
                    <Section title="Note admin">
                        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                            {user.adminNote}
                        </p>
                    </Section>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <button type="button" className="action-btn" onClick={onClose}>Fermer</button>
                    <button type="button" className="action-btn primary" onClick={() => { onClose(); onEdit(user); }}>
                        Modifier
                    </button>
                </div>
            </div>
        </AdminModal>
    );
}

function Section({ title, children }) {
    return (
        <div>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {title}
            </p>
            <div style={{ background: "#F8FAFB", borderRadius: "14px", padding: "0.7rem 0.9rem", display: "grid", gap: "0.35rem" }}>
                {children}
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", gap: "0.5rem" }}>
            <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: "right" }}>{value ?? "–"}</span>
        </div>
    );
}
