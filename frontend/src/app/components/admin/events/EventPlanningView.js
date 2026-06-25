"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../../i18n/I18nProvider";

const WEEKDAY_LABELS = {
    fr: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const DATE_LOCALES = {
    fr: "fr-FR",
    en: "en-US",
};

const getLocaleCode = (locale) => String(locale || "fr").toLowerCase().split("-")[0];
const getDateLocale = (locale) => DATE_LOCALES[getLocaleCode(locale)] || "fr-FR";
const getWeekdayLabels = (locale) => WEEKDAY_LABELS[getLocaleCode(locale)] || WEEKDAY_LABELS.fr;
const getWeekPrefix = (locale) => {
    const code = getLocaleCode(locale);
    if (code === "en") return "Week of";
    return "Sem. du";
};

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

export default function EventPlanningView({ events = [], title = "Planning des événements", subtitle = "Événements", onOpenEvent }) {
    const router = useRouter();
    const { locale } = useI18n();
    const [viewMode, setViewMode] = useState("month");
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    });

    const eventsByDay = useMemo(() => {
        const map = new Map();
        events.forEach((item) => {
            if (item.validationStatus === "pending" || item.validationStatus === "rejected") {
                return;
            }
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

    const selectedDayKey = toDayKey(selectedDate);
    const selectedDayEvents = eventsByDay.get(selectedDayKey) || [];
    const dateLocale = getDateLocale(locale);
    const weekdayLabels = getWeekdayLabels(locale);

    const monthLabel = viewMode === "month"
        ? currentDate.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
        : `${getWeekPrefix(locale)} ${getStartOfWeek(currentDate).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}`;

    const goToPrevious = () => {
        if (viewMode === "month") {
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        } else {
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
        }
    };

    const goToNext = () => {
        if (viewMode === "month") {
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        } else {
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
        }
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
        setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    };

    return (
        <>
            {(title || subtitle) && (
                <div className="header-section">
                    <div className="title-area">
                        {subtitle && <span className="activities-label">{subtitle}</span>}
                        {title && <h1>{title}</h1>}
                    </div>
                </div>
            )}
            <div className="panel" style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button className="action-cta" type="button" onClick={goToPrevious} style={{ background: "#e8ecee", color: "var(--text-main)", minWidth: "120px" }}>{viewMode === "month" ? "Mois précédent" : "Sem. préc."}</button>
                        <button className="action-cta task-action-btn" type="button" onClick={goToToday}>Aujourd'hui</button>
                        <button className="action-cta" type="button" onClick={goToNext} style={{ background: "#e8ecee", color: "var(--text-main)", minWidth: "120px" }}>{viewMode === "month" ? "Mois suivant" : "Sem. suiv."}</button>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                        <span className="section-title" style={{ textTransform: "capitalize", margin: 0 }}>{monthLabel}</span>
                        <div style={{ display: "flex", background: "#e8ecee", borderRadius: "999px", padding: "4px" }}>
                            <button type="button" onClick={() => setViewMode("month")} style={{ padding: "6px 16px", borderRadius: "999px", border: "none", background: viewMode === "month" ? "white" : "transparent", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", boxShadow: viewMode === "month" ? "0 2px 4px rgba(0,0,0,0.1)" : "none", color: "var(--text-main)", transition: "all 0.2s" }}>Mois</button>
                            <button type="button" onClick={() => setViewMode("week")} style={{ padding: "6px 16px", borderRadius: "999px", border: "none", background: viewMode === "week" ? "white" : "transparent", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", boxShadow: viewMode === "week" ? "0 2px 4px rgba(0,0,0,0.1)" : "none", color: "var(--text-main)", transition: "all 0.2s" }}>Semaine</button>
                        </div>
                    </div>
                </div>

                {viewMode === "week" ? (() => {
                    const HOUR_HEIGHT = 50;
                    const START_HOUR = 7;
                    const END_HOUR = 22;
                    const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

                    return (
                        <div style={{ display: "flex", flexDirection: "column", border: "1px solid #d7e0e1", borderRadius: "14px", overflow: "hidden", background: "#fff", height: "650px", position: "relative", isolation: "isolate", transform: "translateZ(0)" }}>
                            {/* Sticky Header Row */}
                            <div style={{ display: "flex", borderBottom: "1px solid #d7e0e1", background: "#f8fbfb", zIndex: 30, flexShrink: 0, position: "relative" }}>
                                <div style={{ width: "50px", flexShrink: 0, borderRight: "1px solid #d7e0e1", background: "#f8fbfb" }}></div>
                                <div style={{ flex: 1, display: "flex" }}>
                                    {calendarDays.map((dayDate, i) => {
                                        const isToday = isSameDay(dayDate, new Date());
                                        const isSelected = isSameDay(dayDate, selectedDate);
                                        return (
                                            <div key={toDayKey(dayDate)} onClick={() => setSelectedDate(new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()))} style={{ flex: 1, borderRight: i < 6 ? "1px solid #d7e0e1" : "none", minWidth: "100px", height: "45px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: isToday ? "#EEF3F3" : "#fff", cursor: "pointer", borderBottom: isSelected ? "2px solid #749193" : "2px solid transparent" }}>
                                                <span style={{ fontSize: "0.7rem", color: isToday ? "var(--text-main)" : "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{weekdayLabels[i]}</span>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "999px", background: isToday ? "#CFC0BB" : "transparent", color: isToday ? "var(--text-main)" : "var(--text-main)", fontSize: "0.85rem", fontWeight: 700, marginTop: "2px" }}>
                                                    {dayDate.getDate()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Scrollable Grid Body */}
                            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", position: "relative" }} className="hide-scrollbar">
                                {/* Time Axis */}
                                <div style={{ width: "50px", flexShrink: 0, borderRight: "1px solid #d7e0e1", background: "#f8fbfb", zIndex: 20, position: "relative" }}>
                                    <div style={{ position: "relative", height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
                                        {HOURS.map(h => (
                                            <div key={h} style={{ position: "absolute", top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, left: 0, right: 0, height: `${HOUR_HEIGHT}px` }}>
                                                <span style={{ position: "absolute", top: "-8px", right: "6px", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>{h}h</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Days Columns */}
                                <div style={{ flex: 1, display: "flex" }}>
                                    {calendarDays.map((dayDate, i) => {
                                        const dayKey = toDayKey(dayDate);
                                        const dayEvents = eventsByDay.get(dayKey) || [];
                                        const isSelected = isSameDay(dayDate, selectedDate);
                                        
                                        return (
                                            <div key={dayKey} onClick={() => setSelectedDate(new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()))} style={{ flex: 1, borderRight: i < 6 ? "1px solid #d7e0e1" : "none", minWidth: "100px", position: "relative", cursor: "pointer", background: isSelected ? "rgba(116, 145, 147, 0.03)" : "transparent" }}>
                                                
                                                {/* Grid Lines & Events */}
                                                <div style={{ position: "relative", height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
                                                    {/* Grid Lines */}
                                                    {HOURS.map(h => (
                                                        <div key={h} style={{ position: "absolute", top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, left: 0, right: 0, height: "1px", background: "#f1f5f9" }}></div>
                                                    ))}

                                                    {/* Events */}
                                                    {dayEvents.map(item => {
                                                        const start = new Date(item.dateDebut);
                                                        const end = new Date(item.dateFin);
                                                        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

                                                        let startH = start.getHours() + start.getMinutes() / 60;
                                                        let endH = end.getHours() + end.getMinutes() / 60;
                                                        
                                                        if (endH <= START_HOUR || startH >= END_HOUR) return null;
                                                        if (startH < START_HOUR) startH = START_HOUR;
                                                        if (endH > END_HOUR) endH = END_HOUR;

                                                        const top = (startH - START_HOUR) * HOUR_HEIGHT;
                                                        const height = Math.max((endH - startH) * HOUR_HEIGHT, 25);

                                                        const hourText = start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
                                                        const endText = end.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                onClick={(e) => { e.stopPropagation(); if (onOpenEvent) onOpenEvent(item); else router.push(`?id=${item.id}`); }}
                                                                style={{
                                                                    position: "absolute",
                                                                    top: `${top}px`,
                                                                    left: "4px",
                                                                    right: "4px",
                                                                    height: `${height - 2}px`,
                                                                    background: "#E5FFBC",
                                                                    border: "1px solid #d6eaaa",
                                                                    borderRadius: "8px",
                                                                    padding: height > 35 ? "0.3rem 0.4rem" : "0.15rem 0.3rem",
                                                                    fontSize: "0.7rem",
                                                                    lineHeight: 1.2,
                                                                    color: "#233B3D",
                                                                    overflow: "hidden",
                                                                    cursor: "pointer",
                                                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                                                    zIndex: 5,
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    gap: "0.15rem"
                                                                }}
                                                                title={`${hourText} - ${endText}`}
                                                            >
                                                                <span style={{ fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }} data-i18n-user-content="true">{item.name}</span>
                                                                {height > 35 && <span style={{ opacity: 0.85, fontSize: "0.65rem", fontWeight: 600 }}>{hourText} - {endText}</span>}
                                                                {height > 55 && item.lieu && <span style={{ opacity: 0.75, fontSize: "0.65rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} data-i18n-user-content="true">📍 {item.lieu}</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })() : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.5rem" }}>
                        {weekdayLabels.map((label) => (
                            <div key={label} style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, padding: "0.35rem 0" }}>
                                {label}
                            </div>
                        ))}

                        {calendarDays.map((dayDate) => {
                            const dayKey = toDayKey(dayDate);
                            const dayEvents = eventsByDay.get(dayKey) || [];
                            const inCurrentMonth = dayDate.getMonth() === currentDate.getMonth();
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
                                                : start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });

                                            return (
                                                <span
                                                    key={item.id}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        if (onOpenEvent) {
                                                            onOpenEvent(item);
                                                        } else {
                                                            router.push(`?id=${item.id}`);
                                                        }
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
                                                    title={hourText}
                                                >
                                                    {hourText} <span data-i18n-user-content="true">{item.name}</span>
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
                )}

                <div style={{ background: "#F8FBFB", borderRadius: "16px", padding: "0.95rem" }}>
                    <div className="section-header" style={{ marginBottom: "0.5rem" }}>
                        <span className="section-title" style={{ fontSize: "0.98rem" }}>
                            {selectedDate.toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
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
                                    : start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
                                const endText = Number.isNaN(end.getTime())
                                    ? "--:--"
                                    : end.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            if (onOpenEvent) {
                                                onOpenEvent(item);
                                            } else {
                                                router.push(`?id=${item.id}`);
                                            }
                                        }}
                                        style={{
                                            border: "1px solid #d8e3e4",
                                            textAlign: "left",
                                            width: "100%",
                                            borderRadius: "16px",
                                            padding: "0.75rem",
                                            background: "#ffffff",
                                            display: "flex",
                                            gap: "1rem",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            transition: "transform 0.1s, box-shadow 0.1s",
                                        }}
                                    >
                                        <div style={{ width: "110px", height: "110px", borderRadius: "18px", background: "#f0f4f5", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#cbd5e1" }}>{item.name?.charAt(0) || "?"}</div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, display: "grid", gap: "0.25rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", alignItems: "center" }}>
                                                <span style={{ fontWeight: 700, fontSize: "0.95rem" }} data-i18n-user-content="true">{item.name}</span>
                                                <span className="db-badge" style={{ background: item.status === "valide" ? "#E5FFBC" : "#E6EDEE", textTransform: "capitalize" }}>{item.status}</span>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 500 }}>{startText} - {endText}</span>
                                                <span style={{ fontSize: "0.84rem", color: "var(--text-main)", opacity: 0.8 }}>
                                                    {item.lieu ? <span data-i18n-user-content="true">{item.lieu}</span> : "Lieu à confirmer"}
                                                </span>
                                            </div>
                                        </div>
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
