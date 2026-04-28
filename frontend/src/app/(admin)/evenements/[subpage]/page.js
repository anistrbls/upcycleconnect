"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EventAdminView from "../../../components/admin/events/EventAdminView";
import EventCategoryAdminView from "../../../components/admin/events/EventCategoryAdminView";
import EventPlanningView from "../../../components/admin/events/EventPlanningView";
import EventValidationView from "../../../components/admin/events/EventValidationView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import ParticulierEvenementsView from "../../../components/particulier/ParticulierEvenementsView";
import EventDetailView from "../../../components/shared/events/EventDetailView";
import { TOKEN_KEY, apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function EventsSubPage({ params }) {
    const { subpage } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [events, setEvents] = useState([]);
    const [publicEvents, setPublicEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsError, setEventsError] = useState("");
    const [pendingOpenEventId, setPendingOpenEventId] = useState(null);

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
    const isParticulier = getUserRole() === "particulier";

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
    const selectedEventId = useMemo(() => searchParams.get("id"), [searchParams]);

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


    const loadSalaries = async () => {
        const response = await fetch(`${apiUrl("/admin/users")}?role=salarie`, {
            method: "GET",
            headers: buildAuthHeaders(),
        });

        const data = await parseApiResponse(response);
        setSalaries(data.items || []);
    };

    const loadPublicEvents = async () => {
        const response = await fetch(apiUrl("/events"), {
            method: "GET",
            headers: buildAuthHeaders(),
        });
        const data = await parseApiResponse(response);
        setPublicEvents(data.items || []);
    };

    const loadMyRegistrations = async () => {
        const response = await fetch(apiUrl("/events/my-registrations"), {
            method: "GET",
            headers: buildAuthHeaders(),
        });
        const data = await parseApiResponse(response);
        setMyRegistrations(data.items || []);
    };

    const refreshEventsData = async () => {
        setEventsLoading(true);
        setEventsError("");
        try {
            await Promise.all([loadEvents(), loadSalaries()]);
        } catch (err) {
            setEventsError(String(err?.message || "Impossible de charger les événements."));
        } finally {
            setEventsLoading(false);
        }
    };

    useEffect(() => {
        const successSessionId = searchParams.get("session_id");
        const isSuccess = searchParams.get("success") === "1" || searchParams.get("stripe") === "success";
        const isCancel = searchParams.get("stripe") === "cancel";
        const redirectEventId = searchParams.get("id");

        if (isParticulier && isSuccess && successSessionId) {
            const confirmWithRetry = async () => {
                let ok = false;
                let lastStatus = 0;
                let lastError = "";

                for (let attempt = 0; attempt < 6; attempt += 1) {
                    try {
                        const res = await fetch(apiUrl(`/events/confirm-payment?session_id=${encodeURIComponent(successSessionId)}`), {
                            method: "GET",
                            headers: buildAuthHeaders(),
                        });
                        const data = await res.json().catch(() => ({}));
                        lastStatus = res.status;
                        lastError = String(data?.error || "");

                        console.info("[Stripe confirm-payment] attempt", {
                            attempt: attempt + 1,
                            status: res.status,
                            ok: res.ok,
                            error: lastError || null,
                            sessionId: successSessionId,
                        });

                        if (res.ok) {
                            ok = true;
                            break;
                        }
                    } catch (err) {
                        lastError = String(err?.message || "network_error");
                        console.warn("[Stripe confirm-payment] attempt failed", {
                            attempt: attempt + 1,
                            error: lastError,
                            sessionId: successSessionId,
                        });
                        // Retry on transient network/API failures.
                    }

                    if (attempt < 5) {
                        await new Promise((resolve) => setTimeout(resolve, 1200));
                    }
                }

                const nextParams = new URLSearchParams();
                if (redirectEventId) {
                    nextParams.set("id", redirectEventId);
                }
                nextParams.set("payment", ok ? "success" : "failed");

                if (!ok) {
                    console.warn("[Stripe confirm-payment] final failure", {
                        status: lastStatus || null,
                        error: lastError || null,
                        sessionId: successSessionId,
                        eventId: redirectEventId || null,
                    });
                }

                router.replace(`/evenements/activites?${nextParams.toString()}`);
            };

            confirmWithRetry();
            return;
        }

        if (isParticulier && isCancel && redirectEventId) {
            fetch(apiUrl(`/events/${encodeURIComponent(redirectEventId)}/register`), {
                method: "DELETE",
                headers: buildAuthHeaders(),
            })
                .catch(() => null)
                .finally(() => {
                    router.replace(`/evenements/activites?id=${redirectEventId}&payment=failed`);
                });
            return;
        }

        if (isParticulier) {
            setEventsLoading(true);
            setEventsError("");
            Promise.all([loadPublicEvents(), loadMyRegistrations()])
                .catch((err) => setEventsError(String(err?.message || "Impossible de charger les activités.")))
                .finally(() => setEventsLoading(false));
            return;
        }
        if (subpage === "tous-evenements" || subpage === "planning" || subpage === "moderation") {
            refreshEventsData();
        }
        if (subpage === "activites") {
            setEventsLoading(true);
            setEventsError("");
            loadPublicEvents()
                .catch((err) => setEventsError(String(err?.message || "Impossible de charger les activités.")))
                .finally(() => setEventsLoading(false));
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

    if (selectedEventId && (subpage === "tous-evenements" || subpage === "activites" || subpage === "mes-inscriptions")) {
        return (
            <EventDetailView
                eventId={selectedEventId}
                onBack={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete("id");
                    const query = params.toString();
                    router.push(query ? `/evenements/${subpage}?${query}` : `/evenements/${subpage}`);
                }}
            />
        );
    }

    if (isParticulier && (subpage === "activites" || subpage === "mes-inscriptions")) {
        return (
            <ParticulierEvenementsView
                events={publicEvents}
                registrations={myRegistrations}
                loading={eventsLoading}
                errorMessage={eventsError}
                subpage={subpage}
                onReload={() => {
                    setEventsLoading(true);
                    Promise.all([loadPublicEvents(), loadMyRegistrations()])
                        .catch(() => {})
                        .finally(() => setEventsLoading(false));
                }}
            />
        );
    }

    if (subpage === "tous-evenements") {
        return (
            <EventAdminView
                events={events}
                categories={[]}
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


    if (subpage === "planning" && !isParticulier) {
        return (
            <EventPlanningView 
                events={events} 
                onOpenEvent={openEventFromPlanning} 
                title="Planning des événements" 
                subtitle="Événements" 
            />
        );
    }

    if (subpage === "moderation" && !isParticulier) {
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

    if (subpage === "agenda") {
        return (
            <>
                {eventsLoading ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>
                ) : (
                    <EventPlanningView
                        events={myRegistrations}
                        onOpenEvent={() => {}}
                        title="Mon planning"
                        subtitle="Espace particulier"
                    />
                )}
            </>
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />;
}
