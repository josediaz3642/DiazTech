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
import type { TreasuryReportData } from "@/actions/reports";
import styles from "../reports.module.css";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

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

export function TreasuryCharts({ data }: { data: TreasuryReportData }) {
  const areaData = data.cashFlowByDay.map((d) => ({
    date: d.date.slice(5),
    Acumulado: d.cumulative,
    Ingresos: d.income,
    Egresos: d.expense,
  }));

  return (
    <>
      <div className={styles.chartsGridFull}>
        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>Flujo de Caja Acumulado</p>
            <p className={styles.chartSubtitle}>Saldo neto acumulado vs ingresos y egresos diarios</p>
          </div>
          <div className={styles.chartWrapperTall}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmt} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                <Area type="monotone" dataKey="Acumulado" stroke="#818cf8" strokeWidth={2.5} fill="url(#gradAcum)" dot={false} />
                <Area type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="Egresos" stroke="#ef4444" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>Ingresos vs Egresos por Día</p>
            <p className={styles.chartSubtitle}>Comparativa diaria de movimientos de caja</p>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmt} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Egresos" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bank Balances */}
        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>Saldos Bancarios Actuales</p>
            <p className={styles.chartSubtitle}>Balance de cuentas bancarias activas</p>
          </div>
          {data.bankBalances.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏦</div>
              <p className={styles.emptyTitle}>Sin cuentas bancarias</p>
              <p className={styles.emptyDesc}>Cargá tus cuentas en el módulo de Bancos</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {data.bankBalances.map((bank, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3) var(--space-4)",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "var(--font-sm)" }}>
                      {bank.bankName}
                    </div>
                    <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                      {bank.accountType} · {bank.currency}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "var(--font-base)",
                      color: bank.balance >= 0 ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {bank.currency === "ARS" ? "$" : "U$D"}{" "}
                    {Math.abs(bank.balance).toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
