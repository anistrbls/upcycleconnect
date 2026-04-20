"use client";

import { use, useEffect, useState } from "react";
import EventPlanningView from "../../../components/admin/events/EventPlanningView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function ParticulierPlanningPage({ params }) {
    const { subpage } = use(params);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(false);

    const activeModule = getModuleByKey("particulier-planning");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch(apiUrl("/events/my-registrations"), { headers: buildAuthHeaders() });
                if (res.ok) {
                    const d = await res.json();
                    setRegistrations(d.items || []);
                }
            } catch { /* silencieux */ }
            finally { setLoading(false); }
        };
        load();
    }, []);

    if (subpage === "agenda") {
        return (
            <>
                {loading ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>
                ) : registrations.length === 0 ? (
                    <>
                        <div className="header-section">
                            <div className="title-area">
                                <span className="activities-label">Espace particulier</span>
                                <h1>Mon planning</h1>
                            </div>
                        </div>
                        <div className="panel" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                                Vous n&apos;êtes inscrit à aucun événement pour le moment.
                            </p>
                        </div>
                    </>
                ) : (
                    <EventPlanningView
                        events={registrations}
                        onOpenEvent={() => {}}
                        title="Mon planning"
                        subtitle="Espace particulier"
                    />
                )}
            </>
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}
