"use client";

import { use } from "react";
import { TOKEN_KEY } from "../../../lib/api";
import ForumView from "../../../components/forum/ForumView";
import ForumModerationView from "../../../components/forum/ForumModerationView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";

const getUserInfo = () => {
    try {
        const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
        if (!token) return { role: null, id: null };
        const payload = JSON.parse(atob(token.split(".")[1]));
        return { role: payload.role || null, id: payload.sub || payload.id || null };
    } catch {
        return { role: null, id: null };
    }
};

export default function ForumSubPage({ params }) {
    const { subpage } = use(params);
    const { role, id: callerUserId } = getUserInfo();

    const canModerate = role === "admin" || role === "salarie";

    if (subpage === "moderation") {
        if (!canModerate) {
            return <ModulePlaceholder label="Accès refusé" message="Cette section est réservée aux modérateurs." />;
        }
        return <ForumModerationView />;
    }

    // subpage === "sujets" (ou toute autre valeur → vue par défaut)
    return <ForumView role={role} callerUserId={callerUserId} />;
}
