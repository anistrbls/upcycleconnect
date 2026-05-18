"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PlanningAdminView from "../../../components/admin/planning/PlanningAdminView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";
import { mapBookingsForPlanning } from "../../../lib/planningBookings";

export default function SalariePlanningPage({ params }) {
    const { subpage } = use(params);
    const router = useRouter();
    
    const [events, setEvents] = useState([]);
    const [slots, setSlots] = useState([]);
    const [unavailabilities, setUnavailabilities] = useState([]);
    const [services, setServices] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const activeModule = getModuleByKey("salarie-planning");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const headers = buildAuthHeaders();
            
            // 1. Get current user
            const meRes = await fetch(apiUrl("/auth/me"), { headers });
            const meData = await meRes.json();
            const user = meData.user || meData; // Fallback just in case
            setCurrentUser(user);

            // 2. Fetch data parallelly
            const empId = user.id || user.userId || user.ID;
            const [evRes, slRes, unRes, svRes, bkRes] = await Promise.all([
                fetch(apiUrl("/admin/events"), { headers }),
                fetch(apiUrl(`/admin/service-slots?employeeId=${empId}`), { headers }),
                fetch(apiUrl(`/admin/employee-unavailabilities?employeeId=${empId}`), { headers }),
                fetch(apiUrl("/admin/services"), { headers }),
                fetch(apiUrl(`/admin/reservations?employeeId=${empId}`), { headers }),
            ]);

            if (evRes.ok) {
                const d = await evRes.json();
                setEvents((d.items || []).filter(e => e.validationStatus !== "rejected" && (e.intervenantId === user.id || !e.intervenantId)));
            }
            if (slRes.ok) {
                const d = await slRes.json();
                setSlots(d.items || []);
            }
            if (unRes.ok) {
                const d = await unRes.json();
                setUnavailabilities(d.items || []);
            }
            if (svRes.ok) {
                const d = await svRes.json();
                const svcList = d.items || [];
                setServices(svcList);
                if (bkRes.ok) {
                    const bk = await bkRes.json();
                    setBookings(mapBookingsForPlanning(bk.items || [], svcList));
                } else {
                    setBookings([]);
                }
            } else if (bkRes.ok) {
                const bk = await bkRes.json();
                setBookings(mapBookingsForPlanning(bk.items || [], []));
            }
        } catch (err) {
            console.error("Failed to load planning data", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (subpage === "agenda") {
        return (
            <div style={{ display: "grid", gap: "1.5rem" }}>
                <div className="header-section">
                    <div className="title-area">
                        <span className="activities-label">Espace salarié</span>
                        <h1>Mon Planning</h1>
                    </div>
                </div>
                {!currentUser ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement du profil…</p>
                ) : (() => {
                    const empId = currentUser.id || currentUser.userId || currentUser.ID;
                    return (
                        <PlanningAdminView 
                            key={empId}
                            events={events}
                            slots={slots}
                            bookings={bookings}
                            unavailabilities={unavailabilities}
                            services={services}
                            employeeId={empId}
                            onReload={loadData}
                            loading={loading}
                        />
                    );
                })()}
            </div>
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}
