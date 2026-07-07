"use client";

import { useCallback, useEffect, useState } from "react";
import UsersTable from "./UsersTable";
import UserFilters from "./UserFilters";
import UserForm from "./UserForm";
import UserDetails from "./UserDetails";
import ResetPasswordModal from "./ResetPasswordModal";
import PlanningAdminView from "../planning/PlanningAdminView";
import { listUsers, createUser, updateUser, deleteUser, setUserStatus, validateUser, resetUserPassword } from "../../../lib/userService";
import { apiUrl, buildAuthHeaders, canModeratePlatform, getTokenPayload } from "../../../lib/api";

// Correspondance sous-page → filtre automatique
// Correspond aux clés définies dans constants.js pour le module "utilisateurs"
const SUBPAGE_FILTERS = {
    "tous-utilisateurs": {},
    "planning-equipe": {},
};



// Composant principal du module Utilisateurs.
// Reçoit `subpage` pour appliquer le filtre de navigation automatique.
export default function UsersAdminView({ subpage }) {
    const [currentUser, setCurrentUser] = useState(() => {
        const payload = getTokenPayload();
        return payload ? { role: payload.role, employeeRole: payload.employeeRole || "" } : null;
    });
    const isModerator = canModeratePlatform(currentUser) && currentUser?.role !== "admin";

    // ── Données ───────────────────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // ── Filtres ───────────────────────────────────────────────────────────────
    const pageFilter = SUBPAGE_FILTERS[subpage] ?? {};
    const [query, setQuery] = useState("");
    const [role, setRole] = useState(pageFilter.role ?? "");
    const [status, setStatus] = useState(pageFilter.status ?? "");

    // ── Planning (Admin Mode) ──────────────────────────────────────────────────
    const [planningEvents, setPlanningEvents] = useState([]);
    const [planningSlots, setPlanningSlots] = useState([]);
    const [planningUnavail, setPlanningUnavail] = useState([]);
    const [planningServices, setPlanningServices] = useState([]);
    const [planningSalaries, setPlanningSalaries] = useState([]);
    const [selectedPlanningEmployee, setSelectedPlanningEmployee] = useState("");
    const [planningSearch, setPlanningSearch] = useState("");
    const [planningDropdownOpen, setPlanningDropdownOpen] = useState(false);
    const [planningLoading, setPlanningLoading] = useState(false);
    const [planningKey, setPlanningKey] = useState(0);

    // ── Modales ───────────────────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);   // null = création
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailUser, setDetailUser] = useState(null);

    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetUser, setResetUser] = useState(null);

    // ── Chargement ────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const filters = { q: query };
            if (role) filters.role = role;
            if (status) filters.status = status;

            // Si la sous-page impose un filtre, il prend la priorité
            if (pageFilter.role) filters.role = pageFilter.role;
            if (pageFilter.status) filters.status = pageFilter.status;
            if (isModerator) filters.role = "professionnel";

            const items = await listUsers(filters);
            setUsers(items);
        } catch (err) {
            setErrorMsg(err.message ?? "Erreur lors du chargement.");
        } finally {
            setLoading(false);
        }
    }, [query, role, status, subpage, isModerator]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let cancelled = false;
        const refreshUser = async () => {
            try {
                const res = await fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && data?.user) {
                    setCurrentUser({ role: data.user.role, employeeRole: data.user.employeeRole || "" });
                }
            } catch {
                // Le layout gère déjà l'expiration de session.
            }
        };
        refreshUser();
        return () => {
            cancelled = true;
        };
    }, []);

    const loadPlanning = useCallback(async (targetEmployeeId = "") => {
        setPlanningLoading(true);
        setSelectedPlanningEmployee(targetEmployeeId);
        setPlanningKey(k => k + 1);
        try {
            const headers = buildAuthHeaders();
            const baseUrl = apiUrl("/admin");
            
            const [evRes, slRes, unRes, svRes, saRes] = await Promise.all([
                fetch(`${baseUrl}/events`, { headers }),
                fetch(`${baseUrl}/service-slots?employeeId=${targetEmployeeId}`, { headers }),
                fetch(`${baseUrl}/employee-unavailabilities?employeeId=${targetEmployeeId}`, { headers }),
                fetch(`${baseUrl}/services`, { headers }),
                fetch(`${baseUrl}/users?role=salarie`, { headers })
            ]);

            if (evRes.ok) setPlanningEvents((await evRes.json()).items || []);
            if (slRes.ok) setPlanningSlots((await slRes.json()).items || []);
            if (unRes.ok) setPlanningUnavail((await unRes.json()).items || []);
            if (svRes.ok) setPlanningServices((await svRes.json()).items || []);
            if (saRes.ok) setPlanningSalaries((await saRes.json()).items || []);
        } catch (err) {
            console.error("Failed to load planning data", err);
        } finally {
            setPlanningLoading(false);
        }
    }, []);

    useEffect(() => {
        // Réinitialise les filtres locaux à chaque changement de sous-page
        setQuery("");
        setRole(pageFilter.role ?? "");
        setStatus(pageFilter.status ?? "");
    }, [subpage]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (subpage === "planning-equipe" && !isModerator) {
            loadPlanning();
        } else {
            load();
        }
    }, [subpage, isModerator, load, loadPlanning]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleCreate = async (payload) => {
        await createUser(payload);
        await load();
    };

    const handleUpdate = async (payload) => {
        await updateUser(editingUser.id, payload);
        await load();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cet utilisateur ? Cette action est irréversible.")) return;
        try {
            await deleteUser(id);
            await load();
        } catch (err) {
            setErrorMsg(err.message ?? "Erreur lors de la suppression.");
        }
    };

    const handleToggleStatus = async (id, newStatus) => {
        try {
            await setUserStatus(id, newStatus);
            await load();
        } catch (err) {
            setErrorMsg(err.message ?? "Erreur lors du changement de statut.");
        }
    };

    const handleValidate = async (id) => {
        try {
            await validateUser(id);
            await load();
        } catch (err) {
            setErrorMsg(err.message ?? "Erreur lors de la validation.");
        }
    };

    const handleResetPassword = (user) => {
        setResetUser(user);
        setResetModalOpen(true);
    };

    const handleResetPasswordSubmit = async (id, newPassword, disconnectUser) => {
        await resetUserPassword(id, newPassword, disconnectUser);
        // On pourrait ajouter une notification de succès ici si on avait un système de toast
    };

    // ── Ouverture des modales ─────────────────────────────────────────────────
    const openCreate = () => {
        setEditingUser(null);
        setFormOpen(true);
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setFormOpen(true);
    };

    const openDetail = (user) => {
        setDetailUser(user);
        setDetailOpen(true);
    };

    // ── Filtre côté client (optionnel, en plus du filtre API) ──────────────────
    // Le filtre de sous-page fixe est appliqué côté API.
    // Le filtre texte est aussi envoyé à l'API, mais on garde le filtre local
    // pour rendre la recherche instantanée sans requête supplémentaire.
    const visibleUsers = users.filter((u) => {
        // Sécurité supplémentaire : Si la sous-page impose un rôle (ex: Salariés),
        // on ignore tout utilisateur qui ne correspond pas, même si l'API l'a renvoyé.
        if (pageFilter.role && u.role !== pageFilter.role) return false;
        if (isModerator && u.role !== "professionnel") return false;

        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return (
            u.firstname.toLowerCase().includes(q) ||
            u.lastname.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
    });

    // ── Titre de la section ───────────────────────────────────────────────────
    const SUBPAGE_TITLES = {
        "tous-utilisateurs": "Tous les utilisateurs",
        "planning-equipe": "Planning Équipe",
    };
    const sectionTitle = isModerator ? "Comptes professionnels" : (SUBPAGE_TITLES[subpage] ?? "Utilisateurs");

    return (
        <>
            {/* En-tête de page */}
            <div className="header-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div className="title-area">
                    <span className="activities-label">Administration</span>
                    <h1>Utilisateurs</h1>
                </div>
                {subpage === "planning-equipe" && !isModerator ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgb(248, 251, 251)", padding: "0.5rem 1rem", borderRadius: "12px", border: "1px solid rgb(215, 224, 225)", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#333" }}>Filtrer par salarié :</span>
                        
                        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ position: "relative" }}>
                                <input 
                                    type="text"
                                    placeholder={selectedPlanningEmployee ? (planningSalaries.find(s => String(s.id) === String(selectedPlanningEmployee))?.firstname + " " + planningSalaries.find(s => String(s.id) === String(selectedPlanningEmployee))?.lastname) : "Tous les salariés"}
                                    value={planningSearch}
                                    onFocus={() => setPlanningDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setPlanningDropdownOpen(false), 150)}
                                    onChange={(e) => { setPlanningSearch(e.target.value); setPlanningDropdownOpen(true); }}
                                    style={{ 
                                        border: "1px solid rgb(215, 224, 225)", 
                                        borderRadius: "8px", 
                                        padding: "4px 12px", 
                                        fontSize: "0.85rem", 
                                        outline: "none", 
                                        background: "#fff",
                                        width: "200px"
                                    }}
                                />
                                
                                {/* Liste déroulante personnalisée */}
                                {planningDropdownOpen && (
                                    <div style={{ 
                                        position: "absolute", 
                                        top: "100%", 
                                        left: 0, 
                                        right: 0, 
                                        marginTop: "4px",
                                        background: "#fff", 
                                        borderRadius: "8px", 
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)", 
                                        zIndex: 1000,
                                        maxHeight: "200px",
                                        overflowY: "auto",
                                        border: "1px solid rgb(215, 224, 225)"
                                    }}>
                                        <div 
                                            onMouseDown={(e) => { e.preventDefault(); setPlanningSearch(""); setPlanningDropdownOpen(false); loadPlanning(""); }}
                                            style={{ padding: "8px 12px", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid #f0f0f0", color: "var(--primary-color)", fontWeight: 600, background: !selectedPlanningEmployee ? "#f0f7f7" : "transparent" }}
                                        >
                                            Tous les salariés
                                        </div>
                                        {planningSalaries
                                            .filter(s => !planningSearch.trim() || `${s.firstname} ${s.lastname}`.toLowerCase().includes(planningSearch.toLowerCase()))
                                            .map(s => (
                                                <div 
                                                    key={s.id}
                                                    onMouseDown={(e) => { e.preventDefault(); setPlanningSearch(""); setPlanningDropdownOpen(false); loadPlanning(s.id); }}
                                                    style={{ padding: "8px 12px", fontSize: "0.85rem", cursor: "pointer", background: String(s.id) === String(selectedPlanningEmployee) ? "#f0f7f7" : "transparent" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = String(s.id) === String(selectedPlanningEmployee) ? "#f0f7f7" : "transparent"}
                                                >
                                                    <span data-i18n-user-content="true">{s.firstname} {s.lastname}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>

                            {selectedPlanningEmployee && (
                                <button 
                                    onClick={() => loadPlanning("")}
                                    style={{ 
                                        background: "rgba(0,0,0,0.05)", 
                                        border: "none", 
                                        borderRadius: "50%", 
                                        width: "20px", 
                                        height: "20px", 
                                        cursor: "pointer", 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center",
                                        fontSize: "12px"
                                    }}
                                    title="Réinitialiser le filtre"
                                >✕</button>
                            )}
                        </div>
                    </div>
                ) : !isModerator ? (
                    <button className="action-btn primary" onClick={openCreate} type="button" style={{ marginBottom: "0.4rem" }}>
                        + Ajouter un utilisateur
                    </button>
                ) : null}
            </div>

            {/* Panneau principal */}
            <div className="panel">
                <div className="section-header">
                    <span className="section-title">{sectionTitle}</span>
                    {subpage !== "planning-equipe" && (
                        <span className="db-badge">{visibleUsers.length} utilisateur{visibleUsers.length !== 1 ? "s" : ""}</span>
                    )}
                </div>

                {/* Barre de filtres (Uniquement sur la liste) */}
                {subpage !== "planning-equipe" && (
                    <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                        <UserFilters
                            query={query}
                            role={isModerator ? "professionnel" : role}
                            status={status}
                            onQueryChange={setQuery}
                            onRoleChange={isModerator ? undefined : setRole}
                            onStatusChange={setStatus}
                            hideRole={isModerator}
                        />
                    </div>
                )}

                {/* Message d'erreur global */}
                {errorMsg && (
                    <p style={{ color: "#B91C1C", fontSize: "0.85rem", marginBottom: "0.8rem" }}>{errorMsg}</p>
                )}

                {/* Tableau ou Planning */}
                {subpage === "planning-equipe" && !isModerator ? (
                    <PlanningAdminView
                        key={planningKey}
                        events={planningEvents}
                        slots={planningSlots}
                        unavailabilities={planningUnavail}
                        services={planningServices}
                        salaries={planningSalaries}
                        onReload={loadPlanning}
                        employeeId={selectedPlanningEmployee}
                        loading={planningLoading}
                    />
                ) : (
                    <UsersTable
                        users={visibleUsers}
                        loading={loading}
                        onView={openDetail}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onToggleStatus={handleToggleStatus}
                        onValidate={handleValidate}
                        onResetPassword={handleResetPassword}
                        moderatorMode={isModerator}
                    />
                )}
            </div>

            {/* Modale formulaire création / modification */}
            <UserForm
                open={formOpen}
                editingUser={editingUser}
                onClose={() => setFormOpen(false)}
                onSubmit={editingUser ? handleUpdate : handleCreate}
                defaultRole={role || "particulier"}
            />

            {/* Modale fiche détail */}
            <UserDetails
                open={detailOpen}
                user={detailUser}
                onClose={() => setDetailOpen(false)}
                onEdit={isModerator ? undefined : openEdit}
            />

            {/* Modale réinitialisation mot de passe */}
            <ResetPasswordModal
                open={resetModalOpen}
                user={resetUser}
                onClose={() => setResetModalOpen(false)}
                onSubmit={handleResetPasswordSubmit}
            />
        </>
    );
}
