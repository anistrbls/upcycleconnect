"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import OperationsValidationView from "../../../components/admin/OperationsValidationView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

const OPERATIONS_VALIDATION_TABS = new Set(["conseils", "evenements", "annonces", "projets", "remboursements"]);

function OperationsValidationsWithTab(props) {
    const searchParams = useSearchParams();
    const tab = searchParams.get("tab");
    const initialTab = tab && OPERATIONS_VALIDATION_TABS.has(tab) ? tab : undefined;
    return <OperationsValidationView {...props} initialTab={initialTab} />;
}

export default function OperationsSubPage({ params }) {
    const { subpage } = use(params);
    const router = useRouter();

    useEffect(() => {
        if (subpage === "notifications") {
            router.replace("/operations/validations");
        }
    }, [subpage, router]);

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

    // Demandes de remboursement événements
    const [eventRefundRequests, setEventRefundRequests] = useState([]);
    const [loadingRefundRequests, setLoadingRefundRequests] = useState(false);
    const [errorRefundRequests, setErrorRefundRequests] = useState("");

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
            const res = await fetch(apiUrl("/admin/events?validationStatus=pending"), { headers: buildAuthHeaders() });
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
            const res = await fetch(apiUrl(`/admin/items?status=${encodeURIComponent("en attente")}`), { headers: buildAuthHeaders() });
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
            const res = await fetch(apiUrl("/admin/projects?moderationStatus=pending"), { headers: buildAuthHeaders() });
            const data = await parseResponse(res);
            setProjects(data.projects || []); // Note: le backend renvoie "projects" pour la liste admin
        } catch (err) {
            setErrorProjects(String(err?.message || "Impossible de charger les projets."));
        } finally {
            setLoadingProjects(false);
        }
    };

    const loadRefundRequests = async () => {
        setLoadingRefundRequests(true);
        setErrorRefundRequests("");
        try {
            const res = await fetch(apiUrl("/admin/event-refund-requests"), { headers: buildAuthHeaders() });
            const data = await parseResponse(res);
            setEventRefundRequests(data.items || []);
        } catch (err) {
            setErrorRefundRequests(String(err?.message || "Impossible de charger les demandes de remboursement."));
        } finally {
            setLoadingRefundRequests(false);
        }
    };

    const handleEventRefundDecision = async (registrationId, payload) => {
        const res = await fetch(apiUrl(`/admin/event-registrations/${registrationId}/refund-decision`), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Erreur API");
        return data;
    };

    useEffect(() => {
        if (subpage === "validations") {
            loadContents();
            loadEvents();
            loadItems();
            loadProjects();
            loadRefundRequests();
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

    if (subpage === "notifications") {
        return (
            <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                Redirection vers Validation…
            </div>
        );
    }

    if (subpage === "validations") {
        return (
            <Suspense fallback={<div className="panel" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>Chargement de la validation…</div>}>
                <OperationsValidationsWithTab
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
                    eventRefundRequests={eventRefundRequests}
                    loadingRefundRequests={loadingRefundRequests}
                    errorRefundRequests={errorRefundRequests}
                    onReloadRefundRequests={loadRefundRequests}
                    onEventRefundDecision={handleEventRefundDecision}
                />
            </Suspense>
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}


