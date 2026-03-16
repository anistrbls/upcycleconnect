import { apiUrl, buildAuthHeaders } from "./api";

// ─── Liste ────────────────────────────────────────────────────────────────────

/**
 * Récupère la liste des utilisateurs avec filtres optionnels.
 * @param {{ q?: string, role?: string, status?: string }} filters
 */
export async function listUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.q)      params.set("q",      filters.q);
    if (filters.role)   params.set("role",   filters.role);
    if (filters.status) params.set("status", filters.status);

    const url = params.toString()
        ? `${apiUrl("/admin/users")}?${params}`
        : apiUrl("/admin/users");

    const res = await fetch(url, { method: "GET", headers: buildAuthHeaders() });
    const data = await parseResponse(res);
    return data.items ?? [];
}

// ─── Lecture unitaire ─────────────────────────────────────────────────────────

/**
 * Récupère un utilisateur par son ID.
 * @param {number} id
 */
export async function getUser(id) {
    const res = await fetch(apiUrl(`/admin/users/${id}`), {
        method: "GET",
        headers: buildAuthHeaders(),
    });
    return parseResponse(res);
}

// ─── Création ─────────────────────────────────────────────────────────────────

/**
 * Crée un nouvel utilisateur.
 * @param {{ firstname, lastname, email, password, role, status, isValidated }} payload
 */
export async function createUser(payload) {
    const res = await fetch(apiUrl("/admin/users"), {
        method: "POST",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
    });
    return parseResponse(res);
}

// ─── Modification ─────────────────────────────────────────────────────────────

/**
 * Met à jour les champs d'un utilisateur.
 * @param {number} id
 * @param {{ firstname, lastname, email, role, status, isValidated, adminNote }} payload
 */
export async function updateUser(id, payload) {
    const res = await fetch(apiUrl(`/admin/users/${id}`), {
        method: "PUT",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
    });
    return parseResponse(res);
}

// ─── Suppression ──────────────────────────────────────────────────────────────

/**
 * Supprime un utilisateur par son ID.
 * @param {number} id
 */
export async function deleteUser(id) {
    const res = await fetch(apiUrl(`/admin/users/${id}`), {
        method: "DELETE",
        headers: buildAuthHeaders(),
    });
    return parseResponse(res);
}

// ─── Actions rapides ──────────────────────────────────────────────────────────

/**
 * Change le statut d'un utilisateur (active | pending | suspended).
 * @param {number} id
 * @param {string} status
 */
export async function setUserStatus(id, status) {
    const res = await fetch(apiUrl(`/admin/users/${id}/status`), {
        method: "PATCH",
        headers: buildAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
    });
    return parseResponse(res);
}

/**
 * Valide un utilisateur (is_validated = true, status → active si pending).
 * @param {number} id
 */
export async function validateUser(id) {
    const res = await fetch(apiUrl(`/admin/users/${id}/validate`), {
        method: "PATCH",
        headers: buildAuthHeaders(),
    });
    return parseResponse(res);
}

// ─── Helper interne ───────────────────────────────────────────────────────────

async function parseResponse(res) {
    let data = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    if (!res.ok) {
        throw new Error(data?.error ?? "Erreur API");
    }
    return data;
}
