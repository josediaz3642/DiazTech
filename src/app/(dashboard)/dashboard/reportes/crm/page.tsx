import { getCrmReport } from "@/actions/reports";
import Link from "next/link";
import { CrmCharts } from "./CrmCharts";
import styles from "../reports.module.css";
import dashStyles from "../../../dashboard.module.css";

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

const STATUS_CLASS: Record<string, string> = {
  pending: "statusPending",
  in_progress: "statusInProgress",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

const PRIORITY_CLASS: Record<string, string> = {
  low: "priorityLow",
  medium: "priorityMedium",
  high: "priorityHigh",
  urgent: "priorityUrgent",
};

export const revalidate = 0; // Disable server component caching to ensure real-time data

export default async function CrmReportePage() {
  const result = await getCrmReport("month");
  const data = result.success && result.data
    ? result.data
    : {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        completionRate: 0,
        byStatus: [],
        byPriority: [],
        recentTasks: [],
      };

  return (
    <>
      <Link href="/dashboard/reportes" className={styles.backLink}>
        ← Volver a Reportes
      </Link>

      <div className={styles.reportHeader}>
        <div className={styles.reportHeaderLeft}>
          <h1 className={dashStyles.pageTitle}>🎯 Reporte de CRM</h1>
          <p className={dashStyles.pageSubtitle}>
            Actividad comercial, seguimiento de tareas y métricas del equipo
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <span className={styles.kpiLabel}>Total Tareas</span>
          <span className={styles.kpiValue}>{data.totalTasks}</span>
          <span className={`${styles.kpiChange} ${styles.neutral}`}>este mes</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <span className={styles.kpiLabel}>Completadas</span>
          <span className={styles.kpiValue}>{data.completedTasks}</span>
          <span className={`${styles.kpiChange} ${styles.up}`}>↑ finalizadas</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <span className={styles.kpiLabel}>Tasa de Completitud</span>
          <span className={styles.kpiValue}>{data.completionRate}%</span>
          <span
            className={`${styles.kpiChange} ${data.completionRate >= 70 ? styles.up : styles.down}`}
          >
            {data.completionRate >= 70 ? "↑ buena" : "↓ mejorar"}
          </span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
          <span className={styles.kpiLabel}>Vencidas</span>
          <span className={styles.kpiValue}>{data.overdueTasks}</span>
          <span className={`${styles.kpiChange} ${data.overdueTasks > 0 ? styles.down : styles.up}`}>
            {data.overdueTasks > 0 ? "↓ requieren atención" : "✓ sin vencidos"}
          </span>
        </div>
      </div>

      {/* Charts */}
      <CrmCharts data={data} />

      {/* Recent Tasks Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <h2 className={styles.tableCardTitle}>Últimas 20 tareas</h2>
        </div>

        {data.recentTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <p className={styles.emptyTitle}>Sin tareas registradas</p>
            <p className={styles.emptyDesc}>
              Creá tareas en el módulo de CRM para verlas aquí.
            </p>
          </div>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th className={styles.right}>Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {task.title}
                    {task.isOverdue && (
                      <span className={styles.overdueBadge}>vencida</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles[STATUS_CLASS[task.status] as keyof typeof styles] ?? ""}`}
                    >
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.priorityBadge} ${styles[PRIORITY_CLASS[task.priority] as keyof typeof styles] ?? ""}`}
                    >
                      {PRIORITY_LABELS[task.priority] ?? task.priority}
                    </span>
                  </td>
                  <td
                    className={styles.right}
                    style={{
                      color: task.isOverdue ? "var(--danger)" : "var(--text-muted)",
                      fontWeight: task.isOverdue ? 700 : 400,
                    }}
                  >
                    {task.dueDate ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
