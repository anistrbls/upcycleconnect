"use client";

import { use, useEffect, useState } from "react";
import SalarieFormationsView from "../../../components/salarie/SalarieFormationsView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function SalarieFormationsPage({ params }) {
    const { subpage } = use(params);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const activeModule = getModuleByKey("salarie-formations");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    const parseResponse = async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Erreur API");
        return data;
    };

    const loadData = async () => {
        setLoading(true);
        setError("");
        try {
            const [evRes] = await Promise.all([
                fetch(apiUrl("/salarie/events"), { headers: buildAuthHeaders() })
            ]);

            const [evData] = await Promise.all([
                parseResponse(evRes)
            ]);

            setEvents(evData.items || []);
        } catch (err) {
            setError(String(err?.message || "Impossible de charger les données."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (payload) => {
        const res = await fetch(apiUrl("/salarie/events"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseResponse(res);
        await loadData();
    };

    const handleUpdate = async (id, payload) => {
        const res = await fetch(apiUrl(`/salarie/events/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseResponse(res);
        await loadData();
    };

    const handleDelete = async (id) => {
        const res = await fetch(apiUrl(`/salarie/events/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseResponse(res);
        await loadData();
    };

    if (subpage === "creer" || subpage === "mes-evenements" || subpage === "brouillons") {
        return (
            <SalarieFormationsView
                subpage={subpage}
                events={events}
                categories={[]}
                loading={loading}
                errorMessage={error}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}
