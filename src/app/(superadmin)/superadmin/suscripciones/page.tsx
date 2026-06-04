"use client";

import { useEffect, useState } from "react";
import styles from "../superadmin.module.css";
import s from "@/styles/module-page.module.css";
import { getAllCompanies, updateSubscription } from "@/actions/superadmin";
import { useTransition } from "react";

interface SubRow {
  companyId: string;
  companyName: string;
  plan: string;
  status: string;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  userCount: number;
}

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
  none: "Sin plan",
};

const PLAN_CSS: Record<string, string> = {
  trial: styles.planTrial,
  starter: styles.planStarter,
  pro: styles.planPro,
  enterprise: styles.planEnterprise,
  none: styles.planNone,
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  trialing: "Trialing",
  past_due: "Pago pendiente",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_BADGE: Record<string, string> = {
  active: s.active,
  trialing: s.info,
  past_due: s.warning,
  cancelled: s.inactive,
  expired: s.danger,
};

export default function SuscripcionesPage() {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editing, setEditing] = useState<SubRow | null>(null);
  const [form, setForm] = useState({ plan: "trial", status: "active", trialEnd: "", currentPeriodEnd: "" });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    setLoading(true);
    getAllCompanies().then((result) => {
      if (result.success && result.data) {
        const companies = result.data as {
          id: string;
          name: string;
          fantasyName: string | null;
          userCount: number;
          subscription: { plan: string; status: string; trialEnd: Date | null; currentPeriodEnd: Date | null } | null;
        }[];
        setRows(
          companies.map((c) => ({
            companyId: c.id,
            companyName: c.fantasyName ?? c.name,
            plan: c.subscription?.plan ?? "none",
            status: c.subscription?.status ?? "inactive",
            trialEnd: c.subscription?.trialEnd ?? null,
            currentPeriodEnd: c.subscription?.currentPeriodEnd ?? null,
            userCount: c.userCount,
          }))
        );
      }
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const matchPlan = filterPlan === "all" || r.plan === filterPlan;
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchPlan && matchStatus;
  });

  const openEdit = (row: SubRow) => {
    setEditing(row);
    setForm({
      plan: row.plan === "none" ? "trial" : row.plan,
      status: row.status === "inactive" ? "active" : row.status,
      trialEnd: row.trialEnd ? new Date(row.trialEnd).toISOString().split("T")[0] : "",
      currentPeriodEnd: row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toISOString().split("T")[0] : "",
    });
  };

  const handleSave = () => {
    if (!editing) return;
    startTransition(async () => {
      const result = await updateSubscription(editing.companyId, {
        plan: form.plan,
        status: form.status,
        trialEnd: form.trialEnd || null,
        currentPeriodEnd: form.currentPeriodEnd || null,
      });
      if (result.success) {
        showToast("Suscripción actualizada ✅");
        setEditing(null);
        load();
      } else {
        showToast(result.error ?? "Error al guardar", "error");
      }
    });
  };

  const expiringIn7 = rows.filter((r) => {
    const end = r.trialEnd ?? r.currentPeriodEnd;
    if (!end) return false;
    const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;

  const expired = rows.filter((r) => r.status === "expired" || r.status === "cancelled").length;
  const active = rows.filter((r) => r.status === "active" && r.plan !== "none").length;
  const trials = rows.filter((r) => r.plan === "trial").length;

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle} style={{ background: "linear-gradient(135deg, #c4b5fd, #a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Suscripciones
          </h1>
          <p className={s.pageSubtitle}>Gestión de planes y estados de suscripción de todas las empresas</p>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>✅</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>{loading ? "—" : active}</div>
          <div className={s.statCardLabel}>Activas (pago)</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🧪</div>
          <div className={s.statCardValue} style={{ color: "#fbbf24" }}>{loading ? "—" : trials}</div>
          <div className={s.statCardLabel}>En Trial</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>⚠️</div>
          <div className={`${s.statCardValue}`} style={{ color: "var(--warning-400)" }}>{loading ? "—" : expiringIn7}</div>
          <div className={s.statCardLabel}>Vencen en 7 días</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🔴</div>
          <div className={`${s.statCardValue} ${s.balanceNegative}`}>{loading ? "—" : expired}</div>
          <div className={s.statCardLabel}>Expiradas</div>
        </div>
      </div>

      <div className={s.toolbar}>
        <select
          className={s.filterBtn}
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todos los planes</option>
          <option value="trial">Trial</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
          <option value="none">Sin plan</option>
        </select>
        <select
          className={s.filterBtn}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Pago pendiente</option>
          <option value="cancelled">Cancelada</option>
          <option value="expired">Expirada</option>
          <option value="inactive">Sin suscripción</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--text-tertiary)" }}>
          Cargando suscripciones...
        </div>
      ) : (
        <div className={s.tableWrapper}>
          <table className={styles.saTable}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Fin Trial</th>
                <th>Próxima Renovación</th>
                <th>Usuarios</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "var(--space-8)" }}>
                    No hay resultados
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const endDate = row.trialEnd ?? row.currentPeriodEnd;
                  const daysLeft = endDate
                    ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
                    : null;

                  return (
                    <tr key={row.companyId}>
                      <td className={s.cellMain}>{row.companyName}</td>
                      <td>
                        <span className={`${styles.planPill} ${PLAN_CSS[row.plan] ?? PLAN_CSS.none}`}>
                          {PLAN_LABELS[row.plan] ?? row.plan}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.badge} ${STATUS_BADGE[row.status] ?? s.inactive}`}>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
                        {row.trialEnd ? new Date(row.trialEnd).toLocaleDateString("es-AR") : "—"}
                      </td>
                      <td style={{ fontSize: "var(--font-xs)" }}>
                        {row.currentPeriodEnd ? (
                          <span style={{ color: daysLeft !== null && daysLeft < 0 ? "var(--error-400)" : daysLeft !== null && daysLeft <= 7 ? "var(--warning-400)" : "var(--text-secondary)" }}>
                            {new Date(row.currentPeriodEnd).toLocaleDateString("es-AR")}
                            {daysLeft !== null && ` (${daysLeft < 0 ? "expirada" : daysLeft === 0 ? "hoy" : `${daysLeft}d`})`}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{row.userCount}</td>
                      <td>
                        <div className={s.cellActions}>
                          <button
                            className={`${s.actionBtn} ${s.edit}`}
                            title="Editar suscripción"
                            onClick={() => openEdit(row)}
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className={s.modalOverlay} onClick={() => setEditing(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Editar Suscripción — {editing.companyName}</h2>
              <button className={s.modalClose} onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Plan</label>
                  <select className={s.formSelect} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                    <option value="trial">🧪 Trial</option>
                    <option value="starter">📦 Starter</option>
                    <option value="pro">🚀 Pro</option>
                    <option value="enterprise">🏢 Enterprise</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Estado</label>
                  <select className={s.formSelect} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">✅ Activa</option>
                    <option value="trialing">🧪 Trialing</option>
                    <option value="past_due">⚠️ Pago pendiente</option>
                    <option value="cancelled">❌ Cancelada</option>
                    <option value="expired">🔴 Expirada</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Fin de Trial</label>
                  <input type="date" className={s.formInput} value={form.trialEnd} onChange={(e) => setForm({ ...form, trialEnd: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Próxima Renovación</label>
                  <input type="date" className={s.formInput} value={form.currentPeriodEnd} onChange={(e) => setForm({ ...form, currentPeriodEnd: e.target.value })} />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setEditing(null)} disabled={isPending}>Cancelar</button>
              <button className={s.btnPrimary} onClick={handleSave} disabled={isPending}>
                {isPending ? "Guardando..." : "💾 Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${s.toast} ${s[toast.type]}`}>
          <span className={s.toastIcon}>{toast.type === "success" ? "✅" : "❌"}</span>
          <span className={s.toastMessage}>{toast.message}</span>
          <button className={s.toastClose} onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </>
  );
}
