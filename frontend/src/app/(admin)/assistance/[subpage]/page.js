"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import SupportAdminView from "../../../components/support/SupportAdminView";
import { apiUrl, buildAuthHeaders, canModeratePlatform, getTokenPayload } from "../../../lib/api";

const tokenUser = () => {
    const payload = getTokenPayload();
    if (!payload) return null;
    return {
        id: payload.userId || payload.id || null,
        email: payload.email || payload.sub || "",
        role: payload.role || "",
        employeeRole: payload.employeeRole || "",
    };
};

export default function AssistanceSubPage() {
    const params = useParams();
    const router = useRouter();
    const subpage = typeof params?.subpage === "string" ? params.subpage : "";
    const [user, setUser] = useState(tokenUser);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const loadUser = async () => {
            try {
                const response = await fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() });
                const data = await response.json().catch(() => ({}));
                if (!cancelled && response.ok && data.user) {
                    setUser(data.user);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadUser();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (loading) return;
        if (!canModeratePlatform(user)) {
            router.replace("/vue-globale/vue-generale");
            return;
        }
        if (subpage !== "conversations") {
            router.replace("/assistance/conversations");
        }
    }, [loading, user, subpage, router]);

    if (loading) {
        return <div className="panel" style={{ padding: "2.5rem", textAlign: "center" }}>Chargement…</div>;
    }

    if (!canModeratePlatform(user)) {
        return <ModulePlaceholder moduleLabel="Accès refusé" subLabel="Cette section est réservée aux administrateurs et modérateurs." />;
    }

    if (subpage === "conversations") {
        return <SupportAdminView />;
    }

    return <ModulePlaceholder moduleLabel="Assistance" subLabel="Accès en cours de redirection" />;
}
