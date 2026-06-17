"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../../lib/api";

export default function ParametresModuleIndexPage() {
    const router = useRouter();

    useEffect(() => {
        const checkRoleAndRedirect = async () => {
            const token = window.localStorage.getItem(TOKEN_KEY);
            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const response = await fetch(apiUrl("/auth/me"), {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const role = data.user?.role;
                    if (role === "admin") {
                        router.replace("/parametres/configuration");
                    } else if (role === "professionnel" || role === "particulier") {
                        router.replace("/parametres/notifications");
                    } else {
                        router.replace("/vue-globale/vue-generale");
                    }
                } else {
                    router.replace("/login");
                }
            } catch {
                router.replace("/login");
            }
        };

        checkRoleAndRedirect();
    }, [router]);

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement...</span>
        </div>
    );
}
