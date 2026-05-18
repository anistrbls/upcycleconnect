"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";

function formatDayTitle(date) {
    const label = date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "short",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatExpertsLabel(count) {
    const n = Number(count) || 0;
    if (n <= 0) return "Aucun expert disponible";
    if (n === 1) return "1 expert disponible";
    return `${n} experts disponibles`;
}

function formatSlotTimeRange(slot) {
    const start = new Date(slot.scheduledAt);
    const end = new Date(slot.endAt);
    const t1 = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const t2 = end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `${t1} – ${t2}`;
}

export default function DaySlotsRow({ dayDate, slots, selectedSlot, onSelectSlot, durationMinutes }) {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    }, []);

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return undefined;
        el.addEventListener("scroll", updateScrollState, { passive: true });
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => {
            el.removeEventListener("scroll", updateScrollState);
            ro.disconnect();
        };
    }, [slots, updateScrollState]);

    const scrollBy = (direction) => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = Math.max(el.clientWidth * 0.75, 200);
        el.scrollBy({ left: direction * amount, behavior: "smooth" });
    };

    const isToday = (() => {
        const today = new Date();
        return (
            dayDate.getDate() === today.getDate() &&
            dayDate.getMonth() === today.getMonth() &&
            dayDate.getFullYear() === today.getFullYear()
        );
    })();

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 150px) 1fr",
                gap: "0.75rem 1rem",
                alignItems: "center",
                padding: "1rem 0",
                borderBottom: "1px solid rgba(35,59,61,0.08)",
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        color: "var(--text-main)",
                        lineHeight: 1.3,
                    }}
                >
                    {formatDayTitle(dayDate)}
                </div>
                {isToday ? (
                    <span
                        style={{
                            display: "inline-block",
                            marginTop: "0.25rem",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "var(--forest-deep)",
                        }}
                    >
                        Aujourd&apos;hui
                    </span>
                ) : null}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", minWidth: 0 }}>
                <button
                    type="button"
                    className="action-btn"
                    onClick={() => scrollBy(-1)}
                    disabled={!canScrollLeft || slots.length === 0}
                    aria-label="Créneaux précédents"
                    style={{
                        flexShrink: 0,
                        width: 36,
                        height: 36,
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: !canScrollLeft || slots.length === 0 ? 0.35 : 1,
                    }}
                >
                    <ChevronLeft size={18} />
                </button>

                <div
                    ref={scrollRef}
                    style={{
                        flex: 1,
                        display: "flex",
                        gap: "0.65rem",
                        overflowX: "hidden",
                        overflowY: "hidden",
                        scrollSnapType: "x mandatory",
                        padding: "0.15rem 0.1rem",
                        minWidth: 0,
                    }}
                >
                    {slots.length === 0 ? (
                        <p
                            style={{
                                margin: 0,
                                padding: "0.85rem 1rem",
                                fontSize: "0.85rem",
                                color: "var(--text-muted)",
                                fontStyle: "italic",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Aucun créneau disponible
                        </p>
                    ) : (
                        slots.map((slot) => {
                            const isSelected = selectedSlot?.scheduledAt === slot.scheduledAt;
                            const timeRange = formatSlotTimeRange(slot);
                            return (
                                <button
                                    key={slot.scheduledAt}
                                    type="button"
                                    onClick={() => onSelectSlot(slot)}
                                    style={{
                                        flex: "0 0 auto",
                                        width: "min(168px, 72vw)",
                                        scrollSnapAlign: "start",
                                        border: isSelected
                                            ? "2px solid var(--forest-deep)"
                                            : "1px solid rgba(35, 59, 61, 0.1)",
                                        borderRadius: "16px",
                                        background: isSelected ? "rgba(198, 255, 0, 0.35)" : "#FFFFFF",
                                        padding: "0.85rem 1rem",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontFamily: "inherit",
                                        boxShadow: isSelected
                                            ? "0 4px 14px rgba(35, 59, 61, 0.12)"
                                            : "0 2px 8px rgba(35, 59, 61, 0.06)",
                                        transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.35rem",
                                            fontSize: "0.92rem",
                                            fontWeight: 700,
                                            color: "var(--text-main)",
                                            marginBottom: "0.35rem",
                                        }}
                                    >
                                        <Clock size={14} strokeWidth={2.2} />
                                        {timeRange}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-muted)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.3rem",
                                        }}
                                    >
                                        <Users size={12} />
                                        {formatExpertsLabel(slot.providerCount)}
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                                        {durationMinutes} min
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <button
                    type="button"
                    className="action-btn"
                    onClick={() => scrollBy(1)}
                    disabled={!canScrollRight || slots.length === 0}
                    aria-label="Créneaux suivants"
                    style={{
                        flexShrink: 0,
                        width: 36,
                        height: 36,
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: !canScrollRight || slots.length === 0 ? 0.35 : 1,
                    }}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
