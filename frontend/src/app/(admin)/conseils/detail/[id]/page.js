"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConseilAdminDetailView from "../../../../components/conseils/ConseilAdminDetailView";
import ConseilPublicDetailView from "../../../../components/conseils/ConseilPublicDetailView";
import ConseilRejectModal from "../../../../components/conseils/ConseilRejectModal";
import { TOKEN_KEY, apiUrl, buildAuthHeaders } from "../../../../lib/api";
import {
    CONSEIL_LIST_ALL,
    CONSEIL_LIST_FAVORIS,
    CONSEIL_LIST_PENDING,
    conseilDetailHref,
    safeBackPath,
} from "../../../../lib/conseilDetailRoutes";

function getUserRole() {
    try {
        const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.role || null;
    } catch {
        return null;
    }
}

export default function ConseilDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get("from");
    const role = getUserRole();
    const isAdmin = role === "admin";
    const isSalarie = role === "salarie";
    const isFeedUser = role === "particulier" || role === "professionnel";

    const defaultBack = isFeedUser
        ? (from?.includes("favoris") ? CONSEIL_LIST_FAVORIS : CONSEIL_LIST_ALL)
        : (from?.includes("en-attente") ? CONSEIL_LIST_PENDING : CONSEIL_LIST_ALL);
    const backHref = safeBackPath(from, defaultBack);

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectComment, setRejectComment] = useState("");
    const [rejectSaving, setRejectSaving] = useState(false);
    const [rejectError, setRejectError] = useState("");

    const loadItem = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError("");
        try {
            const url = isAdmin
                ? apiUrl(`/admin/salarie-contents/${id}`)
                : apiUrl(`/salarie/contents/${id}`);
            const res = await fetch(url, { headers: buildAuthHeaders() });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || "Conseil introuvable");
            setItem(data);
        } catch (err) {
            setError(String(err?.message || "Impossible de charger le conseil."));
            setItem(null);
        } finally {
            setLoading(false);
        }
    }, [id, isAdmin]);

    useEffect(() => {
        loadItem();
    }, [loadItem]);

    const goBack = () => router.push(backHref);

    const parseResponse = async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Erreur API");
        return data;
    };

    const handleDelete = async (target) => {
        if (!window.confirm(`Supprimer le conseil "${target.title}" ?`)) return;
        try {
            const res = await fetch(apiUrl(`/admin/salarie-contents/${target.id}`), {
                method: "DELETE",
                headers: buildAuthHeaders(),
            });
            await parseResponse(res);
            router.push(backHref);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de supprimer."));
        }
    };

    const handleValidate = async (target) => {
        try {
            const res = await fetch(apiUrl(`/admin/salarie-contents/${target.id}/validate`), {
                method: "POST",
                headers: buildAuthHeaders(),
            });
            await parseResponse(res);
            router.push(backHref);
        } catch (err) {
            window.alert(String(err?.message || "Erreur lors de la validation."));
        }
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        setRejectError("");
        if (!rejectComment.trim()) {
            setRejectError("Veuillez indiquer un motif de refus.");
            return;
        }
        setRejectSaving(true);
        try {
            const res = await fetch(apiUrl(`/admin/salarie-contents/${id}/reject`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ comment: rejectComment.trim() }),
            });
            await parseResponse(res);
            setRejectOpen(false);
            router.push(backHref);
        } catch (err) {
            setRejectError(String(err?.message || "Erreur lors du refus."));
        } finally {
            setRejectSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Chargement du conseil…</div>
        );
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

    if (isAdmin) {
        return (
            <>
                <ConseilAdminDetailView
                    item={item}
                    onBack={goBack}
                    onEdit={() => router.push(`/conseils/modifier/${item.id}?from=${encodeURIComponent(conseilDetailHref(item.id, backHref))}`)}
                    onDelete={handleDelete}
                    onValidate={handleValidate}
                    onOpenReject={() => {
                        setRejectComment("");
                        setRejectError("");
                        setRejectOpen(true);
                    }}
                />
                <ConseilRejectModal
                    open={rejectOpen}
                    comment={rejectComment}
                    setComment={setRejectComment}
                    saving={rejectSaving}
                    error={rejectError}
                    onSubmit={handleRejectSubmit}
                    onClose={() => setRejectOpen(false)}
                />
            </>
        );
    }

    return (
        <ConseilPublicDetailView
            item={item}
            onBack={goBack}
            showEngagement={isFeedUser}
            showEngagementInsights={isSalarie}
            engagementApiPrefix="salarie"
        />
    );
}
