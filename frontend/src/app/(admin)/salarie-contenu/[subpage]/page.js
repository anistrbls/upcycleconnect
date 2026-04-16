"use client";

import { use, useEffect, useState } from "react";
import SalarieContenuView from "../../../components/salarie/SalarieContenuView";
import SalarieConseilFeedView from "../../../components/salarie/SalarieConseilFeedView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function SalarieContenuPage({ params }) {
    const { subpage } = use(params);
    const [contents, setContents] = useState([]);
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const activeModule = getModuleByKey("salarie-contenu");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    const parseResponse = async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Erreur API");
        return data;
    };

    const loadContents = async () => {
        setLoading(true);
        setError("");
        try {
            const [ownRes, feedRes] = await Promise.all([
                fetch(apiUrl("/salarie/contents"), { headers: buildAuthHeaders() }),
                subpage === "conseils"
                    ? fetch(apiUrl("/salarie/contents/feed"), { headers: buildAuthHeaders() })
                    : Promise.resolve(null),
            ]);
            if (ownRes.ok) { const d = await ownRes.json(); setContents(d.items || []); }
            if (feedRes?.ok) { const d = await feedRes.json(); setFeedItems(d.items || []); }
        } catch (err) {
            setError(String(err?.message || "Impossible de charger le contenu."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadContents(); }, [subpage]);

    const handleCreate = async (payload) => {
        const res = await fetch(apiUrl("/salarie/contents"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseResponse(res);
        await loadContents();
    };

    const handleUpdate = async (id, payload) => {
        const res = await fetch(apiUrl(`/salarie/contents/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseResponse(res);
        await loadContents();
    };

    const handleDelete = async (id) => {
        const res = await fetch(apiUrl(`/salarie/contents/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseResponse(res);
        await loadContents();
    };

    if (subpage === "conseils") {
        return (
            <SalarieConseilFeedView
                feedItems={feedItems}
                ownItems={contents}
                loading={loading}
                errorMessage={error}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
            />
        );
    }

    if (subpage === "actualites") {
        return (
            <SalarieContenuView
                contents={contents}
                loading={loading}
                errorMessage={error}
                type="actualite"
                onCreate={handleCreate}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}

