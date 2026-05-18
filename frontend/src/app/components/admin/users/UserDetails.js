"use client";

import { useState } from "react";
import AdminModal from "../AdminModal";
import { formatDateFR, formatDateTimeFR } from "../../../lib/formatters";
import EmployeeRulesView from "./EmployeeRulesView";

const ROLE_LABELS = {
    particulier:   "Particulier",
    professionnel: "Professionnel",
    salarie:       "Salarié",
    admin:         "Administrateur",
};

const STATUS_LABELS = {
    active:    "Actif",
    pending:   "En attente de validation",
    suspended: "Suspendu",
};

const EMP_STATUS_LABELS = {
    temps_plein:   "Temps plein",
    temps_partiel: "Temps partiel",
};

const JOB_FUNCTION_LABELS = {
    animateur:   "Animateur",
    formateur:   "Formateur",
    intervenant: "Intervenant",
};

const EMPLOYEE_ROLE_LABELS = {
    formateur:    "Formateur",
    animateur:    "Animateur",
    moderateur:   "Modérateur",
    coordinateur: "Coordinateur",
};

const ACTIVITY_TYPE_LABELS = {
    recyclage: "Recyclage",
    upcycling: "Upcycling",
    vente:     "Vente",
    artisanat: "Artisanat",
    autre:     "Autre",
};

const ADMIN_ROLE_LABELS = {
    super_admin:  "Super Admin",
    gestionnaire: "Gestionnaire",
    support:      "Support",
};

const SUBSCRIPTION_LABELS = {
    gratuit: "Gratuit",
    premium: "Premium",
};

// Fiche détail d'un utilisateur — lecture seule.
export default function UserDetails({ open, user, onClose, onEdit }) {
    const [currentTab, setCurrentTab] = useState("profile"); // profile | rules
    
    if (!user) return null;

    const isSalarie = user.role === "salarie";

    return (
        <AdminModal open={open} title={currentTab === "rules" ? `Règles de travail - ${user.firstname}` : "Fiche utilisateur"} onClose={onClose}>
            <div style={{ display: "grid", gap: "0.9rem" }}>
                
                {/* Tabs for Salarie */}
                {isSalarie && (
                    <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "10px", marginBottom: "0.5rem" }}>
                        <button 
                            onClick={() => setCurrentTab("profile")}
                            style={{ 
                                flex: 1, padding: "8px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
                                background: currentTab === "profile" ? "#fff" : "transparent", color: currentTab === "profile" ? "var(--text-main)" : "var(--text-muted)",
                                boxShadow: currentTab === "profile" ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
                            }}
                        >Infos Profil</button>
                        <button 
                            onClick={() => setCurrentTab("rules")}
                            style={{ 
                                flex: 1, padding: "8px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
                                background: currentTab === "rules" ? "#fff" : "transparent", color: currentTab === "rules" ? "var(--text-main)" : "var(--text-muted)",
                                boxShadow: currentTab === "rules" ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
                            }}
                        >Horaires & Règles</button>
                    </div>
                )}

                {currentTab === "rules" ? (
                    <EmployeeRulesView employeeId={user.id} />
                ) : (
                    <>
                        {/* Identité */}
                        <Section title="Identité">
                            <Row label="Prénom"  value={user.firstname} />
                            <Row label="Nom"     value={user.lastname} />
                            <Row label="Email"   value={user.email} />
                            {user.phone && <Row label="Téléphone" value={user.phone} />}
                            {user.city  && <Row label="Ville"     value={user.city} />}
                        </Section>

                        {/* Rôle & statut */}
                        <Section title="Compte">
                            <Row label="Rôle"   value={ROLE_LABELS[user.role] ?? user.role} />
                            <Row label="Statut" value={STATUS_LABELS[user.status] ?? user.status} />
                        </Section>

                        {/* Professionnel */}
                        {user.role === "professionnel" && (
                            <Section title="Informations professionnelles">
                                {user.companyName      && <Row label="Entreprise"         value={user.companyName} />}
                                {user.companyManager   && <Row label="Responsable"         value={user.companyManager} />}
                                {user.siret            && <Row label="SIRET"               value={user.siret} />}
                                {user.address          && <Row label="Adresse"             value={user.address} />}
                                {user.zipCode          && <Row label="Code postal"          value={user.zipCode} />}
                                {user.activityType     && <Row label="Type d'activité"      value={ACTIVITY_TYPE_LABELS[user.activityType] ?? user.activityType} />}
                                {user.interventionZone && <Row label="Zone d'intervention"  value={user.interventionZone} />}
                                <Row label="Abonnement" value={SUBSCRIPTION_LABELS[user.subscriptionType] ?? user.subscriptionType} />
                                {user.subscriptionStart && <Row label="Début abonnement" value={formatDateFR(user.subscriptionStart)} />}
                            </Section>
                        )}

                        {/* Salarié */}
                        {isSalarie && (
                            <Section title="Informations salarié">
                                {user.employeeRole     && <Row label="Type de rôle"        value={EMPLOYEE_ROLE_LABELS[user.employeeRole] ?? user.employeeRole} />}
                                {user.employmentStatus && <Row label="Statut d'emploi"     value={EMP_STATUS_LABELS[user.employmentStatus] ?? user.employmentStatus} />}
                                {user.jobFunction      && <Row label="Fonction"             value={JOB_FUNCTION_LABELS[user.jobFunction] ?? user.jobFunction} />}
                                {user.siteLocation     && <Row label="Site rattaché"         value={user.siteLocation} />}
                                {user.skills           && <Row label="Compétences"           value={user.skills} />}
                            </Section>
                        )}

                        {/* Admin */}
                        {user.role === "admin" && user.adminRole && (
                            <Section title="Paramètres administrateur">
                                <Row label="Rôle admin" value={ADMIN_ROLE_LABELS[user.adminRole] ?? user.adminRole} />
                            </Section>
                        )}

                        {/* Dates */}
                        <Section title="Dates">
                            <Row label="Inscription"         value={formatDateFR(user.createdAt)} />
                            <Row label="Dernière connexion"  value={user.lastLoginAt ? formatDateTimeFR(user.lastLoginAt) : "–"} />
                            <Row label="Mise à jour"          value={formatDateFR(user.updatedAt)} />
                        </Section>

                        {/* Note admin */}
                        {user.adminNote && (
                            <Section title="Note admin">
                                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                                    {user.adminNote}
                                </p>
                            </Section>
                        )}
                    </>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button type="button" className="action-btn" onClick={() => { setCurrentTab("profile"); onClose(); }}>Fermer</button>
                    {currentTab === "profile" && (
                        <button type="button" className="action-btn primary" onClick={() => { onClose(); onEdit(user); }}>
                            Modifier
                        </button>
                    )}
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
