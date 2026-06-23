"use client";

import { useState, useEffect, useMemo } from "react";
import { getAgendaEvents, type AgendaEvent } from "@/actions/agenda";
import Link from "next/link";
import s from "@/styles/module-page.module.css";

const TYPE_META = {
  check_in:  { icon: "📥", label: "Cheque a cobrar", color: "#6CA28A", bg: "rgba(108,162,138,0.1)" },
  check_out: { icon: "📤", label: "Cheque a pagar",  color: "#D9383A", bg: "rgba(217,56,58,0.1)"  },
  invoice:   { icon: "🧾", label: "Factura pendiente",color: "#E2B83E", bg: "rgba(226,184,62,0.1)"  },
  crm:       { icon: "🎯", label: "Tarea CRM",        color: "#4D7CFF", bg: "rgba(77,124,255,0.1)"  },
};

const URGENCY_LABEL = {
  high:   { label: "Urgente", color: "#D9383A" },
  medium: { label: "Próximo", color: "#E2B83E" },
  low:    { label: "Programado", color: "#6CA28A" },
};

function dayLabel(daysFromToday: number): string {
  if (daysFromToday < 0) return `Hace ${Math.abs(daysFromToday)} días`;
  if (daysFromToday === 0) return "Hoy";
  if (daysFromToday === 1) return "Mañana";
  return `En ${daysFromToday} días`;
}

function fmt(n: number, currency = "ARS") {
  if (currency === "USD") return `U$S ${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

// ── Calendar Grid ────────────────────────────────────────────────────

function CalendarView({
  events,
  selectedDate,
  onSelect,
}: {
  events: AgendaEvent[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Build event map by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("es-AR", { month: "long", year: "numeric" });
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div style={{ background: "var(--bg-surface)", border: "2px solid var(--border-primary)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      {/* Month nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-4)",
        background: "linear-gradient(135deg, var(--primary-500), var(--secondary-600))",
      }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", background: "rgba(255,255,255,0.2)", color: "white", fontSize: "1rem", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <span style={{ fontWeight: 900, fontSize: "var(--font-base)", color: "white", textTransform: "capitalize" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", background: "rgba(255,255,255,0.2)", color: "white", fontSize: "1rem", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "2px solid var(--border-primary)" }}>
        {dayNames.map((d) => (
          <div key={d} style={{ padding: "var(--space-2)", textAlign: "center", fontSize: "var(--font-xs)", fontWeight: 800, color: "var(--text-tertiary)", background: "var(--bg-secondary)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} style={{ minHeight: 64, borderRight: "1px solid var(--border-secondary)", borderBottom: "1px solid var(--border-secondary)", background: "var(--bg-tertiary)" }} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const evs = eventsByDate[dateStr] ?? [];
          const isToday = dateStr === today.toISOString().split("T")[0];
          const isSelected = dateStr === selectedDate;
          const hasHigh = evs.some((e) => e.urgency === "high");
          const hasMedium = evs.some((e) => e.urgency === "medium");

          return (
            <div
              key={day}
              onClick={() => evs.length > 0 && onSelect(dateStr)}
              style={{
                minHeight: 64, padding: "var(--space-1)",
                borderRight: "1px solid var(--border-secondary)",
                borderBottom: "1px solid var(--border-secondary)",
                background: isSelected
                  ? "rgba(224,122,95,0.12)"
                  : isToday
                  ? "rgba(108,162,138,0.08)"
                  : "var(--bg-surface)",
                cursor: evs.length > 0 ? "pointer" : "default",
                transition: "background var(--transition-fast)",
                position: "relative",
              }}
              onMouseEnter={e => { if (evs.length > 0) (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-hover)"; }}
              onMouseLeave={e => {
                if (isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(224,122,95,0.12)";
                else if (isToday) (e.currentTarget as HTMLElement).style.background = "rgba(108,162,138,0.08)";
                else (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
              }}
            >
              <div style={{
                width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "var(--radius-full)",
                background: isToday ? "var(--primary-500)" : "transparent",
                fontWeight: isToday ? 900 : 600,
                fontSize: "var(--font-xs)",
                color: isToday ? "white" : "var(--text-primary)",
                marginBottom: 2,
              }}>
                {day}
              </div>
              {/* Event dots */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {evs.slice(0, 3).map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 6, height: 6, borderRadius: "var(--radius-full)",
                      background: TYPE_META[ev.type].color,
                      flexShrink: 0,
                    }}
                  />
                ))}
                {evs.length > 3 && (
                  <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--text-tertiary)" }}>+{evs.length - 3}</span>
                )}
              </div>
              {/* Urgency indicator */}
              {hasHigh && (
                <div style={{
                  position: "absolute", top: 4, right: 4,
                  width: 6, height: 6, borderRadius: "var(--radius-full)",
                  background: "#D9383A",
                  boxShadow: "0 0 4px #D9383A",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    getAgendaEvents().then((res) => {
      if (res.success && res.data) setEvents(res.data.events);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let evs = events;
    if (filterType !== "all") evs = evs.filter((e) => e.type === filterType);
    if (selectedDate) evs = evs.filter((e) => e.date === selectedDate);
    return evs;
  }, [events, filterType, selectedDate]);

  const criticalCount = events.filter((e) => e.urgency === "high").length;
  const next7Count = events.filter((e) => e.daysFromToday >= 0 && e.daysFromToday <= 7).length;
  const next30Count = events.filter((e) => e.daysFromToday >= 0 && e.daysFromToday <= 30).length;

  return (
    <>
      <h1 className={s.pageTitle}>Agenda Financiera</h1>
      <p className={s.pageSubtitle}>Todos tus eventos financieros en un solo lugar</p>

      {/* Summary chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "Urgentes", value: criticalCount, color: "#D9383A", bg: "rgba(217,56,58,0.08)" },
          { label: "Próximos 7 días", value: next7Count, color: "#E2B83E", bg: "rgba(226,184,62,0.08)" },
          { label: "Próximos 30 días", value: next30Count, color: "#4D7CFF", bg: "rgba(77,124,255,0.08)" },
          { label: "Total", value: events.length, color: "var(--text-secondary)", bg: "var(--bg-secondary)" },
        ].map((chip) => (
          <div key={chip.label} style={{
            padding: "var(--space-2) var(--space-4)",
            background: chip.bg, border: `2px solid ${chip.color}`,
            borderRadius: "var(--radius-full)",
            display: "flex", alignItems: "center", gap: "var(--space-2)",
          }}>
            <span style={{ fontWeight: 900, fontSize: "var(--font-lg)", color: chip.color }}>{chip.value}</span>
            <span style={{ fontWeight: 700, fontSize: "var(--font-xs)", color: chip.color }}>{chip.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--space-6)", alignItems: "start" }}>
        {/* Calendar */}
        <CalendarView
          events={events}
          selectedDate={selectedDate}
          onSelect={(date) => setSelectedDate(selectedDate === date ? null : date)}
        />

        {/* Events panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Filter */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {[
              { key: "all", label: "Todo", icon: "📋" },
              { key: "check_in", label: "Cobros", icon: "📥" },
              { key: "check_out", label: "Pagos", icon: "📤" },
              { key: "invoice", label: "Facturas", icon: "🧾" },
              { key: "crm", label: "CRM", icon: "🎯" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  borderRadius: "var(--radius-full)",
                  border: `2px solid ${filterType === f.key ? "var(--primary-500)" : "var(--border-secondary)"}`,
                  background: filterType === f.key ? "rgba(224,122,95,0.12)" : "transparent",
                  fontSize: "var(--font-xs)", fontWeight: 700, cursor: "pointer",
                  color: filterType === f.key ? "var(--primary-500)" : "var(--text-tertiary)",
                }}
              >
                {f.icon} {f.label}
              </button>
            ))}
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  borderRadius: "var(--radius-full)", border: "2px solid var(--secondary-500)",
                  background: "rgba(108,162,138,0.1)", fontSize: "var(--font-xs)", fontWeight: 700,
                  cursor: "pointer", color: "var(--secondary-600)",
                }}
              >
                📅 {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })} ✕
              </button>
            )}
          </div>

          {/* Events list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: 600, overflowY: "auto" }}>
            {loading && (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-tertiary)" }}>
                <div style={{ fontSize: "1.5rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600, marginTop: "var(--space-2)" }}>Cargando eventos...</div>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-tertiary)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-2)" }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: "var(--font-sm)" }}>Sin eventos para este filtro</div>
              </div>
            )}
            {filtered.map((ev, i) => {
              const meta = TYPE_META[ev.type];
              const urgency = URGENCY_LABEL[ev.urgency];
              return (
                <Link
                  key={ev.id + i}
                  href={ev.href}
                  style={{
                    display: "block",
                    padding: "var(--space-3)",
                    background: meta.bg,
                    border: `2px solid ${meta.color}`,
                    borderRadius: "var(--radius-lg)",
                    textDecoration: "none",
                    animation: `fadeInUp 0.3s ease-out ${i * 0.04}s both`,
                    transition: "transform var(--transition-fast)",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateX(4px)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "translateX(0)"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                    <span style={{ fontSize: "1rem" }}>{meta.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: "var(--font-xs)", color: meta.color }}>{meta.label}</span>
                    <span style={{
                      marginLeft: "auto", fontSize: "0.65rem", fontWeight: 800,
                      color: urgency.color, background: `${urgency.color}20`,
                      padding: "1px 6px", borderRadius: "var(--radius-full)",
                    }}>
                      {dayLabel(ev.daysFromToday)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "var(--font-xs)", color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 4 }}>
                    {ev.title}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                      {new Date(ev.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    {ev.amount !== undefined && (
                      <span style={{ fontWeight: 900, fontSize: "var(--font-xs)", color: meta.color }}>
                        {fmt(ev.amount, ev.currency)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
