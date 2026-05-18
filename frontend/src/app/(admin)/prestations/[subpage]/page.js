"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CatalogueView from "../../../components/user/prestations/CatalogueView";
import MyBookingsView from "../../../components/user/prestations/MyBookingsView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";
import { buildServicesCatalogueUrl, filterServicesForRole } from "../../../lib/catalogueAudience";
import { useCatalogueReadOnly } from "../../../lib/useCatalogueReadOnly";

export default function PrestationsUserPage({ params }) {
    const { subpage } = use(params);
    const router = useRouter();
    const { readOnly, role, checked } = useCatalogueReadOnly();

    const activeModule = getModuleByKey("prestations");
    const activeSub = getSubNavItem("prestations", subpage);

    const [services, setServices] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const parseApiResponse = async (response) => {
        let data = null;
        try { data = await response.json(); } catch { data = null; }
        if (!response.ok) {
            throw new Error(data?.error || "Une erreur API est survenue.");
        }
        return data;
    };

    const loadCatalogue = useCallback(async () => {
        const url = buildServicesCatalogueUrl(apiUrl("/services"), role);
        const res = await fetch(url, { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setServices(filterServicesForRole(data.items ?? [], role));
    }, [role]);

    const loadBookings = useCallback(async () => {
        const res = await fetch(apiUrl("/bookings/mine"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setBookings(data.items ?? []);
    }, []);

    const refresh = useCallback(async () => {
        if (subpage === "catalogue" && !checked) return;

        setLoading(true);
        setError("");
        try {
            if (subpage === "catalogue") {
                await loadCatalogue();
            } else if (subpage === "mes-reservations") {
                await loadBookings();
            }
        } catch (err) {
            setError(String(err?.message || "Impossible de charger les données."));
        } finally {
            setLoading(false);
        }
    }, [subpage, loadCatalogue, loadBookings, checked]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (checked && readOnly && subpage === "mes-reservations") {
            router.replace("/prestations/catalogue");
        }
    }, [checked, readOnly, subpage, router]);

    if (subpage === "catalogue") {
        return (
            <CatalogueView
                services={services}
                loading={loading}
                errorMessage={error}
                onReload={refresh}
                readOnly={readOnly}
            />
        );
    }

    if (subpage === "mes-reservations") {
        return <MyBookingsView bookings={bookings} loading={loading} errorMessage={error} onReload={refresh} />;
    }

    return <ModulePlaceholder moduleLabel={activeModule?.label} subLabel={activeSub?.label ?? subpage} />;
}
