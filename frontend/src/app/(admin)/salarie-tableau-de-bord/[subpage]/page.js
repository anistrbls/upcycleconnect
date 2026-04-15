"use client";

import { use, useEffect, useState } from "react";
import SalarieDashboard from "../../../components/salarie/SalarieDashboard";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function SalarieDashboardPage({ params }) {
    const { subpage } = use(params);
    const [events, setEvents] = useState([]);
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);

    const activeModule = getModuleByKey("salarie-tableau-de-bord");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [evRes, coRes] = await Promise.all([
                    fetch(apiUrl("/admin/events"), { headers: buildAuthHeaders() }),
                    fetch(apiUrl("/salarie/contents"), { headers: buildAuthHeaders() }),
                ]);
                if (evRes.ok) { const d = await evRes.json(); setEvents(d.items || []); }
                if (coRes.ok) { const d = await coRes.json(); setContents(d.items || []); }
            } catch { /* silencieux */ }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const validSubpages = ["resume", "prochains-evenements", "en-attente"];
    if (!validSubpages.includes(subpage)) {
        return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
    }

    return <SalarieDashboard subpage={subpage} events={events} contents={contents} loading={loading} />;
}
