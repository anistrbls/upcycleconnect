"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "./api";

/** Catégories (conseil-categories) et matériaux (item-materials) depuis la configuration. */
export function useConseilReferentials() {
    const [categories, setCategories] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [catRes, matRes] = await Promise.all([
                fetch(apiUrl("/conseil-categories")),
                fetch(apiUrl("/item-materials")),
            ]);
            const catData = catRes.ok ? await catRes.json() : { items: [] };
            const matData = matRes.ok ? await matRes.json() : { items: [] };
            setCategories((catData.items || []).map((i) => i.label).filter(Boolean));
            setMaterials((matData.items || []).map((i) => i.label).filter(Boolean));
        } catch {
            setCategories([]);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { categories, materials, loading, reload: load };
}
