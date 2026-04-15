"use client";

import { use, useEffect, useState } from "react";
import SalarieModerationView from "../../../components/salarie/SalarieModerationView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function SalarieModerationPage({ params }) {
    const { subpage } = use(params);
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const activeModule = getModuleByKey("salarie-moderation");
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
            setError(String(err?.message || "Impossible de charger."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadContents(); }, []);

    const handleValidate = async (id) => {
        try {
            const res = await fetch(apiUrl(`/salarie/contents/${id}`), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ status: "publie" }),
            });
            await parseResponse(res);
            await loadContents();
        } catch (err) { window.alert(String(err?.message || "Erreur.")); }
    };

    const handleHide = async (id) => {
        try {
            const res = await fetch(apiUrl(`/salarie/contents/${id}`), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ status: "archive" }),
            });
            await parseResponse(res);
            await loadContents();
        } catch (err) { window.alert(String(err?.message || "Erreur.")); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer ce contenu ?")) return;
        try {
            const res = await fetch(apiUrl(`/salarie/contents/${id}`), {
                method: "DELETE",
                headers: buildAuthHeaders(),
            });
            await parseResponse(res);
            await loadContents();
        } catch (err) { window.alert(String(err?.message || "Erreur.")); }
    };

    if (subpage === "a-moderer") {
        return (
            <SalarieModerationView
                contents={contents}
                loading={loading}
                errorMessage={error}
                onValidate={handleValidate}
                onHide={handleHide}
                onDelete={handleDelete}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}
