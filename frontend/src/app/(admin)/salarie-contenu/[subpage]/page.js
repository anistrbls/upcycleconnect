"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SalarieConseilFeedView from "../../../components/salarie/SalarieConseilFeedView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { appendConseilFiltersToUrl } from "../../../lib/conseilFormUtils";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default function SalarieContenuPage({ params }) {
    const { subpage } = use(params);
    const router = useRouter();
    const [contents, setContents] = useState([]);
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const activeModule = getModuleByKey("salarie-contenu");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    const parseResponse = async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Erreur API");
        return data;
    };

    const loadContents = async (filters = {}) => {
        setLoading(true);
        setError("");
        try {
            let feedUrl = null;
            if (subpage === "conseils") {
                feedUrl = appendConseilFiltersToUrl(apiUrl("/salarie/contents/feed"), filters);
            }
            const [ownRes, feedRes] = await Promise.all([
                fetch(apiUrl("/salarie/contents"), { headers: buildAuthHeaders() }),
                feedUrl
                    ? fetch(feedUrl, { headers: buildAuthHeaders() })
                    : Promise.resolve(null),
            ]);
            if (ownRes.ok) { const d = await ownRes.json(); setContents(d.items || []); }
            if (feedRes?.ok) { const d = await feedRes.json(); setFeedItems(d.items || []); }
        } catch (err) {
            setError(String(err?.message || "Impossible de charger le contenu."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (subpage === "favoris") {
            router.replace("/salarie-contenu/conseils");
            return;
        }
        loadContents();
    }, [subpage, router]);

    const handleDelete = async (id) => {
        const res = await fetch(apiUrl(`/salarie/contents/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(),
        });
        await parseResponse(res);
        await loadContents();
    };

    if (subpage === "conseils") {
        return (
            <SalarieConseilFeedView
                feedItems={feedItems}
                ownItems={contents}
                loading={loading}
                errorMessage={error}
                onDelete={handleDelete}
                onReload={loadContents}
            />
        );
    }

    if (subpage === "brouillons") {
        const workspaceItems = contents.filter(
            (i) => i.type === "conseil" && (i.status === "brouillon" || i.status === "en_attente")
        );
        return (
            <SalarieConseilFeedView
                feedItems={[]}
                ownItems={workspaceItems}
                loading={loading}
                errorMessage={error}
                onDelete={handleDelete}
                draftOnly
            />
        );
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}

