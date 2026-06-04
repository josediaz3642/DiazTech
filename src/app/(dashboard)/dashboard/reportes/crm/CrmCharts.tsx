"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { CrmReportData } from "@/actions/reports";
import styles from "../reports.module.css";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  in_progress: "#818cf8",
  completed: "#10b981",
  cancelled: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  urgent: "#dc2626",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En proceso",
  completed: "Completada",
  cancelled: "Cancelada",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export function CrmCharts({ data }: { data: CrmReportData }) {
  const statusPieData = data.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    status: s.status,
  }));

  const priorityBarData = data.byPriority.map((p) => ({
    priority: PRIORITY_LABELS[p.priority] ?? p.priority,
    Tareas: p.count,
    fill: PRIORITY_COLORS[p.priority] ?? "#818cf8",
  }));

  return (
    <div className={styles.chartsGrid}>
      {/* Status Pie */}
      <div className={styles.chartCard}>
        <div>
          <p className={styles.chartTitle}>Tareas por Estado</p>
          <p className={styles.chartSubtitle}>Distribución de tareas según su estado actual</p>
        </div>
        <div className={styles.chartWrapper}>
          {statusPieData.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎯</div>
              <p className={styles.emptyTitle}>Sin tareas en el período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? "#818cf8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} tareas`]} />
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

      {/* Priority Bar */}
      <div className={styles.chartCard}>
        <div>
          <p className={styles.chartTitle}>Tareas por Prioridad</p>
          <p className={styles.chartSubtitle}>Cantidad de tareas por nivel de prioridad</p>
        </div>
        <div className={styles.chartWrapper}>
          {priorityBarData.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <p className={styles.emptyTitle}>Sin datos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={priorityBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="priority" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} tareas`]} />
                {priorityBarData.map((entry, i) => (
                  <Bar key={i} dataKey="Tareas" fill={entry.fill} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
