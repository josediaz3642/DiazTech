import Link from "next/link";
import styles from "./reports.module.css";
import dashStyles from "../../dashboard.module.css";

const REPORTS = [
  {
    icon: "📈",
    iconClass: "iconSales",
    title: "Ventas",
    desc: "Evolución de facturación, top clientes, análisis por tipo de comprobante y comparativa de períodos.",
    href: "/dashboard/reportes/ventas",
    color: "#818cf8",
  },
  {
    icon: "💰",
    iconClass: "iconTreasury",
    title: "Tesorería",
    desc: "Flujo de caja diario, saldos bancarios, cheques próximos a vencer y análisis de ingresos vs egresos.",
    href: "/dashboard/reportes/tesoreria",
    color: "#10b981",
  },
  {
    icon: "📦",
    iconClass: "iconStock",
    title: "Stock",
    desc: "Valorización del inventario, productos bajo mínimo, rotación por categoría y alertas de reposición.",
    href: "/dashboard/reportes/stock",
    color: "#f59e0b",
  },
  {
    icon: "🎯",
    iconClass: "iconCrm",
    title: "CRM",
    desc: "Tareas por estado y prioridad, tasa de completitud, actividad del equipo y vencimientos próximos.",
    href: "/dashboard/reportes/crm",
    color: "#ec4899",
  },
];

export default function ReportesPage() {
  return (
    <>
      <div className={styles.reportHeader}>
        <div className={styles.reportHeaderLeft}>
          <h1 className={dashStyles.pageTitle}>Reportes & Analytics</h1>
          <p className={dashStyles.pageSubtitle}>
            Analizá el rendimiento de tu empresa con gráficos y métricas en tiempo real
          </p>
        </div>
      </div>

      <div
        style={{
          padding: "var(--space-5)",
          background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "var(--radius-xl)",
          marginBottom: "var(--space-6)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
        }}
      >
        <span style={{ fontSize: "32px" }}>📊</span>
        <div>
          <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
            Centro de Inteligencia Empresarial
          </div>
          <div style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
            Seleccioná un módulo para ver sus reportes detallados con filtros de período y exportación de datos.
          </div>
        </div>
      </div>

      <div className={styles.hubGrid}>
        {REPORTS.map((report) => (
          <Link key={report.href} href={report.href} className={styles.hubCard}>
            <div className={`${styles.hubCardIcon} ${styles[report.iconClass as keyof typeof styles]}`}>
              {report.icon}
            </div>
            <h2 className={styles.hubCardTitle}>{report.title}</h2>
            <p className={styles.hubCardDesc}>{report.desc}</p>
            <div className={styles.hubCardArrow}>→</div>
          </Link>
        ))}
      </div>
    </>
  );
}
