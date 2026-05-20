"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConseilFormPage from "../../../../../components/conseils/ConseilFormPage";
import { apiUrl, buildAuthHeaders, TOKEN_KEY } from "../../../../../lib/api";
import { EMPTY_CONSEIL_FORM } from "../../../../../lib/conseilConstants";
import { itemToConseilForm, validateConseilForm, buildConseilPayload } from "../../../../../lib/conseilFormUtils";

export default function SalarieConseilModifierPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [editingItem, setEditingItem] = useState(null);
    const [formState, setFormState] = useState(EMPTY_CONSEIL_FORM);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");
    const [authorName, setAuthorName] = useState("");

    useEffect(() => {
        try {
            const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
            if (token) {
                const payload = JSON.parse(atob(token.split(".")[1]));
                setAuthorName(payload.name || payload.sub || "");
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(apiUrl("/salarie/contents"), { headers: buildAuthHeaders() });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Erreur");
                const item = (data.items || []).find((i) => String(i.id) === String(id));
                if (!item) throw new Error("Conseil introuvable.");
                setEditingItem(item);
                setFormState(itemToConseilForm(item));
            } catch (err) {
                setLocalError(String(err?.message || "Impossible de charger le conseil."));
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleSalarieSubmit = async (status) => {
        setLocalError("");
        const errMsg = validateConseilForm(formState);
        if (errMsg) { setLocalError(errMsg); return; }
        setIsSaving(true);
        try {
            const res = await fetch(apiUrl(`/salarie/contents/${id}`), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(buildConseilPayload({ ...formState, status })),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || "Erreur lors de la mise à jour.");
            router.push(status === "brouillon" ? "/salarie-contenu/brouillons" : "/salarie-contenu/conseils");
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
                <button type="button" className="action-cta task-action-btn" style={{ marginTop: "1rem" }} onClick={() => router.push("/salarie-contenu/conseils")}>
                    Retour
                </button>
            </div>
        );
    }

    return (
        <ConseilFormPage
            mode="salarie"
            editingItem={editingItem}
            formState={formState}
            setFormState={setFormState}
            authorName={authorName}
            isSaving={isSaving}
            localError={localError}
            onSalarieSubmit={handleSalarieSubmit}
            onCancel={() => router.push("/salarie-contenu/conseils")}
        />
    );
}
