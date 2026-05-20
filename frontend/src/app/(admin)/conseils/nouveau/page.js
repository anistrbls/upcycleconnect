"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConseilFormPage from "../../../components/conseils/ConseilFormPage";
import { apiUrl, buildAuthHeaders, TOKEN_KEY } from "../../../lib/api";
import { EMPTY_CONSEIL_FORM } from "../../../lib/conseilConstants";
import { validateConseilForm, buildConseilPayload } from "../../../lib/conseilFormUtils";

export default function ConseilNouveauPage() {
    const router = useRouter();
    const [formState, setFormState] = useState(EMPTY_CONSEIL_FORM);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        const errMsg = validateConseilForm(formState);
        if (errMsg) { setLocalError(errMsg); return; }
        setIsSaving(true);
        try {
            const res = await fetch(apiUrl("/admin/salarie-contents"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(buildConseilPayload(formState)),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || "Erreur lors de la création.");
            router.push("/conseils/tous-conseils");
        } catch (err) {
            setLocalError(String(err?.message || "Une erreur est survenue."));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ConseilFormPage
            mode="admin"
            formState={formState}
            setFormState={setFormState}
            authorName={authorName}
            isSaving={isSaving}
            localError={localError}
            onAdminSubmit={handleSubmit}
            onCancel={() => router.push("/conseils/tous-conseils")}
        />
    );
}
