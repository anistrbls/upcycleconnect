"use client";

import { use, useEffect, useState, useCallback } from "react";
import CategoryAdminView from "../../../components/admin/offers/CategoryAdminView";
import ServiceAdminView from "../../../components/admin/offers/ServiceAdminView";
import OverviewStats from "../../../components/admin/offers/OverviewStats";
import ReservationsAdminView from "../../../components/admin/offers/ReservationsAdminView";
import PricingAdminView from "../../../components/admin/offers/PricingAdminView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function OffersSubPage({ params }) {
    const { subpage } = use(params);

    const activeModule = getModuleByKey("offres-prestations");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    // ------------------------------------------------------------------ //
    //  États partagés
    // ------------------------------------------------------------------ //
    const [serviceCategories, setServiceCategories] = useState([]);
    const [services, setServices]                   = useState([]);
    const [bookings, setBookings]                   = useState([]);
    const [pricingRules, setPricingRules]           = useState([]);
    const [overviewData, setOverviewData]           = useState(null);

    const [offersLoading, setOffersLoading]   = useState(false);
    const [offersError, setOffersError]       = useState("");

    // ------------------------------------------------------------------ //
    //  Utilitaire fetch
    // ------------------------------------------------------------------ //
    const parseApiResponse = async (response) => {
        let data = null;
        try { data = await response.json(); } catch { data = null; }
        if (!response.ok) {
            throw new Error(data?.error || "Une erreur API est survenue.");
        }
        return data;
    };

    // ------------------------------------------------------------------ //
    //  Loaders individuels
    // ------------------------------------------------------------------ //
    const loadServiceCategories = useCallback(async () => {
        const res = await fetch(apiUrl("/admin/service-categories"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setServiceCategories(data.items ?? []);
    }, []);

    const loadServices = useCallback(async () => {
        const res = await fetch(apiUrl("/admin/services"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setServices(data.items ?? []);
    }, []);

    const loadBookings = useCallback(async () => {
        const res = await fetch(apiUrl("/admin/reservations"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setBookings(data.items ?? []);
    }, []);

    const loadPricing = useCallback(async () => {
        const res = await fetch(apiUrl("/admin/pricing"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setPricingRules(data.items ?? []);
    }, []);

    const loadOverview = useCallback(async () => {
        const res = await fetch(apiUrl("/admin/offers/overview"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setOverviewData(data);
    }, []);

    // ------------------------------------------------------------------ //
    //  Refresh selon la sous-page active
    // ------------------------------------------------------------------ //
    const refresh = useCallback(async () => {
        setOffersLoading(true);
        setOffersError("");
        try {
            if (subpage === "prestations" || subpage === "categories-prestations") {
                await Promise.all([loadServiceCategories(), loadServices()]);
            } else if (subpage === "reservations") {
                await Promise.all([loadBookings(), loadServices()]);
            } else if (subpage === "tarification") {
                await loadPricing();
            } else if (subpage === "vue-ensemble") {
                await loadOverview();
            }
        } catch (err) {
            setOffersError(String(err?.message || "Impossible de charger les données."));
        } finally {
            setOffersLoading(false);
        }
    }, [subpage, loadServiceCategories, loadServices, loadBookings, loadPricing, loadOverview]);

    useEffect(() => { refresh(); }, [refresh]);

    // ------------------------------------------------------------------ //
    //  Handlers Catégories
    // ------------------------------------------------------------------ //
    const createCategory = async (payload) => {
        const res = await fetch(apiUrl("/admin/service-categories"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(res);
        await Promise.all([loadServiceCategories(), loadServices()]);
    };

    const updateCategory = async (id, payload) => {
        const res = await fetch(apiUrl(`/admin/service-categories/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(res);
        await Promise.all([loadServiceCategories(), loadServices()]);
    };

    const deleteCategory = async (id) => {
        const res = await fetch(apiUrl(`/admin/service-categories/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseApiResponse(res);
        await loadServiceCategories();
    };

    // ------------------------------------------------------------------ //
    //  Handlers Prestations
    // ------------------------------------------------------------------ //
    const createService = async (payload) => {
        const res = await fetch(apiUrl("/admin/services"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(res);
        await loadServices();
    };

    const updateService = async (id, payload) => {
        const res = await fetch(apiUrl(`/admin/services/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(res);
        await loadServices();
    };

    const deleteService = async (id) => {
        const res = await fetch(apiUrl(`/admin/services/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseApiResponse(res);
        await loadServices();
    };

    const toggleServiceStatus = async (id, status) => {
        const res = await fetch(apiUrl(`/admin/services/${id}/status`), {
            method: "PATCH",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ status }),
        });
        await parseApiResponse(res);
        await loadServices();
    };

    // ------------------------------------------------------------------ //
    //  Handlers Réservations
    // ------------------------------------------------------------------ //
    const updateBookingStatus = async (id, payload) => {
        const res = await fetch(apiUrl(`/admin/reservations/${id}/status`), {
            method: "PATCH",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(res);
        await loadBookings();
    };

    // ------------------------------------------------------------------ //
    //  Handlers Tarification
    // ------------------------------------------------------------------ //
    const createPricingRule = async (payload) => {
        const res = await fetch(apiUrl("/admin/pricing"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(res);
        await loadPricing();
    };

    const updatePricingRule = async (id, payload) => {
        const res = await fetch(apiUrl(`/admin/pricing/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(res);
        await loadPricing();
    };

    // ------------------------------------------------------------------ //
    //  Routage par sous-page
    // ------------------------------------------------------------------ //
    if (subpage === "vue-ensemble") {
        return (
            <OverviewStats
                data={overviewData}
                loading={offersLoading}
                error={offersError}
                onReload={refresh}
            />
        );
    }

    if (subpage === "categories-prestations") {
        return (
            <CategoryAdminView
                categories={serviceCategories}
                loading={offersLoading}
                errorMessage={offersError}
                onReload={refresh}
                onCreate={createCategory}
                onUpdate={updateCategory}
                onDelete={deleteCategory}
            />
        );
    }

    if (subpage === "prestations") {
        return (
            <ServiceAdminView
                services={services}
                categories={serviceCategories}
                loading={offersLoading}
                errorMessage={offersError}
                onReload={refresh}
                onCreate={createService}
                onUpdate={updateService}
                onDelete={deleteService}
                onToggleStatus={toggleServiceStatus}
            />
        );
    }

    if (subpage === "reservations") {
        return (
            <ReservationsAdminView
                bookings={bookings}
                services={services}
                loading={offersLoading}
                errorMessage={offersError}
                onReload={refresh}
                onUpdateStatus={updateBookingStatus}
            />
        );
    }

    if (subpage === "tarification") {
        return (
            <PricingAdminView
                rules={pricingRules}
                loading={offersLoading}
                errorMessage={offersError}
                onReload={refresh}
                onCreate={createPricingRule}
                onUpdate={updatePricingRule}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label ?? subpage} />;
}
