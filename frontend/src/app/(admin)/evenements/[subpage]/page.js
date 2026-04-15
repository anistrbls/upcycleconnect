"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EventAdminView from "../../../components/admin/events/EventAdminView";
import EventCategoryAdminView from "../../../components/admin/events/EventCategoryAdminView";
import EventPlanningView from "../../../components/admin/events/EventPlanningView";
import EventValidationView from "../../../components/admin/events/EventValidationView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function EventsSubPage({ params }) {
    const { subpage } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [events, setEvents] = useState([]);
    const [eventCategories, setEventCategories] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsError, setEventsError] = useState("");
    const [pendingOpenEventId, setPendingOpenEventId] = useState(null);

    const activeModule = getModuleByKey("evenements");
    const activeSub = getSubNavItem(activeModule.key, subpage);
    const openEventId = useMemo(() => {
        const rawValue = searchParams.get("open");
        if (!rawValue) {
            return null;
        }
        const parsed = Number(rawValue);
        return Number.isNaN(parsed) ? null : parsed;
    }, [searchParams]);

    const parseApiResponse = async (response) => {
        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            const message = data?.error || "Une erreur API est survenue.";
            throw new Error(message);
        }

        return data;
    };

    const loadEvents = async () => {
        const response = await fetch(apiUrl("/admin/events"), {
            method: "GET",
            headers: buildAuthHeaders(),
        });

        const data = await parseApiResponse(response);
        setEvents(data.items || []);
    };

    const loadEventCategories = async () => {
        const response = await fetch(apiUrl("/admin/event-categories"), {
            method: "GET",
            headers: buildAuthHeaders(),
        });

        const data = await parseApiResponse(response);
        setEventCategories(data.items || []);
    };

    const loadSalaries = async () => {
        const response = await fetch(`${apiUrl("/admin/users")}?role=salarie`, {
            method: "GET",
            headers: buildAuthHeaders(),
        });

        const data = await parseApiResponse(response);
        setSalaries(data.items || []);
    };

    const refreshEventsData = async () => {
        setEventsLoading(true);
        setEventsError("");
        try {
            await Promise.all([loadEvents(), loadEventCategories(), loadSalaries()]);
        } catch (err) {
            setEventsError(String(err?.message || "Impossible de charger les événements."));
        } finally {
            setEventsLoading(false);
        }
    };

    useEffect(() => {
        if (subpage === "tous-evenements" || subpage === "planning" || subpage === "categories-evenements" || subpage === "validation") {
            refreshEventsData();
        }
    }, [subpage]);

    useEffect(() => {
        if (subpage === "tous-evenements" && openEventId) {
            setPendingOpenEventId(openEventId);
        }
    }, [subpage, openEventId]);

    const createEvent = async (payload) => {
        const response = await fetch(apiUrl("/admin/events"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        await refreshEventsData();
    };

    const createEventCategory = async (payload) => {
        const response = await fetch(apiUrl("/admin/event-categories"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        await refreshEventsData();
    };

    const updateEventCategory = async (id, payload) => {
        const response = await fetch(apiUrl(`/admin/event-categories/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        await refreshEventsData();
    };

    const deleteEventCategory = async (id) => {
        const response = await fetch(apiUrl(`/admin/event-categories/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseApiResponse(response);
        await refreshEventsData();
    };

    const updateEvent = async (id, payload) => {
        const response = await fetch(apiUrl(`/admin/events/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        await refreshEventsData();
    };

    const deleteEvent = async (id) => {
        const response = await fetch(apiUrl(`/admin/events/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseApiResponse(response);
        await refreshEventsData();
    };

    const validateEvent = async (id) => {
        const response = await fetch(apiUrl(`/admin/events/${id}/validate`), {
            method: "POST",
            headers: buildAuthHeaders(),
        });
        await parseApiResponse(response);
        await refreshEventsData();
    };

    const rejectEvent = async (id, comment) => {
        const response = await fetch(apiUrl(`/admin/events/${id}/reject`), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ comment }),
        });
        await parseApiResponse(response);
        await refreshEventsData();
    };

    const openEventFromPlanning = (eventItem) => {
        if (!eventItem?.id) {
            return;
        }

        router.push(`/evenements/tous-evenements?open=${eventItem.id}`);
    };

    const handleConsumedOpenEvent = () => {
        setPendingOpenEventId(null);
        if (searchParams.get("open")) {
            router.replace("/evenements/tous-evenements");
        }
    };

    if (subpage === "tous-evenements") {
        return (
            <EventAdminView
                events={events}
                categories={eventCategories}
                salaries={salaries}
                loading={eventsLoading}
                errorMessage={eventsError}
                onReload={refreshEventsData}
                onCreate={createEvent}
                onUpdate={updateEvent}
                onDelete={deleteEvent}
                onOpenEvent={openEventFromPlanning}
                pendingOpenEventId={pendingOpenEventId}
                onConsumedOpenEvent={handleConsumedOpenEvent}
            />
        );
    }

    if (subpage === "categories-evenements") {
        return (
            <EventCategoryAdminView
                categories={eventCategories}
                loading={eventsLoading}
                errorMessage={eventsError}
                onReload={refreshEventsData}
                onCreate={createEventCategory}
                onUpdate={updateEventCategory}
                onDelete={deleteEventCategory}
            />
        );
    }

    if (subpage === "planning") {
        return <EventPlanningView events={events} onOpenEvent={openEventFromPlanning} />;
    }

    if (subpage === "validation") {
        return (
            <EventValidationView
                events={events}
                loading={eventsLoading}
                errorMessage={eventsError}
                onReload={refreshEventsData}
                onValidate={validateEvent}
                onReject={rejectEvent}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />;
}
