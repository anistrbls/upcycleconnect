"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ServiceFormView from "../../../../../components/admin/offers/ServiceFormView";
import { apiUrl, buildAuthHeaders } from "../../../../../lib/api";

export default function ServiceModifierPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [service, setService] = useState(null);
    const [categories, setCategories] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const loadData = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setNotFound(false);
        setFetchError("");
        try {
            const [serviceRes, categoriesRes, employeesRes] = await Promise.all([
                fetch(apiUrl(`/admin/services/${id}`), { headers: buildAuthHeaders() }),
                fetch(apiUrl("/admin/service-categories"), { headers: buildAuthHeaders() }),
                fetch(apiUrl("/admin/users?role=salarie"), { headers: buildAuthHeaders() }),
            ]);

            if (serviceRes.status === 404) {
                setService(null);
                setNotFound(true);
                return;
            }

            const serviceData = await serviceRes.json();
            if (!serviceRes.ok) {
                throw new Error(serviceData?.error || "Impossible de charger la prestation.");
            }

            const categoriesData = await categoriesRes.json();
            if (categoriesRes.ok) {
                setCategories(categoriesData.items ?? []);
            }

            const employeesData = await employeesRes.json();
            if (employeesRes.ok) {
                setEmployees(employeesData.items ?? []);
            }

            setService(serviceData);
        } catch (err) {
            setService(null);
            setFetchError(String(err?.message || "Erreur de chargement."));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async (payload) => {
        setIsSaving(true);
        setSaveError("");
        try {
            const res = await fetch(apiUrl(`/admin/services/${id}`), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Erreur lors de la modification.");
            router.push(`/offres-prestations/prestations/${id}`);
        } catch (err) {
            setSaveError(String(err?.message || "Erreur lors de la modification."));
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <p style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Chargement du formulaire…</p>;
    }

    if (notFound) {
        return (
            <div>
                <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>Prestation introuvable.</p>
                <button type="button" className="action-cta task-action-btn" onClick={() => router.push("/offres-prestations/prestations")}>
                    Retour aux prestations
                </button>
            </div>
        );
    }

    if (fetchError || !service) {
        return (
            <div>
                <p style={{ color: "#a23b3b", marginBottom: "1rem" }}>{fetchError || "Prestation indisponible."}</p>
                <button type="button" className="action-cta task-action-btn" onClick={() => router.push("/offres-prestations/prestations")}>
                    Retour aux prestations
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: "100%", animation: "fadeIn 0.5s ease-out" }}>
            <header style={{ marginBottom: "2.5rem" }}>
                <p className="activities-label">Offres & Prestations</p>
                <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.5rem 0", letterSpacing: "-0.02em" }}>
                    Modifier la prestation
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
                    Mettez à jour tous les champs de « {service.name} ». Les médias et paramètres existants sont déjà chargés.
                </p>
            </header>
            <ServiceFormView
                key={service.id}
                categories={categories}
                employees={employees}
                initialData={service}
                onSubmit={handleSubmit}
                onCancel={() => router.push(`/offres-prestations/prestations/${id}`)}
                isSaving={isSaving}
                externalError={saveError}
            />
        </div>
    );
}
