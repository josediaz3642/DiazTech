import { getStockReport } from "@/actions/reports";
import Link from "next/link";
import { StockCharts } from "./StockCharts";
import styles from "../reports.module.css";
import dashStyles from "../../../dashboard.module.css";

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export default async function StockReportePage() {
  const result = await getStockReport();
  const data = result.success && result.data
    ? result.data
    : {
        totalStockValue: 0,
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        topByValue: [],
        lowStock: [],
        byCategory: [],
      };

  return (
    <>
      <Link href="/dashboard/reportes" className={styles.backLink}>
        ← Volver a Reportes
      </Link>

      <div className={styles.reportHeader}>
        <div className={styles.reportHeaderLeft}>
          <h1 className={dashStyles.pageTitle}>📦 Reporte de Stock</h1>
          <p className={dashStyles.pageSubtitle}>
            Valorización del inventario, alertas de reposición y análisis por categoría
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <span className={styles.kpiLabel}>Valor Total del Stock</span>
          <span className={styles.kpiValue}>{fmt(data.totalStockValue)}</span>
          <span className={`${styles.kpiChange} ${styles.neutral}`}>precio de costo</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <span className={styles.kpiLabel}>Productos Activos</span>
          <span className={styles.kpiValue}>{data.totalProducts}</span>
          <span className={`${styles.kpiChange} ${styles.neutral}`}>en inventario</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <span className={styles.kpiLabel}>Bajo Mínimo</span>
          <span className={styles.kpiValue}>{data.lowStockCount}</span>
          <span className={`${styles.kpiChange} ${styles.down}`}>requieren reposición</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
          <span className={styles.kpiLabel}>Sin Stock</span>
          <span className={styles.kpiValue}>{data.outOfStockCount}</span>
          <span className={`${styles.kpiChange} ${styles.down}`}>sin existencias</span>
        </div>
      </div>

      {/* Charts */}
      <StockCharts data={data} />

      {/* Low Stock Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <h2 className={styles.tableCardTitle}>
            Productos bajo stock mínimo{" "}
            {data.lowStockCount > 0 && (
              <span
                style={{
                  fontSize: "var(--font-xs)",
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontWeight: 600,
                }}
              >
                {data.lowStockCount} productos
              </span>
            )}
          </h2>
        </div>

        {data.lowStock.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✅</div>
            <p className={styles.emptyTitle}>¡Stock en óptimas condiciones!</p>
            <p className={styles.emptyDesc}>
              Todos los productos tienen stock por encima del mínimo configurado.
            </p>
          </div>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th className={styles.right}>Stock Actual</th>
                <th className={styles.right}>Stock Mínimo</th>
                <th className={styles.right}>Estado</th>
                <th className={styles.right}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.lowStock.map((p) => {
                const pct = p.minStock > 0
                  ? Math.min(100, Math.round((p.totalStock / p.minStock) * 100))
                  : 100;
                const fillClass =
                  p.totalStock === 0
                    ? styles.critical
                    : pct <= 50
                    ? styles.low
                    : styles.good;
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "var(--font-xs)" }}>
                      {p.code}
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {p.name}
                    </td>
                    <td>{p.category}</td>
                    <td className={styles.right}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: p.totalStock === 0 ? "var(--danger)" : "var(--warning)",
                        }}
                      >
                        {p.totalStock}
                      </span>
                    </td>
                    <td className={styles.right}>{p.minStock}</td>
                    <td className={styles.right}>
                      <div className={styles.stockBar}>
                        <div className={styles.stockBarTrack}>
                          <div
                            className={`${styles.stockBarFill} ${fillClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={styles.stockBarLabel}>{pct}%</span>
                      </div>
                    </td>
                    <td className={styles.right} style={{ fontWeight: 600 }}>
                      {fmt(p.stockValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
