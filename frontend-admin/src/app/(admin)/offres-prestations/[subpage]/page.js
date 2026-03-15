"use client";

import { use, useEffect, useState } from "react";
import CategoryAdminView from "../../../components/admin/offers/CategoryAdminView";
import ServiceAdminView from "../../../components/admin/offers/ServiceAdminView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function OffersSubPage({ params }) {
    const { subpage } = use(params);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [offersLoading, setOffersLoading] = useState(false);
    const [offersError, setOffersError] = useState("");

    const activeModule = getModuleByKey("offres-prestations");
    const activeSub = getSubNavItem(activeModule.key, subpage);

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

    const loadServiceCategories = async () => {
        const response = await fetch(apiUrl("/admin/service-categories"), {
            method: "GET",
            headers: buildAuthHeaders(),
        });

        const data = await parseApiResponse(response);
        setServiceCategories(data.items || []);
    };

    const loadServices = async () => {
        const response = await fetch(apiUrl("/admin/services"), {
            method: "GET",
            headers: buildAuthHeaders(),
        });

        const data = await parseApiResponse(response);
        setServices(data.items || []);
    };

    const refreshOffersData = async () => {
        setOffersLoading(true);
        setOffersError("");
        try {
            await Promise.all([loadServiceCategories(), loadServices()]);
        } catch (err) {
            setOffersError(String(err?.message || "Impossible de charger les données."));
        } finally {
            setOffersLoading(false);
        }
    };

    useEffect(() => {
        if (subpage === "prestations" || subpage === "categories-prestations") {
            refreshOffersData();
        }
    }, [subpage]);

    const createCategory = async (payload) => {
        const response = await fetch(apiUrl("/admin/service-categories"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        await refreshOffersData();
    };

    const updateCategory = async (id, payload) => {
        const response = await fetch(apiUrl(`/admin/service-categories/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        await refreshOffersData();
    };

    const deleteCategory = async (id) => {
        const response = await fetch(apiUrl(`/admin/service-categories/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseApiResponse(response);
        await refreshOffersData();
    };

    const createService = async (payload) => {
        const response = await fetch(apiUrl("/admin/services"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        await refreshOffersData();
    };

    const updateService = async (id, payload) => {
        const response = await fetch(apiUrl(`/admin/services/${id}`), {
            method: "PUT",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        await refreshOffersData();
    };

    const deleteService = async (id) => {
        const response = await fetch(apiUrl(`/admin/services/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseApiResponse(response);
        await refreshOffersData();
    };

    if (subpage === "categories-prestations") {
        return (
            <CategoryAdminView
                categories={serviceCategories}
                loading={offersLoading}
                errorMessage={offersError}
                onReload={refreshOffersData}
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
                onReload={refreshOffersData}
                onCreate={createService}
                onUpdate={updateService}
                onDelete={deleteService}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />;
}
