"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { type DashboardMetricsData } from "@/actions/dashboard";
import styles from "../dashboard.module.css";

// ── Types ────────────────────────────────────────────────────────────

interface Props {
  metrics: DashboardMetricsData | null;
}

// ── Animated Counter ─────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400, decimals = 0) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [target, duration, decimals]);

  return value;
}

// ── Sparkline ────────────────────────────────────────────────────────

function Sparkline({ data, color = "var(--primary-500)", height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  // Fill area
  const fillPath = `M${pts[0]} L${pts.join(" L")} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg-${color.replace(/[^a-z]/gi, "")})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {pts.length > 0 && (() => {
        const last = pts[pts.length - 1].split(",");
        return (
          <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
        );
      })()}
    </svg>
  );
}

// ── Animated Metric Card ─────────────────────────────────────────────

interface MetricCardProps {
  icon: string;
  label: string;
  rawValue: number;
  prefix?: string;
  suffix?: string;
  trend?: string | null;
  trendDir?: "up" | "down";
  sparkData?: number[];
  sparkColor?: string;
  accentColor?: string;
  delay?: number;
  isCount?: boolean;
}

function MetricCard({
  icon, label, rawValue, prefix = "", suffix = "",
  trend, trendDir = "up", sparkData, sparkColor,
  accentColor = "var(--primary-500)", delay = 0, isCount = false,
}: MetricCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const animated = useCountUp(mounted ? rawValue : 0, 1400, isCount ? 0 : 0);

  const fmt = (n: number) => {
    if (isCount) return Math.round(n).toString();
    if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`;
    return `${prefix}${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}${suffix}`;
  };

  return (
    <div
      className={styles.metricCard}
      style={{
        animation: `fadeInUp 0.5s ease-out ${delay}ms both`,
        overflow: "hidden", position: "relative",
      }}
    >
      {/* Accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${accentColor}, transparent)`,
      }} />

      <div className={styles.metricHeader}>
        <div className={styles.metricIcon}>{icon}</div>
        {trend && (
          <div
            className={`${styles.metricTrend} ${styles[trendDir]}`}
            style={{ display: "flex", alignItems: "center", gap: 3 }}
          >
            {trendDir === "up" ? "↑" : "↓"} {trend}
          </div>
        )}
      </div>

      <div className={styles.metricValue} style={{ color: accentColor }}>
        {rawValue === 0 && !mounted ? "—" : fmt(animated)}
      </div>
      <div className={styles.metricLabel}>{label}</div>

      {/* Sparkline */}
      {sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: "var(--space-3)", opacity: 0.7 }}>
          <Sparkline data={sparkData} color={sparkColor ?? accentColor} height={36} />
        </div>
      )}
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, string> = {
  invoice: "🧾",
  receipt: "💵",
  cash_movement: "💰",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

// ── Main Component ───────────────────────────────────────────────────

export default function AnimatedDashboard({ metrics }: Props) {
  // Build sparkline data from recent activity (last 7 days daily totals)
  const sparkSales = (() => {
    if (!metrics?.recentActivity) return Array(7).fill(0);
    const days: Record<string, number> = {};
    for (const a of metrics.recentActivity) {
      if (a.type === "invoice" && a.amount !== undefined) {
        const d = new Date(a.date).toISOString().split("T")[0];
        days[d] = (days[d] ?? 0) + a.amount;
      }
    }
    return Object.values(days).slice(-7);
  })();

  const quickActions = [
    { icon: "🧾", label: "Nueva Factura",      href: "/dashboard/facturacion" },
    { icon: "👥", label: "Nuevo Cliente",       href: "/dashboard/clientes"   },
    { icon: "📋", label: "Nuevo Presupuesto",   href: "/dashboard/presupuestos"},
    { icon: "💵", label: "Abrir Caja",          href: "/dashboard/caja"       },
    { icon: "📦", label: "Movimiento de Stock", href: "/dashboard/stock"      },
    { icon: "📅", label: "Ver Agenda",          href: "/dashboard/agenda"     },
  ];

  return (
    <>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSubtitle}>
        Resumen del día —{" "}
        {new Date().toLocaleDateString("es-AR", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })}
      </p>

      {/* ── Metric Cards ── */}
      <div className={styles.metricsGrid}>
        <MetricCard
          icon="💰" label="Ventas del Día"
          rawValue={metrics?.todaySales ?? 0}
          prefix="$"
          sparkData={sparkSales}
          accentColor="#E07A5F"
          sparkColor="#E07A5F"
          delay={0}
        />
        <MetricCard
          icon="💵" label="Cobros del Día"
          rawValue={metrics?.todayCollections ?? 0}
          prefix="$"
          accentColor="#6CA28A"
          sparkColor="#6CA28A"
          delay={100}
        />
        <MetricCard
          icon="🧾" label="Facturas Pendientes"
          rawValue={metrics?.pendingInvoices ?? 0}
          isCount
          trend={metrics && metrics.pendingInvoices > 0 ? "requieren acción" : undefined}
          trendDir={metrics && metrics.pendingInvoices > 0 ? "down" : "up"}
          accentColor="#E2B83E"
          delay={200}
        />
        <MetricCard
          icon="📦" label="Stock Bajo Mínimo"
          rawValue={metrics?.lowStockCount ?? 0}
          isCount
          trend={metrics && metrics.lowStockCount > 0 ? "reponer" : "✓ ok"}
          trendDir={metrics && metrics.lowStockCount > 0 ? "down" : "up"}
          accentColor={metrics && metrics.lowStockCount > 0 ? "#D9383A" : "#6CA28A"}
          delay={300}
        />
      </div>

      {/* ── Main Grid ── */}
      <div className={styles.dashGrid}>
        {/* Recent Activity */}
        <div className={styles.dashCard}>
          <div className={styles.dashCardHeader}>
            <h2 className={styles.dashCardTitle}>Actividad Reciente</h2>
            <Link href="/dashboard/reportes" className={styles.dashCardAction}>
              Ver reportes →
            </Link>
          </div>
          <div className={styles.activityList}>
            {!metrics || metrics.recentActivity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-tertiary)", fontSize: "var(--font-sm)" }}>
                <div style={{ fontSize: "32px", marginBottom: "var(--space-2)" }}>📭</div>
                Sin actividad reciente
              </div>
            ) : (
              metrics.recentActivity.map((activity, i) => (
                <div
                  key={activity.id}
                  className={styles.activityItem}
                  style={{ animation: `fadeInLeft 0.4s ease-out ${i * 60}ms both` }}
                >
                  <div className={styles.activityIcon}>
                    {ACTIVITY_ICONS[activity.type] ?? "📄"}
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>{activity.description}</div>
                    <div className={styles.activityTime}>
                      {new Date(activity.date).toLocaleString("es-AR", {
                        hour: "2-digit", minute: "2-digit",
                        day: "numeric", month: "short",
                      })}
                    </div>
                  </div>
                  {activity.amount !== undefined && (
                    <div className={`${styles.activityAmount} ${activity.amount >= 0 ? styles.positive : styles.negative}`}>
                      {activity.amount >= 0 ? "+" : ""}
                      {fmt(Math.abs(activity.amount))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.dashCard}>
          <div className={styles.dashCardHeader}>
            <h2 className={styles.dashCardTitle}>Acciones Rápidas</h2>
          </div>
          <div className={styles.quickActions}>
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={styles.quickAction}
                style={{ animation: `scaleIn 0.3s ease-out ${index * 60}ms both` }}
              >
                <span className={styles.quickActionIcon}>{action.icon}</span>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
