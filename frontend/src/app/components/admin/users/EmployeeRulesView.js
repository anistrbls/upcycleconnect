"use client";

import { useState, useEffect, useCallback } from "react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { fieldStyle, labelStyle } from "../../../lib/styles";

const DAYS = [
    { key: "mon", label: "Lundi" },
    { key: "tue", label: "Mardi" },
    { key: "wed", label: "Mercredi" },
    { key: "thu", label: "Jeudi" },
    { key: "fri", label: "Vendredi" },
    { key: "sat", label: "Samedi" },
    { key: "sun", label: "Dimanche" },
];

export default function EmployeeRulesView({ employeeId }) {
    const [rules, setRules] = useState({
        monActive: true, monStart: "09:00", monEnd: "18:00",
        tueActive: true, tueStart: "09:00", tueEnd: "18:00",
        wedActive: true, wedStart: "09:00", wedEnd: "18:00",
        thuActive: true, thuStart: "09:00", thuEnd: "18:00",
        friActive: true, friStart: "09:00", friEnd: "18:00",
        satActive: false, satStart: "09:00", satEnd: "18:00",
        sunActive: false, sunStart: "09:00", sunEnd: "18:00",
        worksPublicHolidays: false
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/admin/employee-working-rules?employeeId=${employeeId}`), {
                headers: buildAuthHeaders()
            });
            if (res.ok) {
                const d = await res.json();
                if (d && d.employeeId) {
                    setRules(d);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMsg("");
        try {
            const res = await fetch(apiUrl("/admin/employee-working-rules"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ ...rules, employeeId })
            });
            if (res.ok) {
                setMsg("✓ Règles enregistrées");
                setTimeout(() => setMsg(""), 3000);
            } else {
                const errData = await res.json();
                setMsg(`Erreur : ${errData.error || "Inconnue"}`);
            }
        } catch (err) {
            setMsg("Erreur réseau");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Chargement des règles...</p>;

    return (
        <form onSubmit={handleSave} style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
                {DAYS.map(day => (
                    <div key={day.key} style={{ 
                        display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr", gap: "0.5rem", alignItems: "center",
                        padding: "0.5rem", borderRadius: "10px", background: rules[`${day.key}Active`] ? "#fff" : "#f1f5f9"
                    }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{day.label}</span>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", cursor: "pointer" }}>
                            <input 
                                type="checkbox" 
                                checked={rules[`${day.key}Active`]} 
                                onChange={e => setRules(p => ({ ...p, [`${day.key}Active`]: e.target.checked }))} 
                            />
                            {rules[`${day.key}Active`] ? "Actif" : "Repos"}
                        </label>
                        <input 
                            type="time" 
                            style={{ ...fieldStyle, padding: "4px 8px" }} 
                            value={rules[`${day.key}Start`]} 
                            disabled={!rules[`${day.key}Active`]}
                            onChange={e => setRules(p => ({ ...p, [`${day.key}Start`]: e.target.value }))}
                        />
                        <input 
                            type="time" 
                            style={{ ...fieldStyle, padding: "4px 8px" }} 
                            value={rules[`${day.key}End`]} 
                            disabled={!rules[`${day.key}Active`]}
                            onChange={e => setRules(p => ({ ...p, [`${day.key}End`]: e.target.value }))}
                        />
                    </div>
                ))}
            </div>

            <div style={{ padding: "0.75rem", borderRadius: "10px", background: "#f8fbfb", border: "1px solid #d7e0e1" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                    <input 
                        type="checkbox" 
                        checked={rules.worksPublicHolidays} 
                        onChange={e => setRules(p => ({ ...p, worksPublicHolidays: e.target.checked }))} 
                    />
                    Travailler les jours fériés ?
                </label>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>{msg}</span>
                <button type="submit" className="action-cta primary" disabled={isSaving}>
                    {isSaving ? "Enregistrement..." : "Enregistrer les règles"}
                </button>
            </div>
        </form>
    );
}
