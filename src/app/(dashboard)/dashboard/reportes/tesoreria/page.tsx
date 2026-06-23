import { getTreasuryReport } from "@/actions/reports";
import Link from "next/link";
import { TreasuryCharts } from "./TreasuryCharts";
import styles from "../reports.module.css";
import dashStyles from "../../../dashboard.module.css";

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export const dynamic = "force-dynamic";

export default async function TesoreriaPage() {
  const result = await getTreasuryReport("month");
  const data = result.success && result.data
    ? result.data
    : {
        cashFlowByDay: [],
        totalIncome: 0,
        totalExpense: 0,
        netFlow: 0,
        bankBalances: [],
        totalBankBalance: 0,
        upcomingChecks: [],
      };

  return (
    <>
      <Link href="/dashboard/reportes" className={styles.backLink}>
        ← Volver a Reportes
      </Link>

      <div className={styles.reportHeader}>
        <div className={styles.reportHeaderLeft}>
          <h1 className={dashStyles.pageTitle}>💰 Reporte de Tesorería</h1>
          <p className={dashStyles.pageSubtitle}>
            Flujo de caja, saldos bancarios y cheques próximos a vencer
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <span className={styles.kpiLabel}>Total Ingresos</span>
          <span className={styles.kpiValue}>{fmt(data.totalIncome)}</span>
          <span className={`${styles.kpiChange} ${styles.up}`}>↑ este mes</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
          <span className={styles.kpiLabel}>Total Egresos</span>
          <span className={styles.kpiValue}>{fmt(data.totalExpense)}</span>
          <span className={`${styles.kpiChange} ${styles.neutral}`}>este mes</span>
        </div>
        <div className={`${styles.kpiCard} ${data.netFlow >= 0 ? styles.kpiPrimary : styles.kpiDanger}`}>
          <span className={styles.kpiLabel}>Flujo Neto</span>
          <span className={styles.kpiValue}>{fmt(data.netFlow)}</span>
          <span className={`${styles.kpiChange} ${data.netFlow >= 0 ? styles.up : styles.down}`}>
            {data.netFlow >= 0 ? "↑ positivo" : "↓ negativo"}
          </span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <span className={styles.kpiLabel}>Saldo Bancario Total</span>
          <span className={styles.kpiValue}>{fmt(data.totalBankBalance)}</span>
          <span className={`${styles.kpiChange} ${styles.neutral}`}>{data.bankBalances.length} cuentas</span>
        </div>
      </div>

      {/* Charts */}
      <TreasuryCharts data={data} />

      {/* Upcoming Checks */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <h2 className={styles.tableCardTitle}>
            Cheques próximos a vencer{" "}
            <span
              style={{
                fontSize: "var(--font-xs)",
                background: "rgba(245,158,11,0.15)",
                color: "#f59e0b",
                padding: "2px 8px",
                borderRadius: "999px",
                fontWeight: 600,
              }}
            >
              próximos 30 días
            </span>
          </h2>
        </div>
        {data.upcomingChecks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <p className={styles.emptyTitle}>Sin cheques próximos a vencer</p>
            <p className={styles.emptyDesc}>No hay cheques pendientes en los próximos 30 días</p>
          </div>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Banco</th>
                <th>Número</th>
                <th className={styles.right}>Importe</th>
                <th className={styles.right}>Vencimiento</th>
                <th className={styles.right}>Días restantes</th>
              </tr>
            </thead>
            <tbody>
              {data.upcomingChecks.map((ch) => (
                <tr key={ch.id}>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={ch.type === "received" ? { background: "rgba(16,185,129,0.1)", color: "#10b981" } : { background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                    >
                      {ch.type === "received" ? "Recibido" : "Emitido"}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{ch.bankName}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "var(--font-xs)" }}>{ch.number}</td>
                  <td className={styles.right} style={{ fontWeight: 700 }}>
                    {fmt(ch.amount)}
                  </td>
                  <td className={styles.right}>{ch.dueDate}</td>
                  <td className={styles.right}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: ch.daysUntilDue <= 7 ? "var(--danger)" : ch.daysUntilDue <= 15 ? "var(--warning)" : "var(--text-secondary)",
                      }}
                    >
                      {ch.daysUntilDue <= 0 ? "Vencido" : `${ch.daysUntilDue}d`}
                    </span>
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
