"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleFromToken } from "../../lib/api";

export default function FinancesModuleIndexPage() {
    const router = useRouter();

    useEffect(() => {
        const role = getRoleFromToken();
        if (role === "admin") {
            router.replace("/finances/vue-financiere");
        } else {
            router.replace("/finances/paiements");
        }
    }, [router]);

    return <div className="panel" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>Redirection…</div>;
}
