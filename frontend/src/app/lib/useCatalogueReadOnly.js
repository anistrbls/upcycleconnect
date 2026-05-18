import { useEffect, useState } from "react";
import { apiUrl, buildAuthHeaders } from "./api";

/** Catalogue prestations en lecture seule pour les salariés. */
export function useCatalogueReadOnly() {
    const [readOnly, setReadOnly] = useState(false);
    const [role, setRole] = useState("");
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(apiUrl("/auth/me"), { headers: buildAuthHeaders() });
                const data = await res.json();
                const userRole = data?.user?.role || "";
                if (!cancelled) {
                    setRole(userRole);
                    setReadOnly(userRole === "salarie");
                }
            } catch {
                if (!cancelled) {
                    setReadOnly(false);
                    setRole("");
                }
            } finally {
                if (!cancelled) setChecked(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return { readOnly, role, checked };
}
