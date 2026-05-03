"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventPlanningView from "../../../components/admin/events/EventPlanningView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function SalariePlanningPage({ params }) {
    const { subpage } = use(params);
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    const activeModule = getModuleByKey("salarie-planning");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch(apiUrl("/admin/events"), { headers: buildAuthHeaders() });
                if (res.ok) {
                    const d = await res.json();
                    setEvents((d.items || []).filter(e => e.validationStatus !== "rejected"));
                }
            } catch { /* silencieux */ }
            finally { setLoading(false); }
        };
        load();
    }, []);

    // Le planning réutilise directement EventPlanningView existant
    if (subpage === "agenda") {
        return (
            <>
                <div className="header-section">
                    <div className="title-area">
                        <span className="activities-label">Espace salarié</span>
                        <h1>Planning</h1>
                    </div>
                </div>
                {loading
                    ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>
                    : <EventPlanningView events={events} onOpenEvent={(item) => router.push(`/evenements/tous-evenements?id=${item.id}`)} />
                }
            </>
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}
