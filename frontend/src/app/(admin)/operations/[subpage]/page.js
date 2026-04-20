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

    // Annonces
    const [items, setItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [errorItems, setErrorItems] = useState("");

    // Projets
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [errorProjects, setErrorProjects] = useState("");

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

    const loadItems = async () => {
        setLoadingItems(true);
        setErrorItems("");
        try {
            const res = await fetch(apiUrl("/admin/items?status=en_attente"), { headers: buildAuthHeaders() });
            const data = await parseResponse(res);
            setItems(data.items || []);
        } catch (err) {
            setErrorItems(String(err?.message || "Impossible de charger les annonces."));
        } finally {
            setLoadingItems(false);
        }
    };

    const loadProjects = async () => {
        setLoadingProjects(true);
        setErrorProjects("");
        try {
            const res = await fetch(apiUrl("/admin/projects?status=pending"), { headers: buildAuthHeaders() });
            const data = await parseResponse(res);
            setProjects(data.projects || []); // Note: le backend renvoie "projects" pour la liste admin
        } catch (err) {
            setErrorProjects(String(err?.message || "Impossible de charger les projets."));
        } finally {
            setLoadingProjects(false);
        }
    };

    useEffect(() => {
        if (subpage === "validations") {
            loadContents();
            loadEvents();
            loadItems();
            loadProjects();
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

    const handleValidateItem = async (id) => {
        const res = await fetch(apiUrl(`/admin/items/${id}/status`), {
            method: "PATCH",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ status: "actif" }),
        });
        await parseResponse(res);
        await loadItems();
    };

    const handleRejectItem = async (id, comment) => {
        const res = await fetch(apiUrl(`/admin/items/${id}/status`), {
            method: "PATCH",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ status: "refusee", moderation_note: comment }),
        });
        await parseResponse(res);
        await loadItems();
    };

    const handleValidateProject = async (id) => {
        const res = await fetch(apiUrl(`/admin/projects/${id}/moderate`), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ moderationStatus: "approved" }),
        });
        await parseResponse(res);
        await loadProjects();
    };

    const handleRejectProject = async (id, comment) => {
        const res = await fetch(apiUrl(`/admin/projects/${id}/moderate`), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ moderationStatus: "rejected", moderationNote: comment }),
        });
        await parseResponse(res);
        await loadProjects();
    };

    if (subpage === "validations") {
        return (
            <OperationsValidationView
                contents={contents}
                events={events}
                items={items}
                projects={projects}
                loadingContents={loadingContents}
                loadingEvents={loadingEvents}
                loadingItems={loadingItems}
                loadingProjects={loadingProjects}
                errorContents={errorContents}
                errorEvents={errorEvents}
                errorItems={errorItems}
                errorProjects={errorProjects}
                onReloadContents={loadContents}
                onReloadEvents={loadEvents}
                onReloadItems={loadItems}
                onReloadProjects={loadProjects}
                onValidateContent={handleValidateContent}
                onRejectContent={handleRejectContent}
                onValidateEvent={handleValidateEvent}
                onRejectEvent={handleRejectEvent}
                onValidateItem={handleValidateItem}
                onRejectItem={handleRejectItem}
                onValidateProject={handleValidateProject}
                onRejectProject={handleRejectProject}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}


