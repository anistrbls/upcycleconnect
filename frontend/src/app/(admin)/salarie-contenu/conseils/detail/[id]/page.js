"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConseilPublicDetailView from "../../../../../components/conseils/ConseilPublicDetailView";
import { apiUrl, buildAuthHeaders } from "../../../../../lib/api";
import { SALARIE_CONSEIL_DRAFTS, SALARIE_CONSEIL_LIST, safeBackPath } from "../../../../../lib/conseilDetailRoutes";

export default function SalarieConseilDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get("from");
    const backHref = safeBackPath(from, from?.includes("brouillons") ? SALARIE_CONSEIL_DRAFTS : SALARIE_CONSEIL_LIST);

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadItem = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(apiUrl(`/salarie/contents/${id}`), { headers: buildAuthHeaders() });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || "Conseil introuvable");
            setItem(data);
        } catch (err) {
            setError(String(err?.message || "Impossible de charger le conseil."));
            setItem(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadItem();
    }, [loadItem]);

    const goBack = () => router.push(backHref);

    if (loading) {
        return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Chargement du conseil…</div>;
    }

    if (error || !item) {
        return (
            <div style={{ padding: "2rem" }}>
                <p style={{ color: "#a23b3b" }}>{error || "Conseil introuvable."}</p>
                <button type="button" className="action-cta task-action-btn" style={{ marginTop: "1rem" }} onClick={goBack}>
                    Retour
                </button>
            </div>
        );
    }

    const canEdit = item.status === "brouillon" || item.status === "en_attente";

    return (
        <ConseilPublicDetailView
            item={item}
            onBack={goBack}
            showEngagement={item.status === "publie"}
            onEdit={canEdit ? () => router.push(`/salarie-contenu/conseils/${item.id}/modifier`) : undefined}
        />
    );
}
