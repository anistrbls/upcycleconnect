"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import AdminModal from "../AdminModal";
import { fieldStyle, labelStyle } from "../../../lib/styles";
import { getFrenchPublicHolidays } from "../../../lib/holidays";
import {
    getPlanningItemEnd,
    getPlanningItemLabel,
    getPlanningItemStart,
    getPlanningItemStyle,
} from "../../../lib/planningBookings";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];



const getStartOfWeek = (date) => {
    const next = new Date(date);
    const day = next.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    next.setDate(next.getDate() - distanceFromMonday);
    next.setHours(0, 0, 0, 0);
    return next;
};

const toDayKey = (date) => {
    if (!date) return "";
    const d = new Date(date);
    // On force l'utilisation des composants de date locaux pour éviter les décalages UTC
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    return `${Y}-${M}-${D}`;
};

const isSameDay = (d1, d2) => toDayKey(d1) === toDayKey(d2);

export default function PlanningAdminView({ 
    events = [], 
    slots = [], 
    bookings = [],
    unavailabilities = [], 
    services = [], 
    onReload, 
    employeeId = null,
    salaries = [],
    loading = false
}) {
    const router = useRouter();
    const [selectedEmployee, setSelectedEmployee] = useState(employeeId || "");
    const [viewMode, setViewMode] = useState("month");
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    });

    // État des règles de travail (initialisé avec des valeurs par défaut sécurisées)
    const [workingRules, setWorkingRules] = useState(null);
    const holidays = useMemo(() => getFrenchPublicHolidays(currentDate.getFullYear()), [currentDate]);
    const [unavailModalOpen, setUnavailModalOpen] = useState(false);
    const [formState, setFormState] = useState({
        id: null,
        serviceId: "",
        employeeId: String(employeeId || ""),
        startTime: "",
        endTime: "",
        capacity: 1,
        reason: ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const loadRules = useCallback(async (id) => {
        if (!id) {
            setWorkingRules(null);
            return;
        }
        try {
            const res = await fetch(apiUrl(`/admin/employee-working-rules?employeeId=${id}`), {
                headers: buildAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setWorkingRules(data);
            } else {
                // Fallback aux règles par défaut en cas d'erreur API
                setWorkingRules({
                    monActive: true, tueActive: true, wedActive: true, thuActive: true, friActive: true,
                    satActive: false, sunActive: false, worksPublicHolidays: false
                });
            }
        } catch (err) {
            console.error("Error loading rules:", err);
        }
    }, []);

    // Chargement immédiat et synchronisation
    useEffect(() => {
        const targetId = employeeId || selectedEmployee;
        if (targetId) {
            const sId = String(targetId);
            if (sId !== selectedEmployee) {
                setSelectedEmployee(sId);
            }
            loadRules(sId);
        }
    }, [employeeId, selectedEmployee, loadRules]);

    // Fallback si workingRules est encore null mais qu'on a un employé
    const currentRules = workingRules || ( (employeeId || selectedEmployee) ? {
        monActive: true, tueActive: true, wedActive: true, thuActive: true, friActive: true,
        satActive: false, sunActive: false, worksPublicHolidays: false
    } : null);

    const itemsByDay = useMemo(() => {
        const map = new Map();
        
        const add = (item, type) => {
            const date = type === "event" ? item.dateDebut : item.startTime;
            const key = toDayKey(date);
            if (!key) return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push({ ...item, _type: type });
        };

        events.forEach(e => add(e, "event"));
        slots.forEach(s => add(s, "slot"));
        bookings.forEach(b => add(b, "booking"));
        unavailabilities.forEach(u => add(u, "unavail"));

        for (const dayItems of map.values()) {
            dayItems.sort((a, b) => getPlanningItemStart(a) - getPlanningItemStart(b));
        }
        return map;
    }, [events, slots, bookings, unavailabilities]);

    const calendarDays = useMemo(() => {
        if (viewMode === "month") {
            const start = getStartOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
            const end = getStartOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
            end.setDate(end.getDate() + 6);
            const days = [];
            const cursor = new Date(start);
            while (cursor <= end) {
                days.push(new Date(cursor));
                cursor.setDate(cursor.getDate() + 1);
            }
            return days;
        } else {
            const start = getStartOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                days.push(d);
            }
            return days;
        }
    }, [currentDate, viewMode]);

    const monthLabel = viewMode === "month"
        ? currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
        : `Sem. du ${getStartOfWeek(currentDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;

    const selectedDayKey = toDayKey(selectedDate);
    const selectedDayItems = itemsByDay.get(selectedDayKey) || [];

    const handleSaveUnavail = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setErrorMsg("");
        const isEdit = !!formState.id;
        
        const targetEmpId = employeeId || formState.employeeId;
        
        const payload = {
            employeeId: Number(targetEmpId),
            startTime: new Date(formState.startTime).toISOString(),
            endTime: new Date(formState.endTime).toISOString(),
            reason: formState.reason
        };

        console.log("Saving unavailability, payload:", payload);

        if (!payload.employeeId || payload.employeeId <= 0) {
            setErrorMsg("ID salarié invalide (" + targetEmpId + "). Veuillez recharger la page.");
            setIsSaving(false);
            return;
        }

        try {
            const res = await fetch(apiUrl(isEdit ? `/admin/employee-unavailabilities/${formState.id}` : "/admin/employee-unavailabilities"), {
                method: isEdit ? "PUT" : "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Erreur lors de l'enregistrement");
            }
            setUnavailModalOpen(false);
            if (onReload) onReload();
        } catch (err) {
            console.error("Save unavailability error:", err);
            setErrorMsg(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = async (item) => {
        if (!window.confirm("Supprimer cet élément du planning ?")) return;
        const endpoint = item._type === "slot" ? `/admin/service-slots/${item.id}` : `/admin/employee-unavailabilities/${item.id}`;
        try {
            const res = await fetch(apiUrl(endpoint), {
                method: "DELETE",
                headers: buildAuthHeaders()
            });
            if (res.ok && onReload) onReload();
        } catch (err) {
            alert("Erreur lors de la suppression");
        }
    };

    const openEditItem = (item) => {
        if (item._type === "event" || item._type === "slot" || item._type === "booking") return;
        
        console.log("Opening edit for unavailability:", item);
        setErrorMsg("");
        try {
            const start = new Date(item.startTime);
            const end = new Date(item.endTime);
            
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                console.error("Invalid dates for item", item);
                return;
            }

            setFormState({
                id: item.id || null,
                serviceId: "",
                employeeId: String(item.employeeId || ""),
                startTime: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                endTime: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                capacity: 1,
                reason: item.reason || ""
            });

            setUnavailModalOpen(true);
        } catch (err) {
            console.error("Failed to open edit modal", err);
        }
    };

    const openUnavailModal = () => {
        setErrorMsg("");
        const start = new Date(selectedDate);
        start.setHours(8, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(18, 0, 0, 0);

        setFormState({
            id: null,
            serviceId: "",
            employeeId: String(employeeId || selectedEmployee || (salaries[0]?.id || "")),
            startTime: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            endTime: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            capacity: 1,
            reason: "Indisponibilité"
        });
        setUnavailModalOpen(true);
    };

    return (
        <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button className="action-cta" onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - (viewMode === "month" ? 1 : 0), prev.getDate() - (viewMode === "week" ? 7 : 0)))} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Précédent</button>
                    <button className="action-cta task-action-btn" onClick={() => { const d = new Date(); setCurrentDate(d); setSelectedDate(d); }}>Aujourd'hui</button>
                    <button className="action-cta" onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + (viewMode === "month" ? 1 : 0), prev.getDate() + (viewMode === "week" ? 7 : 0)))} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Suivant</button>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                    <span className="section-title" style={{ textTransform: "capitalize", margin: 0 }}>{monthLabel}</span>
                    <div style={{ display: "flex", background: "#e8ecee", borderRadius: "999px", padding: "4px" }}>
                        <button onClick={() => setViewMode("month")} style={{ padding: "6px 16px", borderRadius: "999px", border: "none", background: viewMode === "month" ? "white" : "transparent", cursor: "pointer", fontWeight: 700 }}>Mois</button>
                        <button onClick={() => setViewMode("week")} style={{ padding: "6px 16px", borderRadius: "999px", border: "none", background: viewMode === "week" ? "white" : "transparent", cursor: "pointer", fontWeight: 700 }}>Semaine</button>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="action-cta" onClick={openUnavailModal} style={{ background: "#f4e8e8", color: "#8e2d2d" }}>+ Indisponibilité</button>
                </div>
            </div>
            {/* Calendar Grid */}
            {viewMode === "month" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
                    {WEEKDAY_LABELS.map(l => <div key={l} style={{ textAlign: "center", fontWeight: 700, fontSize: "0.8rem", color: "var(--text-muted)" }}>{l}</div>)}
                    {calendarDays.map(day => {
                        const key = toDayKey(day);
                        const dayItems = itemsByDay.get(key) || [];
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        const inCurrentMonth = day.getMonth() === currentDate.getMonth();

                        // Check if rest day
                        const dayOfWeek = day.getDay();
                        const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                        const isWeeklyRestDay = currentRules ? !currentRules[`${dayKeys[dayOfWeek]}Active`] : false;
                        const holidayName = holidays[key];
                        const isHolidayRestDay = holidayName && currentRules && !currentRules.worksPublicHolidays;
                        const isRestDay = isWeeklyRestDay || isHolidayRestDay;

                        return (
                            <div 
                                key={key} 
                                onClick={() => setSelectedDate(day)}
                                style={{ 
                                    minHeight: "100px", 
                                    border: isSelected ? "2px solid #749193" : "1px solid #d7e0e1", 
                                    borderRadius: "12px", 
                                    padding: "4px", 
                                    cursor: "pointer", 
                                    background: isRestDay ? "#f1f5f9" : (isSelected ? "#f8fbfb" : "white"),
                                    opacity: inCurrentMonth ? 1 : 0.4,
                                    position: "relative",
                                    overflow: "hidden"
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span style={{ fontSize: "0.8rem", fontWeight: isToday ? 800 : 500, color: isToday ? "#749193" : "inherit" }}>
                                        {day.getDate()}
                                    </span>
                                    {isRestDay && (
                                        <span style={{ fontSize: "0.6rem", color: isHolidayRestDay ? "#8e2d2d" : "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                            {isHolidayRestDay ? `Férié (${holidayName})` : "Repos"}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                                    {dayItems.slice(0, 3).map((it, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (it._type === "event") {
                                                    router.push(`/evenements/planning?open=${it.id}`);
                                                } else if (it._type === "unavail") {
                                                    openEditItem(it);
                                                }
                                            }}
                                            style={{ 
                                                fontSize: "0.65rem", padding: "2px 4px", borderRadius: "4px",
                                                background: getPlanningItemStyle(it._type).bg,
                                                color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                border: "1px solid rgba(0,0,0,0.05)", cursor: it._type === "unavail" || it._type === "event" ? "pointer" : "default"
                                            }}
                                        >
                                            {getPlanningItemLabel(it)}
                                        </div>
                                    ))}
                                    {dayItems.length > 3 && <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>+ {dayItems.length - 3}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (() => {
                const HOUR_HEIGHT = 50;
                const START_HOUR = 6;
                const END_HOUR = 23;
                const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

                return (
                    <div style={{ display: "flex", flexDirection: "column", border: "1px solid #d7e0e1", borderRadius: "14px", overflow: "hidden", background: "#fff", height: "650px", position: "relative" }}>
                        {/* Header Row */}
                        <div style={{ display: "flex", borderBottom: "1px solid #d7e0e1", background: "#f8fbfb", zIndex: 30, flexShrink: 0 }}>
                            <div style={{ width: "50px", flexShrink: 0, borderRight: "1px solid #d7e0e1" }}></div>
                            <div style={{ flex: 1, display: "flex" }}>
                                {calendarDays.map((dayDate, i) => {
                                    const isToday = isSameDay(dayDate, new Date());
                                    const isSelected = isSameDay(dayDate, selectedDate);
                                    const dayKey = toDayKey(dayDate);
                                    const holidayName = holidays[dayKey];
                                    const dayOfWeek = dayDate.getDay();
                                    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                                    const isWeeklyRestDay = currentRules ? !currentRules[`${dayKeys[dayOfWeek]}Active`] : false;
                                    const isHolidayRestDay = holidayName && currentRules && !currentRules.worksPublicHolidays;
                                    const isRestDay = isWeeklyRestDay || isHolidayRestDay;

                                    return (
                                        <div key={i} onClick={() => setSelectedDate(dayDate)} style={{ 
                                            flex: 1, borderRight: i < 6 ? "1px solid #d7e0e1" : "none", 
                                            height: "45px", display: "flex", flexDirection: "column", 
                                            alignItems: "center", justifyContent: "center", 
                                            background: isRestDay ? "#f1f5f9" : (isToday ? "#EEF3F3" : "#fff"), 
                                            cursor: "pointer", borderBottom: isSelected ? "3px solid #749193" : "none" 
                                        }}>
                                            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{WEEKDAY_LABELS[i]}</span>
                                            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                                                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: isToday ? "#749193" : "var(--text-main)" }}>{dayDate.getDate()}</span>
                                                {holidayName && <span style={{ fontSize: "0.55rem", color: "#8e2d2d", fontWeight: 700 }}>{holidayName}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Body with Time Axis */}
                        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
                            <div style={{ display: "flex", minHeight: "max-content" }}>
                            <div style={{ width: "50px", flexShrink: 0, borderRight: "1px solid #d7e0e1", background: "#f8fbfb", position: "sticky", left: 0, zIndex: 20 }}>
                                {HOURS.map(h => (
                                    <div key={h} style={{ height: `${HOUR_HEIGHT}px`, position: "relative" }}>
                                        <span style={{ position: "absolute", top: "-8px", right: "6px", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>{h}h</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ flex: 1, display: "flex", position: "relative" }}>
                                {calendarDays.map((dayDate, i) => {
                                    const dayKey = toDayKey(dayDate);
                                    const dayItems = itemsByDay.get(dayKey) || [];
                                    const isSelected = isSameDay(dayDate, selectedDate);
                                    const dayOfWeek = dayDate.getDay();
                                    const dayKeysPrefix = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                                    const prefix = dayKeysPrefix[dayOfWeek];
                                    const isWeeklyRestDay = currentRules ? !currentRules[`${prefix}Active`] : false;
                                    const holidayName = holidays[dayKey];
                                    const isHolidayRestDay = holidayName && currentRules && !currentRules.worksPublicHolidays;
                                    const isRestDay = isWeeklyRestDay || isHolidayRestDay;

                                    const dayStartStr = currentRules?.[`${prefix}Start`] || "09:00";
                                    const dayEndStr = currentRules?.[`${prefix}End`] || "18:00";
                                    const dayStart = parseInt(dayStartStr.split(":")[0]) + parseInt(dayStartStr.split(":")[1] || 0) / 60;
                                    const dayEnd = parseInt(dayEndStr.split(":")[0]) + parseInt(dayEndStr.split(":")[1] || 0) / 60;

                                    return (
                                        <div key={dayKey} onClick={() => setSelectedDate(dayDate)} style={{ 
                                            flex: 1, 
                                            position: "relative", 
                                            background: "transparent" 
                                        }}>
                                            {HOURS.map(h => {
                                                // On est dehors si l'heure du créneau est >= fin de journée
                                                const isOutside = h >= dayEnd || (h + 1) <= dayStart;
                                                const isGray = isRestDay || isOutside;
                                                return (
                                                    <div key={h} style={{ 
                                                        height: `${HOUR_HEIGHT}px`, 
                                                        borderBottom: "1px solid #d7e0e1",
                                                        borderRight: i < 6 ? "1px solid #d7e0e1" : "none",
                                                        background: isGray ? "#f1f5f9" : "transparent" 
                                                    }}></div>
                                                );
                                            })}

                                            {/* Overlay pour le jour sélectionné */}
                                            {!isRestDay && isSelected && (
                                                <div style={{ position: "absolute", inset: 0, background: "rgba(116, 145, 147, 0.05)", pointerEvents: "none", zIndex: 5 }}></div>
                                            )}

                                            
                                            {isRestDay && (
                                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                                                    <span style={{ transform: "rotate(-45deg)", fontSize: "0.8rem", fontWeight: 800, color: "rgba(0,0,0,0.05)", textTransform: "uppercase" }}>{isHolidayRestDay ? holidayName : "Repos"}</span>
                                                </div>
                                            )}

                                            {dayItems.map((it, idx) => {
                                                const start = getPlanningItemStart(it);
                                                const end = getPlanningItemEnd(it);
                                                const startHour = start.getHours() + start.getMinutes() / 60;
                                                const endHour = end.getHours() + end.getMinutes() / 60;
                                                
                                                if (startHour > END_HOUR || endHour < START_HOUR) return null;
                                                
                                                const top = (Math.max(startHour, START_HOUR) - START_HOUR) * HOUR_HEIGHT;
                                                const height = (Math.min(endHour, END_HOUR) - Math.max(startHour, START_HOUR)) * HOUR_HEIGHT;

                                                return (
                                                    <div 
                                                        key={idx}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (it._type === "event") {
                                                                router.push(`/evenements/planning?open=${it.id}`);
                                                            } else if (it._type === "unavail") {
                                                                openEditItem(it);
                                                            }
                                                        }}
                                                        style={{ 
                                                            position: "absolute", left: "4px", right: "4px", top: `${top}px`, height: `${Math.max(height, 20)}px`,
                                                            background: getPlanningItemStyle(it._type).bg,
                                                            color: "#333", padding: "4px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600,
                                                            border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden", zIndex: 10,
                                                            cursor: it._type === "unavail" || it._type === "event" ? "pointer" : "default"
                                                        }}
                                                    >
                                                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                            {getPlanningItemLabel(it)}
                                                        </div>
                                                        {height > 30 && <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>{start.getHours()}h{String(start.getMinutes()).padStart(2, "0")}</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Selected Day Details */}
            <div className="panel">
                <div className="section-header">
                    <span className="section-title">{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                </div>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                    {selectedDayItems.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Aucun élément ce jour.</p>}
                    {selectedDayItems.map((it, i) => (
                        <div key={i} onClick={() => it._type === "unavail" && openEditItem(it)} style={{ 
                            display: "flex", justifyContent: "space-between", alignItems: "center", 
                            padding: "0.8rem", borderRadius: "10px", 
                            background: getPlanningItemStyle(it._type).panel,
                            cursor: it._type === "unavail" ? "pointer" : "default",
                            border: "1px solid #f1f5f9"
                        }}>
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                <div style={{ 
                                    width: "8px", height: "40px", borderRadius: "4px",
                                    background: getPlanningItemStyle(it._type).bg
                                }}></div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                                        {getPlanningItemLabel(it)}
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                        {getPlanningItemStart(it).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} - {getPlanningItemEnd(it).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                        {it._type === "slot" && ` • Capacité: ${it.capacity}`}
                                        {it._type === "booking" && it.status ? ` • ${it.status === "confirmed" ? "Confirmée" : it.status === "pending" ? "En attente" : it.status}` : ""}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                                {it._type === "booking" && it.serviceId ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/prestations/catalogue/${it.serviceId}`);
                                        }}
                                        className="action-btn"
                                        style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem", whiteSpace: "nowrap" }}
                                    >
                                        Voir la prestation
                                    </button>
                                ) : null}
                                {it._type === "unavail" ? (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(it); }}
                                        style={{ background: "transparent", border: "none", color: "#8e2d2d", cursor: "pointer", fontSize: "0.8rem" }}
                                    >
                                        Supprimer
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}

            <AdminModal open={unavailModalOpen} title={formState.id ? "Modifier l'indisponibilité" : "Ajouter une indisponibilité"} onClose={() => setUnavailModalOpen(false)}>
                <form onSubmit={handleSaveUnavail} style={{ display: "grid", gap: "1rem" }}>
                    <label style={labelStyle}>Motif
                        <input type="text" style={fieldStyle} value={formState.reason} onChange={e => setFormState(p => ({ ...p, reason: e.target.value }))} required />
                    </label>
                    {!employeeId && salaries.length > 0 && (
                        <label style={labelStyle}>Salarié concerné
                            <select style={fieldStyle} value={formState.employeeId} onChange={e => setFormState(p => ({ ...p, employeeId: e.target.value }))} required>
                                <option value="">Sélectionner un salarié</option>
                                {salaries.map(s => <option key={s.id} value={s.id} data-i18n-user-content="true">{s.firstname} {s.lastname}</option>)}
                            </select>
                        </label>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <label style={labelStyle}>Début
                            <input type="datetime-local" style={fieldStyle} value={formState.startTime} onChange={e => setFormState(p => ({ ...p, startTime: e.target.value }))} required />
                        </label>
                        <label style={labelStyle}>Fin
                            <input type="datetime-local" style={fieldStyle} value={formState.endTime} onChange={e => setFormState(p => ({ ...p, endTime: e.target.value }))} required />
                        </label>
                    </div>
                    {errorMsg && <p style={{ color: "red", fontSize: "0.8rem" }}>{errorMsg}</p>}
                    <button className="action-cta" type="submit" style={{ background: "#f4e8e8", color: "#8e2d2d" }} disabled={isSaving}>{isSaving ? "Enregistrement..." : (formState.id ? "Enregistrer les modifications" : "Ajouter l'indisponibilité")}</button>
                </form>
            </AdminModal>
        </div>
    );
}
