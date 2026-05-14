"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "../../lib/api";

export default function EventsModuleIndexPage() {
    const router = useRouter();

    useEffect(() => {
        const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
        if (!token) {
            router.replace("/login");
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const role = payload.role;
            if (role === "admin") {
                router.replace("/evenements/tous-evenements");
                return;
            }
        } catch {
            /* ignore */
        }
        router.replace("/evenements/activites");
    }, [router]);

    return <div style={{ padding: "1.5rem", color: "var(--text-muted)" }}>Chargement…</div>;
}
