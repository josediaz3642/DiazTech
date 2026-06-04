"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getSalesReport } from "@/actions/reports";
import type { SalesReportData } from "@/actions/reports";
import { SalesCharts } from "./SalesCharts";
import styles from "../reports.module.css";
import dashStyles from "../../../dashboard.module.css";

const PERIODS = [
  { label: "Esta semana", value: "week" },
  { label: "Este mes", value: "month" },
  { label: "Este año", value: "year" },
];

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function exportCSV(data: SalesReportData) {
  const rows = [
    ["Fecha", "Total", "Cantidad de Facturas"],
    ...data.byDay.map((d) => [d.date, d.total.toFixed(2), d.count.toString()]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ventas-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface SalesPageClientProps {
  initialData: SalesReportData;
  initialPeriod: string;
}

export default function SalesPageClient({ initialData, initialPeriod }: SalesPageClientProps) {
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    startTransition(async () => {
      const result = await getSalesReport(p);
      if (result.success && result.data) {
        setData(result.data);
      }
    });
  };

  const change =
    data.previousPeriodTotal > 0
      ? Math.round(
          ((data.totalSales - data.previousPeriodTotal) /
            data.previousPeriodTotal) *
            100
        )
      : null;

  return (
    <>
      <Link href="/dashboard/reportes" className={styles.backLink}>
        ← Volver a Reportes
      </Link>

      <div className={styles.reportHeader}>
        <div className={styles.reportHeaderLeft}>
          <h1 className={dashStyles.pageTitle}>📈 Reporte de Ventas</h1>
          <p className={dashStyles.pageSubtitle}>
            Análisis de facturación, clientes y comprobantes emitidos
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Período:</span>
        <div className={styles.filterBtns}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`${styles.filterBtn} ${period === p.value ? styles.active : ""}`}
              onClick={() => handlePeriodChange(p.value)}
              disabled={isPending}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button className={styles.exportBtn} onClick={() => exportCSV(data)}>
          ⬇ Exportar CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <span className={styles.kpiLabel}>Total Facturado</span>
          <span className={styles.kpiValue}>{fmt(data.totalSales)}</span>
          {change !== null && (
            <span className={`${styles.kpiChange} ${change >= 0 ? styles.up : styles.down}`}>
              {change >= 0 ? "↑" : "↓"} {Math.abs(change)}% vs período ant.
            </span>
          )}
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <span className={styles.kpiLabel}>Facturas Emitidas</span>
          <span className={styles.kpiValue}>{data.totalInvoices}</span>
          <span className={`${styles.kpiChange} ${styles.neutral}`}>en el período</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <span className={styles.kpiLabel}>Ticket Promedio</span>
          <span className={styles.kpiValue}>{fmt(data.avgTicket)}</span>
          <span className={`${styles.kpiChange} ${styles.neutral}`}>por factura</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
          <span className={styles.kpiLabel}>Período Anterior</span>
          <span className={styles.kpiValue}>{fmt(data.previousPeriodTotal)}</span>
          <span className={`${styles.kpiChange} ${styles.neutral}`}>referencia</span>
        </div>
      </div>

      {/* Charts */}
      <div style={{ opacity: isPending ? 0.6 : 1, transition: "opacity 0.2s" }}>
        {data.byDay.length === 0 ? (
          <div
            className={styles.chartCard}
            style={{ marginBottom: "var(--space-5)" }}
          >
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📈</div>
              <p className={styles.emptyTitle}>Sin ventas en el período</p>
              <p className={styles.emptyDesc}>
                No se registraron facturas en el período seleccionado.
              </p>
            </div>
          </div>
        ) : (
          <SalesCharts data={data} />
        )}
      </div>

      {/* Top Clients Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <h2 className={styles.tableCardTitle}>Top 10 Clientes por Facturación</h2>
        </div>
        {data.topClients.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <p className={styles.emptyTitle}>Sin datos de clientes</p>
          </div>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th className={styles.right}>Facturas</th>
                <th className={styles.right}>Total</th>
                <th className={styles.right}>% del total</th>
              </tr>
            </thead>
            <tbody>
              {data.topClients.map((client, index) => {
                const pct =
                  data.totalSales > 0
                    ? ((client.total / data.totalSales) * 100).toFixed(1)
                    : "0.0";
                const rankClass =
                  index === 0
                    ? styles.rank1
                    : index === 1
                    ? styles.rank2
                    : index === 2
                    ? styles.rank3
                    : styles.rankRest;
                return (
                  <tr key={index}>
                    <td>
                      <span className={`${styles.rankBadge} ${rankClass}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                      {client.name}
                    </td>
                    <td className={styles.right}>{client.invoiceCount}</td>
                    <td className={styles.right} style={{ fontWeight: 700 }}>
                      {fmt(client.total)}
                    </td>
                    <td className={styles.right}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                        <div
                          style={{
                            width: "60px",
                            height: "4px",
                            background: "rgba(255,255,255,0.08)",
                            borderRadius: "999px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, #818cf8, #a78bfa)",
                              borderRadius: "999px",
                            }}
                          />
                        </div>
                        {pct}%
                      </div>
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
