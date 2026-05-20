"use client";

import {
    CONSEIL_AUDIENCES,
    CONSEIL_DIFFICULTIES,
} from "../../lib/conseilConstants";
import { useConseilReferentials } from "../../lib/useConseilReferentials";

/** Selects de filtre conseils (style vert feuille). */
export default function ConseilFilterFields({ filters, onChange }) {
    const { categories, materials } = useConseilReferentials();
    const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

    return (
        <>
            <select className="conseil-filter-select" value={filters.category || ""} onChange={set("category")}>
                <option value="">Toutes catégories</option>
                {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>
            <select className="conseil-filter-select" value={filters.difficulty || ""} onChange={set("difficulty")}>
                <option value="">Tous niveaux</option>
                {CONSEIL_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
            <select className="conseil-filter-select" value={filters.material || ""} onChange={set("material")}>
                <option value="">Tous matériaux</option>
                {materials.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
            <select className="conseil-filter-select" value={filters.audience || ""} onChange={set("audience")}>
                <option value="">Tous publics</option>
                {CONSEIL_AUDIENCES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                ))}
            </select>
        </>
    );
}
