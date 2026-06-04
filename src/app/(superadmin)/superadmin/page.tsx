"use client";

import { useEffect, useState } from "react";
import styles from "../superadmin.module.css";
import s from "@/styles/module-page.module.css";
import { getGlobalStats } from "@/actions/superadmin";

interface GlobalStats {
  totalCompanies: number;
  totalUsers: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  totalInvoices: number;
  totalClients: number;
  newCompaniesLast30: number;
  newCompaniesLast7: number;
  subscriptionsByPlan: { plan: string; count: number }[];
}

const PLAN_LABELS: Record<string, string> = {
  trial: "🧪 Trial",
  starter: "📦 Starter",
  pro: "🚀 Pro",
  enterprise: "🏢 Enterprise",
};

const PLAN_CSS: Record<string, string> = {
  trial: styles.planTrial,
  starter: styles.planStarter,
  pro: styles.planPro,
  enterprise: styles.planEnterprise,
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlobalStats().then((result) => {
      if (result.success && result.data) {
        setStats(result.data as GlobalStats);
      }
      setLoading(false);
    });
  }, []);

  const statCards = [
    {
      icon: "🏢",
      label: "Empresas Registradas",
      value: stats?.totalCompanies ?? 0,
      delta: `+${stats?.newCompaniesLast7 ?? 0} esta semana`,
    },
    {
      icon: "👤",
      label: "Usuarios Totales",
      value: stats?.totalUsers ?? 0,
      delta: null,
    },
    {
      icon: "💳",
      label: "Suscripciones Activas",
      value: stats?.activeSubscriptions ?? 0,
      delta: `${stats?.trialSubscriptions ?? 0} en trial`,
    },
    {
      icon: "🧾",
      label: "Facturas Emitidas",
      value: stats?.totalInvoices ?? 0,
      delta: null,
    },
  ];

  return (
    <>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle} style={{ background: "linear-gradient(135deg, #c4b5fd, #a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Panel Super Admin
          </h1>
          <p className={s.pageSubtitle}>
            Vista global del sistema GestiónPro —{" "}
            {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className={styles.alertBanner}>
        <span className={styles.alertBannerIcon}>⚡</span>
        <div>
          <strong>Modo Super Admin activo.</strong> Desde aquí podés gestionar todas las empresas, suscripciones y usuarios del sistema. Las acciones aquí afectan a todos los tenants.
        </div>
      </div>

      {/* Global Stats */}
      <div className={styles.globalStatsGrid}>
        {statCards.map((card) => (
          <div key={card.label} className={styles.globalStatCard}>
            <div className={styles.globalStatIcon}>{card.icon}</div>
            <div className={styles.globalStatValue}>
              {loading ? "—" : card.value.toLocaleString("es-AR")}
            </div>
            <div className={styles.globalStatLabel}>{card.label}</div>
            {card.delta && (
              <div className={styles.globalStatDelta}>{card.delta}</div>
            )}
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>

        {/* Subscriptions by plan */}
        <div className={s.tableWrapper}>
          <div style={{ padding: "var(--space-5)", borderBottom: "1px solid var(--border-primary)" }}>
            <h2 style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>💳 Suscripciones por Plan</h2>
          </div>
          <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {loading ? (
              <div style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "var(--space-6)" }}>Cargando...</div>
            ) : stats?.subscriptionsByPlan && stats.subscriptionsByPlan.length > 0 ? (
              stats.subscriptionsByPlan
                .sort((a, b) => b.count - a.count)
                .map(({ plan, count }) => {
                  const pct = stats.totalCompanies > 0
                    ? Math.round((count / stats.totalCompanies) * 100)
                    : 0;
                  return (
                    <div key={plan}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)", alignItems: "center" }}>
                        <span className={`${styles.planPill} ${PLAN_CSS[plan] ?? styles.planNone}`}>
                          {PLAN_LABELS[plan] ?? plan}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "var(--font-sm)" }}>
                          {count} empresa{count !== 1 ? "s" : ""} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 6, background: "var(--bg-primary)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
                          borderRadius: "var(--radius-full)",
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  );
                })
            ) : (
              <div style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "var(--space-6)" }}>
                Sin suscripciones registradas
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className={s.tableWrapper}>
          <div style={{ padding: "var(--space-5)", borderBottom: "1px solid var(--border-primary)" }}>
            <h2 style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>⚡ Acciones Rápidas</h2>
          </div>
          <div style={{ padding: "var(--space-5)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            {[
              { href: "/superadmin/empresas", icon: "🏢", label: "Ver Empresas", desc: `${loading ? "—" : stats?.totalCompanies ?? 0} registradas` },
              { href: "/superadmin/suscripciones", icon: "💳", label: "Suscripciones", desc: `${loading ? "—" : stats?.activeSubscriptions ?? 0} activas` },
              { href: "/superadmin/usuarios", icon: "👥", label: "Todos los Usuarios", desc: `${loading ? "—" : stats?.totalUsers ?? 0} en total` },
              { href: "/superadmin/auditoria", icon: "📋", label: "Log de Auditoría", desc: "Actividad del sistema" },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  padding: "var(--space-4)",
                  background: "rgba(124, 58, 237, 0.06)",
                  border: "1px solid rgba(139, 92, 246, 0.15)",
                  borderRadius: "var(--radius-lg)",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(124, 58, 237, 0.12)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(139, 92, 246, 0.35)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(124, 58, 237, 0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(139, 92, 246, 0.15)";
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>{action.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "var(--font-sm)", color: "var(--text-primary)" }}>{action.label}</div>
                  <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>{action.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* System info */}
      <div
        className={s.tableWrapper}
        style={{ marginTop: "var(--space-6)", padding: "var(--space-5)" }}
      >
        <h2 style={{ fontWeight: 700, fontSize: "var(--font-base)", marginBottom: "var(--space-4)" }}>
          🖥️ Información del Sistema
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-5)" }}>
          {[
            { label: "Stack", value: "Next.js 16 + PostgreSQL + Prisma" },
            { label: "Autenticación", value: "NextAuth.js v5 (JWT)" },
            { label: "Multi-tenant", value: "Shared DB + companyId isolation" },
            { label: "Facturación", value: "AFIP/ARCA Homologación" },
            { label: "Fecha actual", value: new Date().toLocaleString("es-AR") },
            { label: "Zona horaria", value: "America/Argentina/Buenos_Aires" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>{label}</div>
              <div style={{ fontSize: "var(--font-sm)", fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
