"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

export default function ProjetsIndexPage() {
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() });
                const data = await res.json();
                if (data?.user?.role === "admin") {
                    router.replace("/projets/moderation");
                    return;
                }
                if (data?.user?.role === "particulier") {
                    router.replace("/projets/postes");
                    return;
                }
                router.replace("/projets/mes-projets");
            } catch {
                router.replace("/projets/mes-projets");
            }
        };
        load();
    }, [router]);

    return <div style={{ padding: "1.5rem", color: "var(--text-muted)" }}>Chargement...</div>;
}
