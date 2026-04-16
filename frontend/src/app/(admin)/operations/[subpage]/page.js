"use client";

import { use, useEffect, useState } from "react";
import OperationsValidationView from "../../../components/admin/OperationsValidationView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function OperationsSubPage({ params }) {
    const { subpage } = use(params);
    const activeModule = getModuleByKey("operations");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    // Contenus (conseils)
    const [contents, setContents] = useState([]);
    const [loadingContents, setLoadingContents] = useState(false);
    const [errorContents, setErrorContents] = useState("");

    // Événements
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [errorEvents, setErrorEvents] = useState("");

    const parseResponse = async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Erreur API");
        return data;
    };

    const loadContents = async () => {
        setLoadingContents(true);
        setErrorContents("");
        try {
            const res = await fetch(apiUrl("/admin/salarie-contents?status=en_attente"), { headers: buildAuthHeaders() });
            const data = await parseResponse(res);
            setContents(data.items || []);
        } catch (err) {
            setErrorContents(String(err?.message || "Impossible de charger les conseils."));
        } finally {
            setLoadingContents(false);
        }
    };

    const loadEvents = async () => {
        setLoadingEvents(true);
        setErrorEvents("");
        try {
            const res = await fetch(apiUrl("/admin/events"), { headers: buildAuthHeaders() });
            const data = await parseResponse(res);
            setEvents(data.items || []);
        } catch (err) {
            setErrorEvents(String(err?.message || "Impossible de charger les événements."));
        } finally {
            setLoadingEvents(false);
        }
    };

    useEffect(() => {
        if (subpage === "validations") {
            loadContents();
            loadEvents();
        }
    }, [subpage]);

    const handleValidateContent = async (id) => {
        const res = await fetch(apiUrl(`/admin/salarie-contents/${id}/validate`), { method: "POST", headers: buildAuthHeaders() });
        await parseResponse(res);
        await loadContents();
    };

    const handleRejectContent = async (id, comment) => {
        const res = await fetch(apiUrl(`/admin/salarie-contents/${id}/reject`), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ comment }),
        });
        await parseResponse(res);
        await loadContents();
    };

    const handleValidateEvent = async (id) => {
        const res = await fetch(apiUrl(`/admin/events/${id}/validate`), { method: "POST", headers: buildAuthHeaders() });
        await parseResponse(res);
        await loadEvents();
    };

    const handleRejectEvent = async (id, comment) => {
        const res = await fetch(apiUrl(`/admin/events/${id}/reject`), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ comment }),
        });
        await parseResponse(res);
        await loadEvents();
    };

    if (subpage === "validations") {
        return (
            <OperationsValidationView
                contents={contents}
                events={events}
                loadingContents={loadingContents}
                loadingEvents={loadingEvents}
                errorContents={errorContents}
                errorEvents={errorEvents}
                onReloadContents={loadContents}
                onReloadEvents={loadEvents}
                onValidateContent={handleValidateContent}
                onRejectContent={handleRejectContent}
                onValidateEvent={handleValidateEvent}
                onRejectEvent={handleRejectEvent}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}


