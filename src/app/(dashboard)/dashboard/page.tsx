import { getDashboardMetrics, type DashboardMetricsData } from "@/actions/dashboard";
import Link from "next/link";
import styles from "../dashboard.module.css";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

const ACTIVITY_ICONS: Record<string, string> = {
  invoice: "🧾",
  receipt: "💵",
  cash_movement: "💰",
};

export default async function DashboardPage() {
  const result = await getDashboardMetrics();
  const metrics: DashboardMetricsData | null =
    result.success && result.data ? result.data : null;

  const metricCards = [
    {
      icon: "💰",
      iconClass: "sales",
      label: "Ventas del Día",
      value: metrics ? fmt(metrics.todaySales) : "—",
      trend: null,
      trendDir: "up" as const,
    },
    {
      icon: "💵",
      iconClass: "clients",
      label: "Cobros del Día",
      value: metrics ? fmt(metrics.todayCollections) : "—",
      trend: null,
      trendDir: "up" as const,
    },
    {
      icon: "🧾",
      iconClass: "invoices",
      label: "Facturas Pendientes",
      value: metrics ? metrics.pendingInvoices.toString() : "—",
      trend: metrics && metrics.pendingInvoices > 0 ? "requieren acción" : null,
      trendDir: metrics && metrics.pendingInvoices > 0 ? ("down" as const) : ("up" as const),
    },
    {
      icon: "📦",
      iconClass: "stock",
      label: "Stock Bajo Mínimo",
      value: metrics ? metrics.lowStockCount.toString() : "—",
      trend: metrics && metrics.lowStockCount > 0 ? "requieren reposición" : "✓ ok",
      trendDir: metrics && metrics.lowStockCount > 0 ? ("down" as const) : ("up" as const),
    },
  ];

  const quickActions = [
    { icon: "🧾", label: "Nueva Factura", href: "/dashboard/facturacion" },
    { icon: "👥", label: "Nuevo Cliente", href: "/dashboard/clientes" },
    { icon: "📋", label: "Nuevo Presupuesto", href: "/dashboard/presupuestos" },
    { icon: "💵", label: "Abrir Caja", href: "/dashboard/caja" },
    { icon: "📦", label: "Movimiento de Stock", href: "/dashboard/stock" },
    { icon: "📝", label: "Registrar Cheque", href: "/dashboard/cheques" },
  ];

  return (
    <>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSubtitle}>
        Resumen del día —{" "}
        {new Date().toLocaleDateString("es-AR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      {/* Metric Cards */}
      <div className={styles.metricsGrid}>
        {metricCards.map((metric, index) => (
          <div key={index} className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={`${styles.metricIcon} ${styles[metric.iconClass as keyof typeof styles]}`}>
                {metric.icon}
              </div>
              {metric.trend && (
                <div
                  className={`${styles.metricTrend} ${styles[metric.trendDir]}`}
                >
                  {metric.trendDir === "up" ? "↑" : "↓"} {metric.trend}
                </div>
              )}
            </div>
            <div className={styles.metricValue}>{metric.value}</div>
            <div className={styles.metricLabel}>{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
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
              <div
                style={{
                  textAlign: "center",
                  padding: "var(--space-8)",
                  color: "var(--text-muted)",
                  fontSize: "var(--font-sm)",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "var(--space-2)" }}>📭</div>
                Sin actividad reciente
              </div>
            ) : (
              metrics.recentActivity.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    {ACTIVITY_ICONS[activity.type] ?? "📄"}
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>{activity.description}</div>
                    <div className={styles.activityTime}>
                      {new Date(activity.date).toLocaleString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  {activity.amount !== undefined && (
                    <div
                      className={`${styles.activityAmount} ${
                        activity.amount >= 0 ? styles.positive : styles.negative
                      }`}
                    >
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
