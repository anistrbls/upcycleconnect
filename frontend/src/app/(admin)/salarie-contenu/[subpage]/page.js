"use client";

import { use, useEffect, useState } from "react";
import SalarieContenuView from "../../../components/salarie/SalarieContenuView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function SalarieContenuPage({ params }) {
    const { subpage } = use(params);
    const [contents, setContents] = useState([]);
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
            const res = await fetch(apiUrl("/salarie/contents"), { headers: buildAuthHeaders() });
            if (res.ok) { const d = await res.json(); setContents(d.items || []); }
        } catch (err) {
            setError(String(err?.message || "Impossible de charger le contenu."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadContents(); }, []);

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

    const contentType = subpage === "conseils" ? "conseil" : subpage === "actualites" ? "actualite" : null;

    if (contentType) {
        return (
            <SalarieContenuView
                contents={contents}
                loading={loading}
                errorMessage={error}
                type={contentType}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}
