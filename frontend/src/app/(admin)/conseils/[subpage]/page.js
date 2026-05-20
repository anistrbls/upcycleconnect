"use client";

import { use, useEffect, useState } from "react";
import ConseilsAdminView from "../../../components/admin/conseils/ConseilsAdminView";
import ParticulierConseilFeedView from "../../../components/particulier/ParticulierConseilFeedView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { TOKEN_KEY, apiUrl, buildAuthHeaders } from "../../../lib/api";
import { appendConseilFiltersToUrl } from "../../../lib/conseilFormUtils";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function ConseilsSubPage({ params }) {
    const { subpage } = use(params);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [feedItems, setFeedItems] = useState([]);
    const [feedLoading, setFeedLoading] = useState(false);
    const [feedError, setFeedError] = useState("");

    const getUserRole = () => {
        try {
            const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
            if (!token) return null;
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload.role || null;
        } catch {
            return null;
        }
    };
    const userRole = getUserRole();
    const isFeedUser = userRole === "particulier" || userRole === "professionnel";

    const activeModule = getModuleByKey("conseils");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    const parseResponse = async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Erreur API");
        return data;
    };

    const loadItems = async (filters = {}) => {
        setLoading(true);
        setError("");
        try {
            let url = apiUrl("/admin/salarie-contents") + "?type=conseil";
            if (subpage === "en-attente") {
                filters = { ...filters, status: "en_attente" };
            }
            url = appendConseilFiltersToUrl(url, filters);
            const res = await fetch(url, { headers: buildAuthHeaders() });
            const data = await parseResponse(res);
            setItems(data.items || []);
        } catch (err) {
            setError(String(err?.message || "Impossible de charger les conseils."));
        } finally {
            setLoading(false);
        }
    };

    const loadFeed = async (favoritesOnly = false, filters = {}) => {
        setFeedLoading(true);
        setFeedError("");
        try {
            let url = favoritesOnly ? apiUrl("/salarie/contents/feed?favorites=true") : apiUrl("/salarie/contents/feed");
            url = appendConseilFiltersToUrl(url, filters);
            const res = await fetch(url, { headers: buildAuthHeaders() });
            const data = await parseResponse(res);
            setFeedItems(data.items || []);
        } catch (err) {
            setFeedError(String(err?.message || "Impossible de charger les conseils."));
        } finally {
            setFeedLoading(false);
        }
    };

    useEffect(() => {
        if (isFeedUser) {
            loadFeed(subpage === "favoris");
        } else {
            loadItems();
        }
    }, [subpage]);

    const handleDelete = async (id) => {
        const res = await fetch(apiUrl(`/admin/salarie-contents/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseResponse(res);
        await loadItems();
    };

    const handleValidate = async (id) => {
        const res = await fetch(apiUrl(`/admin/salarie-contents/${id}/validate`), {
            method: "POST",
            headers: buildAuthHeaders(),
        });
        await parseResponse(res);
        await loadItems();
    };

    const handleReject = async (id, comment) => {
        const res = await fetch(apiUrl(`/admin/salarie-contents/${id}/reject`), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ comment }),
        });
        await parseResponse(res);
        await loadItems();
    };

    if (isFeedUser) {
        return (
            <ParticulierConseilFeedView
                feedItems={feedItems}
                loading={feedLoading}
                errorMessage={feedError}
                favoritesOnly={subpage === "favoris"}
                userRole={userRole}
                onReloadFeed={(filters) => loadFeed(subpage === "favoris", filters)}
            />
        );
    }

    if (subpage === "tous-conseils" || subpage === "en-attente") {
        return (
            <ConseilsAdminView
                items={items}
                loading={loading}
                errorMessage={error}
                filterPending={subpage === "en-attente"}
                onReload={loadItems}
                onDelete={handleDelete}
                onValidate={handleValidate}
                onReject={handleReject}
            />
        );
    }

    return <ModulePlaceholder module={activeModule} sub={activeSub} />;
}
