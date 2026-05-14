"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Ancienne route : le catalogue pro utilise désormais la même page que les particuliers (`/projets/postes`). */
export default function TousProjetsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/projets/postes");
    }, [router]);

    return (
        <div style={{ padding: "2rem", color: "var(--text-muted)" }}>
            Redirection vers les projets postés…
        </div>
    );
}
