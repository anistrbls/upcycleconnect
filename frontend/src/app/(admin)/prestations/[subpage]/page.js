"use client";

import { use, useEffect, useState, useCallback } from "react";
import CatalogueView from "../../../components/user/prestations/CatalogueView";
import MyBookingsView from "../../../components/user/prestations/MyBookingsView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function PrestationsUserPage({ params }) {
    const { subpage } = use(params);

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
        const res = await fetch(apiUrl("/services"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setServices(data.items ?? []);
    }, []);

    const loadBookings = useCallback(async () => {
        const res = await fetch(apiUrl("/bookings/mine"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setBookings(data.items ?? []);
    }, []);

    const refresh = useCallback(async () => {
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
    }, [subpage, loadCatalogue, loadBookings]);

    useEffect(() => { refresh(); }, [refresh]);

    if (subpage === "catalogue") {
        return <CatalogueView services={services} loading={loading} errorMessage={error} onReload={refresh} />;
    }

    if (subpage === "mes-reservations") {
        return <MyBookingsView bookings={bookings} loading={loading} errorMessage={error} onReload={refresh} />;
    }

    return <ModulePlaceholder moduleLabel={activeModule?.label} subLabel={activeSub?.label ?? subpage} />;
}
