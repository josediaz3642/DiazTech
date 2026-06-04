"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { StockReportData } from "@/actions/reports";
import styles from "../reports.module.css";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

const PIE_COLORS = [
  "#818cf8", "#34d399", "#f59e0b", "#ec4899",
  "#60a5fa", "#a78bfa", "#fb923c", "#4ade80",
];

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
      <div style={{ color: "var(--text-muted)", marginBottom: "6px", fontSize: "var(--font-xs)" }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color, fontWeight: 600 }}>
          {entry.name}: {entry.name === "Valor" ? fmt(entry.value) : entry.value}
        </div>
      ))}
    </div>
  );
};

export function StockCharts({ data }: { data: StockReportData }) {
  const barData = data.topByValue.map((p) => ({
    name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
    Valor: p.stockValue,
  }));

  const pieData = data.byCategory.map((c) => ({
    name: c.category,
    value: c.totalValue,
  }));

  return (
    <div className={styles.chartsGrid}>
      {/* Top by value bar chart */}
      <div className={styles.chartCard}>
        <div>
          <p className={styles.chartTitle}>Top 10 Productos por Valor de Stock</p>
          <p className={styles.chartSubtitle}>Valorización (cantidad × precio de costo)</p>
        </div>
        <div className={styles.chartWrapper}>
          {barData.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <p className={styles.emptyTitle}>Sin productos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tickFormatter={fmt} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Valor" fill="#818cf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie by category */}
      <div className={styles.chartCard}>
        <div>
          <p className={styles.chartTitle}>Stock por Categoría</p>
          <p className={styles.chartSubtitle}>Distribución del valor de stock por categoría</p>
        </div>
        <div className={styles.chartWrapper}>
          {pieData.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🗂</div>
              <p className={styles.emptyTitle}>Sin categorías</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [fmt(Number(v))]} />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
