"use client";

import { useMemo, useState } from "react";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const toDayKey = (rawDate) => {
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getStartOfWeek = (date) => {
    const next = new Date(date);
    const day = next.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    next.setDate(next.getDate() - distanceFromMonday);
    next.setHours(0, 0, 0, 0);
    return next;
};

const isSameDay = (left, right) => (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
);

export default function EventPlanningView({ events, onOpenEvent }) {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    });

    const eventsByDay = useMemo(() => {
        const map = new Map();
        events.forEach((item) => {
            const key = toDayKey(item.dateDebut);
            if (!key) {
                return;
            }
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(item);
        });

        for (const dayEvents of map.values()) {
            dayEvents.sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut));
        }

        return map;
    }, [events]);

    const calendarDays = useMemo(() => {
        const start = getStartOfWeek(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
        const end = getStartOfWeek(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
        end.setDate(end.getDate() + 6);

        const days = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            days.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        return days;
    }, [currentMonth]);

    const selectedDayKey = toDayKey(selectedDate);
    const selectedDayEvents = eventsByDay.get(selectedDayKey) || [];

    const monthLabel = currentMonth.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
    });

    const goToPreviousMonth = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Événements</span>
                    <h1>Planning</h1>
                </div>
            </div>

            <div className="panel" style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button className="action-cta" type="button" onClick={goToPreviousMonth} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Mois precedent</button>
                        <button className="action-cta task-action-btn" type="button" onClick={goToToday}>Aujourd'hui</button>
                        <button className="action-cta" type="button" onClick={goToNextMonth} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Mois suivant</button>
                    </div>
                    <span className="section-title" style={{ textTransform: "capitalize" }}>{monthLabel}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.5rem" }}>
                    {WEEKDAY_LABELS.map((label) => (
                        <div key={label} style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, padding: "0.35rem 0" }}>
                            {label}
                        </div>
                    ))}

                    {calendarDays.map((dayDate) => {
                        const dayKey = toDayKey(dayDate);
                        const dayEvents = eventsByDay.get(dayKey) || [];
                        const inCurrentMonth = dayDate.getMonth() === currentMonth.getMonth();
                        const isSelected = isSameDay(dayDate, selectedDate);
                        const isToday = isSameDay(dayDate, new Date());

                        return (
                            <button
                                key={dayKey}
                                type="button"
                                onClick={() => setSelectedDate(new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()))}
                                style={{
                                    border: isSelected ? "2px solid #749193" : "1px solid #d7e0e1",
                                    background: inCurrentMonth ? "#F8FBFB" : "#EEF3F3",
                                    borderRadius: "14px",
                                    minHeight: "118px",
                                    padding: "0.55rem",
                                    textAlign: "left",
                                    display: "grid",
                                    alignContent: "start",
                                    gap: "0.35rem",
                                    cursor: "pointer",
                                    opacity: inCurrentMonth ? 1 : 0.62,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.35rem" }}>
                                    <span
                                        style={{
                                            width: "1.6rem",
                                            height: "1.6rem",
                                            borderRadius: "999px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.77rem",
                                            fontWeight: 700,
                                            background: isToday ? "#CFC0BB" : "transparent",
                                            color: "var(--text-main)",
                                        }}
                                    >
                                        {dayDate.getDate()}
                                    </span>
                                    {dayEvents.length > 0 ? <span className="db-badge" style={{ background: "rgb(229, 255, 188)" }}>{dayEvents.length}</span> : null}
                                </div>

                                <div style={{ display: "grid", gap: "0.25rem" }}>
                                    {dayEvents.slice(0, 3).map((item) => {
                                        const start = new Date(item.dateDebut);
                                        const hourText = Number.isNaN(start.getTime())
                                            ? "--:--"
                                            : start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                                        return (
                                            <span
                                                key={item.id}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onOpenEvent(item);
                                                }}
                                                style={{
                                                    fontSize: "0.7rem",
                                                    lineHeight: 1.3,
                                                    borderRadius: "9px",
                                                    padding: "0.24rem 0.38rem",
                                                    background: "#E5FFBC",
                                                    color: "#233B3D",
                                                    border: "1px solid #d6eaaa",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                                title={`${hourText} - ${item.name}`}
                                            >
                                                {hourText} {item.name}
                                            </span>
                                        );
                                    })}
                                    {dayEvents.length > 3 ? (
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>+ {dayEvents.length - 3} autres</span>
                                    ) : null}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div style={{ background: "#F8FBFB", borderRadius: "16px", padding: "0.95rem" }}>
                    <div className="section-header" style={{ marginBottom: "0.5rem" }}>
                        <span className="section-title" style={{ fontSize: "0.98rem" }}>
                            {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                        <span className="db-badge">{selectedDayEvents.length} événement(s)</span>
                    </div>

                    {selectedDayEvents.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Aucun événement ce jour.</p>
                    ) : (
                        <div style={{ display: "grid", gap: "0.5rem" }}>
                            {selectedDayEvents.map((item) => {
                                const start = new Date(item.dateDebut);
                                const end = new Date(item.dateFin);
                                const startText = Number.isNaN(start.getTime())
                                    ? "--:--"
                                    : start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                                const endText = Number.isNaN(end.getTime())
                                    ? "--:--"
                                    : end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => onOpenEvent(item)}
                                        style={{
                                            border: "1px solid #d8e3e4",
                                            textAlign: "left",
                                            width: "100%",
                                            borderRadius: "12px",
                                            padding: "0.75rem",
                                            background: "#ffffff",
                                            display: "grid",
                                            gap: "0.3rem",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", alignItems: "center" }}>
                                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                                            <span className="db-badge" style={{ background: item.status === "valide" ? "#E5FFBC" : "#E6EDEE", textTransform: "capitalize" }}>{item.status}</span>
                                        </div>
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{startText} - {endText}</span>
                                        <span style={{ fontSize: "0.84rem", color: "var(--text-main)" }}>{item.lieu || "Lieu à confirmer"}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
