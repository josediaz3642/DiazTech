"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { SalesReportData, SalesByDay, InvoiceByType } from "@/actions/reports";
import styles from "../reports.module.css";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

interface SalesChartsProps {
  data: SalesReportData;
}

const CHART_COLORS = {
  primary: "#818cf8",
  secondary: "#34d399",
  accent: "#f59e0b",
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--surface-hover)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3)",
        fontSize: "var(--font-sm)",
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: "6px", fontSize: "var(--font-xs)" }}>
        {label}
      </div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color, fontWeight: 600 }}>
          {entry.name}: {fmt(entry.value)}
        </div>
      ))}
    </div>
  );
};

export function SalesAreaChart({ byDay }: { byDay: SalesByDay[] }) {
  const data = byDay.map((d) => ({
    date: d.date.slice(5), // MM-DD
    Ventas: d.total,
    Facturas: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => fmt(v)}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="Ventas"
          stroke={CHART_COLORS.primary}
          strokeWidth={2.5}
          fill="url(#colorVentas)"
          dot={false}
          activeDot={{ r: 5, fill: CHART_COLORS.primary }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SalesByTypeChart({ byType }: { byType: InvoiceByType[] }) {
  const data = byType.map((t) => ({
    type: `Tipo ${t.type}`,
    Total: t.total,
    Cantidad: t.count,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="type"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => fmt(v)}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="Total" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SalesCharts({ data }: SalesChartsProps) {
  return (
    <>
      <div className={styles.chartsGrid}>
        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div>
            <p className={styles.chartTitle}>Evolución de Ventas</p>
            <p className={styles.chartSubtitle}>Total facturado por día en el período seleccionado</p>
          </div>
          <div className={styles.chartWrapperTall}>
            <SalesAreaChart byDay={data.byDay} />
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>Por Tipo de Comprobante</p>
            <p className={styles.chartSubtitle}>Distribución de ventas por tipo</p>
          </div>
          <div className={styles.chartWrapper}>
            {data.byType.length > 0 ? (
              <SalesByTypeChart byType={data.byType} />
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🧾</div>
                <p className={styles.emptyTitle}>Sin datos</p>
                <p className={styles.emptyDesc}>No hay facturas en este período</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>Resumen del Período</p>
            <p className={styles.chartSubtitle}>Métricas comparadas con el período anterior</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-2) 0" }}>
            {[
              {
                label: "Total Facturado",
                current: data.totalSales,
                prev: data.previousPeriodTotal,
                format: fmt,
              },
              {
                label: "Nro de Facturas",
                current: data.totalInvoices,
                prev: 0,
                format: (v: number) => v.toString(),
              },
              {
                label: "Ticket Promedio",
                current: data.avgTicket,
                prev: 0,
                format: fmt,
              },
            ].map((metric) => {
              const change = metric.prev > 0
                ? Math.round(((metric.current - metric.prev) / metric.prev) * 100)
                : null;
              return (
                <div
                  key={metric.label}
                  style={{
                    padding: "var(--space-4)",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {metric.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)" }}>
                    <div style={{ fontSize: "var(--font-xl)", fontWeight: 800, color: "var(--text-primary)" }}>
                      {metric.format(metric.current)}
                    </div>
                    {change !== null && (
                      <span
                        className={`${styles.kpiChange} ${change >= 0 ? styles.up : styles.down}`}
                      >
                        {change >= 0 ? "↑" : "↓"} {Math.abs(change)}% vs anterior
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
