"use client";

import { useCallback, useEffect, useState } from "react";
import UsersTable from "./UsersTable";
import UserFilters from "./UserFilters";
import UserForm from "./UserForm";
import UserDetails from "./UserDetails";
import { listUsers, createUser, updateUser, deleteUser, setUserStatus } from "../../../lib/userService";

// Correspondance sous-page → filtre automatique
// Correspond aux clés définies dans constants.js pour le module "utilisateurs"
const SUBPAGE_FILTERS = {
    "tous-utilisateurs": {},
    "particuliers": { role: "particulier" },
    "prestataires": { role: "prestataire" },
    "salaries": { role: "salarie" },
    "admins": { role: "admin" },
};



// Composant principal du module Utilisateurs.
// Reçoit `subpage` pour appliquer le filtre de navigation automatique.
export default function UsersAdminView({ subpage }) {
    // ── Données ───────────────────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // ── Filtres ───────────────────────────────────────────────────────────────
    const pageFilter = SUBPAGE_FILTERS[subpage] ?? {};
    const [query, setQuery] = useState("");
    const [role, setRole] = useState(pageFilter.role ?? "");
    const [status, setStatus] = useState(pageFilter.status ?? "");

    // ── Modales ───────────────────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);   // null = création
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailUser, setDetailUser] = useState(null);

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

            const items = await listUsers(filters);
            setUsers(items);
        } catch (err) {
            setErrorMsg(err.message ?? "Erreur lors du chargement.");
        } finally {
            setLoading(false);
        }
    }, [query, role, status, subpage]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // Réinitialise les filtres locaux à chaque changement de sous-page
        setQuery("");
        setRole(pageFilter.role ?? "");
        setStatus(pageFilter.status ?? "");
    }, [subpage]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        load();
    }, [load]);

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
        "particuliers": "Particuliers",
        "prestataires": "Professionnels",
        "salaries": "Salariés",
        "admins": "Administrateurs",
    };
    const sectionTitle = SUBPAGE_TITLES[subpage] ?? "Utilisateurs";

    return (
        <>
            {/* En-tête de page */}
            <div className="header-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div className="title-area">
                    <span className="activities-label">Administration</span>
                    <h1>Utilisateurs</h1>
                </div>
                <button className="action-btn primary" onClick={openCreate} type="button" style={{ marginBottom: "0.4rem" }}>
                    + Ajouter un utilisateur
                </button>
            </div>

            {/* Panneau principal */}
            <div className="panel">
                <div className="section-header">
                    <span className="section-title">{sectionTitle}</span>
                    <span className="db-badge">{visibleUsers.length} utilisateur{visibleUsers.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Barre de filtres */}
                <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    <UserFilters
                        query={query}
                        role={role}
                        status={status}
                        onQueryChange={setQuery}
                        onRoleChange={setRole}
                        onStatusChange={setStatus}
                        hideRole={subpage !== "tous-utilisateurs"}
                    />
                </div>

                {/* Message d'erreur global */}
                {errorMsg && (
                    <p style={{ color: "#B91C1C", fontSize: "0.85rem", marginBottom: "0.8rem" }}>{errorMsg}</p>
                )}

                {/* Tableau */}
                <UsersTable
                    users={visibleUsers}
                    loading={loading}
                    onView={openDetail}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                />
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
                onEdit={openEdit}
            />
        </>
    );
}
