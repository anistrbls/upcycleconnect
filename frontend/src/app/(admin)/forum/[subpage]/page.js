"use client";

import { use, useEffect, useState } from "react";
import { apiUrl, buildAuthHeaders, canModerateForum, getTokenPayload } from "../../../lib/api";
import ForumView from "../../../components/forum/ForumView";
import ForumModerationView from "../../../components/forum/ForumModerationView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";

const getUserInfo = () => {
    const payload = getTokenPayload();
    if (!payload) return { role: null, employeeRole: "", id: null };
    return {
        role: payload.role || null,
        employeeRole: payload.employeeRole || "",
        id: payload.userId || payload.sub || payload.id || null,
    };
};

export default function ForumSubPage({ params }) {
    const { subpage } = use(params);
    const [userInfo, setUserInfo] = useState(getUserInfo);

    useEffect(() => {
        let cancelled = false;
        const refreshUser = async () => {
            try {
                const response = await fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() });
                if (!response.ok) return;
                const data = await response.json();
                if (!cancelled && data?.user) {
                    setUserInfo((prev) => ({
                        ...prev,
                        id: data.user.id || prev.id,
                        role: data.user.role || prev.role,
                        employeeRole: data.user.employeeRole || "",
                    }));
                }
            } catch {
                // Le layout global gère déjà l'expiration de session.
            }
        };
        refreshUser();
        return () => {
            cancelled = true;
        };
    }, []);

    const { role, employeeRole, id: callerUserId } = userInfo;
    const canModerate = canModerateForum({ role, employeeRole });

    if (subpage === "moderation") {
        if (!canModerate) {
            return <ModulePlaceholder label="Accès refusé" message="Cette section est réservée aux modérateurs." />;
        }
        return <ForumModerationView />;
    }

    // subpage === "sujets" (ou toute autre valeur → vue par défaut)
    return <ForumView role={role} employeeRole={employeeRole} callerUserId={callerUserId} />;
}
