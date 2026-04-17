"use client";

import { useEffect, useState } from "react";
import AdminModal from "../AdminModal";
import { fieldStyle, labelStyle } from "../../../lib/styles";

// ── Constantes ────────────────────────────────────────────────────────────────

const ROLES = ["particulier", "professionnel", "salarie", "admin"];
const ROLE_LABELS = {
    particulier:   "Particulier",
    professionnel: "Professionnel",
    salarie:       "Salarié",
    admin:         "Admin",
};

const STATUSES = [
    { value: "active",    label: "Actif" },
    { value: "pending",   label: "En attente" },
    { value: "suspended", label: "Suspendu" },
];

const EMPLOYMENT_STATUSES = [
    { value: "",             label: "Sélectionner…" },
    { value: "temps_plein",  label: "Temps plein" },
    { value: "temps_partiel", label: "Temps partiel" },
];

const JOB_FUNCTIONS = [
    { value: "",            label: "Sélectionner…" },
    { value: "animateur",   label: "Animateur" },
    { value: "formateur",   label: "Formateur" },
    { value: "intervenant", label: "Intervenant" },
];

const EMPLOYEE_ROLES = [
    { value: "",             label: "Sélectionner…" },
    { value: "formateur",    label: "Formateur" },
    { value: "animateur",    label: "Animateur" },
    { value: "moderateur",   label: "Modérateur" },
    { value: "coordinateur", label: "Coordinateur" },
];

const ACTIVITY_TYPES = [
    { value: "",           label: "Sélectionner…" },
    { value: "recyclage",  label: "Recyclage" },
    { value: "upcycling",  label: "Upcycling" },
    { value: "vente",      label: "Vente" },
    { value: "artisanat",  label: "Artisanat" },
    { value: "autre",      label: "Autre" },
];

const SUBSCRIPTION_TYPES = [
    { value: "gratuit", label: "Gratuit" },
    { value: "premium", label: "Premium" },
];

const ADMIN_ROLES = [
    { value: "",            label: "Sélectionner…" },
    { value: "super_admin", label: "Super Admin" },
    { value: "gestionnaire", label: "Gestionnaire" },
    { value: "support",     label: "Support" },
];

// ── Styles sections ───────────────────────────────────────────────────────────

const sectionStyle = {
    padding: "1rem",
    background: "#f8fafb",
    borderRadius: "14px",
    border: "1px solid #e2eaea",
    display: "grid",
    gap: "0.8rem",
};

const sectionTitleStyle = {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.1rem",
};

const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" };

// ── Formulaire ────────────────────────────────────────────────────────────────

export default function UserForm({ open, editingUser, onClose, onSubmit, defaultRole = "particulier" }) {
    const isEdit = editingUser !== null;

    const emptyForm = {
        // Base
        firstname: "", lastname: "", email: "", password: "",
        role: defaultRole, status: "pending",
        // Communs
        phone: "", city: "",
        // Professionnel
        companyName: "", companyManager: "", siret: "",
        address: "", zipCode: "",
        activityType: "", interventionZone: "",
        subscriptionType: "gratuit", subscriptionStart: "",
        // Salarié
        employmentStatus: "", jobFunction: "",
        employeeRole: "", siteLocation: "", skills: "",
        // Admin
        adminRole: "",
        // Note
        adminNote: "",
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (isEdit) {
            setForm({
                firstname:        editingUser.firstname ?? "",
                lastname:         editingUser.lastname ?? "",
                email:            editingUser.email ?? "",
                password:         "",
                role:             editingUser.role ?? "particulier",
                status:           editingUser.status ?? "pending",
                phone:            editingUser.phone ?? "",
                city:             editingUser.city ?? "",
                companyName:      editingUser.companyName ?? "",
                companyManager:   editingUser.companyManager ?? "",
                siret:            editingUser.siret ?? "",
                address:          editingUser.address ?? "",
                zipCode:          editingUser.zipCode ?? "",
                activityType:     editingUser.activityType ?? "",
                interventionZone: editingUser.interventionZone ?? "",
                subscriptionType: editingUser.subscriptionType ?? "gratuit",
                subscriptionStart: editingUser.subscriptionStart
                    ? new Date(editingUser.subscriptionStart).toISOString().split("T")[0]
                    : "",
                employmentStatus: editingUser.employmentStatus ?? "",
                jobFunction:      editingUser.jobFunction ?? "",
                employeeRole:     editingUser.employeeRole ?? "",
                siteLocation:     editingUser.siteLocation ?? "",
                skills:           editingUser.skills ?? "",
                adminRole:        editingUser.adminRole ?? "",
                adminNote:        editingUser.adminNote ?? "",
            });
        } else {
            setForm({ ...emptyForm, role: defaultRole });
        }
        setError("");
    }, [open, editingUser]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (key) => (e) => {
        const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [key]: val }));
    };

    const validate = () => {
        if (!form.firstname.trim()) return "Le prénom est requis.";
        if (!form.lastname.trim())  return "Le nom est requis.";
        if (!form.email.trim())     return "L'email est requis.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
            return "Format d'email invalide.";
        if (!isEdit && form.password.trim().length < 8)
            return "Le mot de passe doit faire au moins 8 caractères.";
        if (form.phone.trim() && !/^[+\d\s\-()]{6,20}$/.test(form.phone.trim()))
            return "Format de téléphone invalide.";
        if (form.role === "professionnel" && !form.siret.trim())
            return "Le SIRET est obligatoire pour un compte professionnel.";
        if (form.role === "professionnel" && form.siret.trim()) {
            const siretClean = form.siret.replace(/\s/g, "");
            if (!/^\d{14}$/.test(siretClean))
                return "Le SIRET doit contenir exactement 14 chiffres.";
        }
        if (form.role === "salarie" && !form.employeeRole)
            return "Le type de rôle est obligatoire pour un salarié.";
        if (form.role === "admin" && !form.adminRole)
            return "Le rôle admin est obligatoire pour un administrateur.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        setSaving(true);
        try {
            const role = form.role;
            const payload = {
                firstname:        form.firstname.trim(),
                lastname:         form.lastname.trim(),
                email:            form.email.trim(),
                role,
                status:           form.status,
                phone:            form.phone.trim(),
                city:             form.city.trim(),
                // Pro
                companyName:      role === "professionnel" ? form.companyName.trim() : "",
                companyManager:   role === "professionnel" ? form.companyManager.trim() : "",
                siret:            role === "professionnel" ? form.siret.trim() : "",
                address:          role === "professionnel" ? form.address.trim() : "",
                zipCode:          role === "professionnel" ? form.zipCode.trim() : "",
                activityType:     role === "professionnel" ? form.activityType : "",
                interventionZone: role === "professionnel" ? form.interventionZone.trim() : "",
                subscriptionType: role === "professionnel" ? form.subscriptionType : "gratuit",
                subscriptionStart: role === "professionnel" && form.subscriptionStart
                    ? new Date(form.subscriptionStart).toISOString()
                    : null,
                // Salarié
                employmentStatus: role === "salarie" ? form.employmentStatus : "",
                jobFunction:      role === "salarie" ? form.jobFunction : "",
                employeeRole:     role === "salarie" ? form.employeeRole : "",
                siteLocation:     role === "salarie" ? form.siteLocation.trim() : "",
                skills:           role === "salarie" ? form.skills.trim() : "",
                // Admin
                adminRole:        role === "admin" ? form.adminRole : "",
                // Note
                adminNote:        form.adminNote.trim(),
            };
            if (!isEdit) payload.password = form.password;
            await onSubmit(payload);
            onClose();
        } catch (err) {
            setError(err.message ?? "Une erreur est survenue.");
        } finally {
            setSaving(false);
        }
    };

    const role = form.role;

    return (
        <AdminModal
            open={open}
            title={isEdit ? "Modifier l'utilisateur" : "Créer un utilisateur"}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>

                {/* ── Section 1 : Type de compte ── */}
                <div style={grid2}>
                    <label style={labelStyle}>
                        Rôle
                        <select style={fieldStyle} value={form.role} onChange={set("role")}>
                            {ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                            ))}
                        </select>
                    </label>
                    <label style={labelStyle}>
                        Statut du compte
                        <select style={fieldStyle} value={form.status} onChange={set("status")}>
                            {STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {/* ── Section 2 : Informations personnelles ── */}
                <div style={sectionStyle}>
                    <p style={sectionTitleStyle}>Informations personnelles</p>
                    <div style={grid2}>
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
                    <div style={grid2}>
                        <label style={labelStyle}>
                            Téléphone <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                            <input style={fieldStyle} type="tel" value={form.phone} onChange={set("phone")} placeholder="+33 6 12 34 56 78" />
                        </label>
                        <label style={labelStyle}>
                            Ville <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                            <input style={fieldStyle} value={form.city} onChange={set("city")} placeholder="Paris" />
                        </label>
                    </div>
                </div>

                {/* ── Section 3 : Informations professionnelles ── */}
                {role === "professionnel" && (
                    <div style={sectionStyle}>
                        <p style={sectionTitleStyle}>Informations professionnelles</p>
                        <div style={grid2}>
                            <label style={labelStyle}>
                                Nom de l'entreprise
                                <input style={fieldStyle} value={form.companyName} onChange={set("companyName")} placeholder="Atelier Upcycle SAS" />
                            </label>
                            <label style={labelStyle}>
                                Nom du responsable
                                <input style={fieldStyle} value={form.companyManager} onChange={set("companyManager")} placeholder="Jean Martin" />
                            </label>
                        </div>
                        <label style={labelStyle}>
                            SIRET <span style={{ color: "#B91C1C" }}>*</span>
                            <input
                                style={fieldStyle}
                                value={form.siret}
                                onChange={e => {
                                    // N'autoriser que les chiffres et espaces
                                    const val = e.target.value.replace(/[^\d\s]/g, "");
                                    setForm(prev => ({ ...prev, siret: val }));
                                }}
                                placeholder="123 456 789 00012"
                                maxLength={17}
                                inputMode="numeric"
                                required={form.role === "professionnel"}
                            />
                            {form.siret.trim() && form.siret.replace(/\s/g, "").length !== 14 && (
                                <span style={{ fontSize: "0.75rem", color: "#B91C1C", paddingLeft: "4px" }}>
                                    {form.siret.replace(/\s/g, "").length}/14 chiffres
                                </span>
                            )}
                        </label>
                        <label style={labelStyle}>
                            Adresse
                            <input style={fieldStyle} value={form.address} onChange={set("address")} placeholder="12 rue de la Paix" />
                        </label>
                        <div style={grid2}>
                            <label style={labelStyle}>
                                Code postal
                                <input style={fieldStyle} value={form.zipCode} onChange={set("zipCode")} placeholder="75001" />
                            </label>
                            <label style={labelStyle}>
                                Type d'activité
                                <select style={fieldStyle} value={form.activityType} onChange={set("activityType")}>
                                    {ACTIVITY_TYPES.map((a) => (
                                        <option key={a.value} value={a.value}>{a.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <label style={labelStyle}>
                            Zone d'intervention <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                            <input style={fieldStyle} value={form.interventionZone} onChange={set("interventionZone")} placeholder="Île-de-France, Paris intra muros…" />
                        </label>
                        <div style={grid2}>
                            <label style={labelStyle}>
                                Abonnement
                                <select style={fieldStyle} value={form.subscriptionType} onChange={set("subscriptionType")}>
                                    {SUBSCRIPTION_TYPES.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label style={labelStyle}>
                                Début d'abonnement <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                                <input style={fieldStyle} type="date" value={form.subscriptionStart} onChange={set("subscriptionStart")} />
                            </label>
                        </div>
                    </div>
                )}

                {/* ── Section 4 : Salarié ── */}
                {role === "salarie" && (
                    <div style={sectionStyle}>
                        <p style={sectionTitleStyle}>Informations salarié</p>
                        <div style={grid2}>
                            <label style={labelStyle}>
                                Type de rôle <span style={{ color: "#B91C1C" }}>*</span>
                                <select style={fieldStyle} value={form.employeeRole} onChange={set("employeeRole")} required>
                                    {EMPLOYEE_ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label style={labelStyle}>
                                Statut d'emploi
                                <select style={fieldStyle} value={form.employmentStatus} onChange={set("employmentStatus")}>
                                    {EMPLOYMENT_STATUSES.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div style={grid2}>
                            <label style={labelStyle}>
                                Fonction
                                <select style={fieldStyle} value={form.jobFunction} onChange={set("jobFunction")}>
                                    {JOB_FUNCTIONS.map((f) => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label style={labelStyle}>
                                Site rattaché <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                                <input style={fieldStyle} value={form.siteLocation} onChange={set("siteLocation")} placeholder="Agence Paris Nord" />
                            </label>
                        </div>
                        <label style={labelStyle}>
                            Domaines de compétence <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                            <textarea
                                style={{ ...fieldStyle, resize: "vertical", minHeight: "64px" }}
                                value={form.skills}
                                onChange={set("skills")}
                                placeholder="Tri, Réparation textile, Formation upcycling…"
                            />
                        </label>
                    </div>
                )}

                {/* ── Section 5 : Admin ── */}
                {role === "admin" && (
                    <div style={sectionStyle}>
                        <p style={sectionTitleStyle}>Paramètres administrateur</p>
                        <label style={labelStyle}>
                            Rôle admin <span style={{ color: "#B91C1C" }}>*</span>
                            <select style={fieldStyle} value={form.adminRole} onChange={set("adminRole")} required>
                                {ADMIN_ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}

                {/* ── Note admin ── */}
                <label style={labelStyle}>
                    Note admin <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                    <textarea
                        style={{ ...fieldStyle, resize: "vertical", minHeight: "64px" }}
                        value={form.adminNote}
                        onChange={set("adminNote")}
                        placeholder="Remarques internes visibles uniquement par les admins…"
                    />
                </label>

                {/* ── Erreur & boutons ── */}
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
                        {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
                    </button>
                </div>
            </form>
        </AdminModal>
    );
}
