"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CategoryAdminView from "../../../components/admin/offers/CategoryAdminView";
import ServiceAdminView from "../../../components/admin/offers/ServiceAdminView";
import ServiceFormView from "../../../components/admin/offers/ServiceFormView";
import OverviewStats from "../../../components/admin/offers/OverviewStats";
import ReservationsAdminView from "../../../components/admin/offers/ReservationsAdminView";
import PricingAdminView from "../../../components/admin/offers/PricingAdminView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";
import { buildServiceCreatePayload } from "../../../components/admin/offers/serviceFormState";

export default function OffersSubPage({ params }) {
    const { subpage } = use(params);
    const router = useRouter();

    const activeModule = getModuleByKey("offres-prestations");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    // ------------------------------------------------------------------ //
    //  États partagés
    // ------------------------------------------------------------------ //
    const [serviceCategories, setServiceCategories] = useState([]);
    const [services, setServices]                   = useState([]);
    const [bookings, setBookings]                   = useState([]);
    const [employees, setEmployees]                 = useState([]);
    const [pricingRules, setPricingRules]           = useState([]);
    const [overviewData, setOverviewData]           = useState(null);

    const [offersLoading, setOffersLoading]   = useState(false);
    const [offersError, setOffersError]       = useState("");
    const [isSaving, setIsSaving]             = useState(false);

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

    const loadEmployees = useCallback(async () => {
        const res = await fetch(apiUrl("/admin/users?role=salarie"), { headers: buildAuthHeaders() });
        const data = await parseApiResponse(res);
        setEmployees(data.items ?? []);
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
            if (subpage === "prestations" || subpage === "categories-prestations" || subpage === "ajouter") {
                await Promise.all([loadServiceCategories(), loadServices(), loadEmployees()]);
            } else if (subpage === "reservations") {
                await Promise.all([loadBookings(), loadServices(), loadEmployees()]);
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
    }, [subpage, loadServiceCategories, loadServices, loadBookings, loadEmployees, loadPricing, loadOverview]);

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
        setIsSaving(true);
        setOffersError("");
        try {
            const res = await fetch(apiUrl("/admin/services"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload),
            });
            await parseApiResponse(res);
            await loadServices();
            router.push("/offres-prestations/prestations");
        } catch (err) {
            setOffersError(String(err?.message || "Erreur lors de la création."));
        } finally {
            setIsSaving(false);
        }
    };

    const updateService = async (id, payload) => {
        setIsSaving(true);
        setOffersError("");
        try {
            const res = await fetch(apiUrl(`/admin/services/${id}`), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload),
            });
            await parseApiResponse(res);
            await loadServices();
            router.push("/offres-prestations/prestations");
        } catch (err) {
            setOffersError(String(err?.message || "Erreur lors de la modification."));
        } finally {
            setIsSaving(false);
        }
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

    const duplicateService = async (id) => {
        const getRes = await fetch(apiUrl(`/admin/services/${id}`), { headers: buildAuthHeaders() });
        const service = await parseApiResponse(getRes);
        const payload = buildServiceCreatePayload(service, {
            name: `${service.name} (copie)`,
            status: "brouillon",
        });
        const res = await fetch(apiUrl("/admin/services"), {
            method: "POST",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
        });
        const created = await parseApiResponse(res);
        await loadServices();
        return created;
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

    const assignEmployee = async (id, employeeId) => {
        const res = await fetch(apiUrl(`/admin/reservations/${id}/assign`), {
            method: "PATCH",
            headers: buildAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ employeeId }),
        });
        await parseApiResponse(res);
        await loadBookings();
    };

    const deleteBooking = async (id) => {
        const res = await fetch(apiUrl(`/admin/reservations/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
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

    const deletePricingRule = async (id) => {
        const res = await fetch(apiUrl(`/admin/pricing/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
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

    if (subpage === "ajouter") {
        return (
            <div style={{ width: "100%", animation: "fadeIn 0.5s ease-out" }}>
                <header style={{ marginBottom: "2.5rem" }}>
                    <p className="activities-label">Offres & Prestations</p>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.5rem 0", letterSpacing: "-0.02em" }}>Publier une prestation</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Créez et configurez une nouvelle offre pour vos clients et utilisateurs.</p>
                </header>
                <ServiceFormView
                    categories={serviceCategories}
                    employees={employees}
                    onSubmit={createService}
                    onCancel={() => router.push("/offres-prestations/prestations")}
                    isSaving={isSaving}
                    externalError={offersError}
                />
            </div>
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
                onDelete={deleteService}
                onToggleStatus={toggleServiceStatus}
                onDuplicate={duplicateService}
            />
        );
    }

    if (subpage === "reservations") {
        return (
            <ReservationsAdminView
                bookings={bookings}
                services={services}
                employees={employees}
                loading={offersLoading}
                errorMessage={offersError}
                onReload={refresh}
                onUpdateStatus={updateBookingStatus}
                onAssignEmployee={assignEmployee}
                onDelete={deleteBooking}
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
                onDelete={deletePricingRule}
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label ?? subpage} />;
}
