"use client";



import { use, useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { CONSEIL_LIST_ALL, safeBackPath } from "../../../../lib/conseilDetailRoutes";

import ConseilFormPage from "../../../../components/conseils/ConseilFormPage";

import { apiUrl, buildAuthHeaders } from "../../../../lib/api";

import { EMPTY_CONSEIL_FORM } from "../../../../lib/conseilConstants";

import { itemToConseilForm, validateConseilForm, buildConseilPayload } from "../../../../lib/conseilFormUtils";


export default function ConseilModifierPage({ params }) {

    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const backHref = safeBackPath(searchParams.get("from"), CONSEIL_LIST_ALL);

    const [editingItem, setEditingItem] = useState(null);

    const [formState, setFormState] = useState(EMPTY_CONSEIL_FORM);

    const [loading, setLoading] = useState(true);

    const [isSaving, setIsSaving] = useState(false);

    const [localError, setLocalError] = useState("");



    useEffect(() => {

        if (!id) return;

        (async () => {

            setLoading(true);

            setLocalError("");

            try {

                const res = await fetch(apiUrl(`/admin/salarie-contents/${id}`), { headers: buildAuthHeaders() });

                const data = await res.json();

                if (!res.ok) throw new Error(data?.error || "Conseil introuvable.");

                setEditingItem(data);

                setFormState(itemToConseilForm(data));

            } catch (err) {

                setLocalError(String(err?.message || "Impossible de charger le conseil."));

            } finally {

                setLoading(false);

            }

        })();

    }, [id]);



    const handleSubmit = async (e) => {

        e.preventDefault();

        setLocalError("");

        const errMsg = validateConseilForm(formState);

        if (errMsg) { setLocalError(errMsg); return; }

        setIsSaving(true);

        try {

            const res = await fetch(apiUrl(`/admin/salarie-contents/${id}`), {

                method: "PUT",

                headers: buildAuthHeaders({ "Content-Type": "application/json" }),

                body: JSON.stringify(buildConseilPayload(formState)),

            });

            const data = await res.json().catch(() => null);

            if (!res.ok) throw new Error(data?.error || "Erreur lors de la mise à jour.");

            router.push(backHref);

        } catch (err) {

            setLocalError(String(err?.message || "Une erreur est survenue."));

        } finally {

            setIsSaving(false);

        }

    };



    if (loading) {

        return <p style={{ padding: "2rem", color: "var(--text-muted)" }}>Chargement…</p>;

    }



    if (!editingItem && localError) {

        return (

            <div style={{ padding: "2rem" }}>

                <p style={{ color: "#a23b3b" }}>{localError}</p>

                <button type="button" className="action-cta task-action-btn" style={{ marginTop: "1rem" }} onClick={() => router.push(backHref)}>

                    Retour aux conseils

                </button>

            </div>

        );

    }



    return (

        <ConseilFormPage

            mode="admin"

            editingItem={editingItem}

            formState={formState}

            setFormState={setFormState}

            authorName={editingItem?.authorName || ""}

            isSaving={isSaving}

            localError={localError}

            onAdminSubmit={handleSubmit}

            onCancel={() => router.push(backHref)}

        />

    );

}

