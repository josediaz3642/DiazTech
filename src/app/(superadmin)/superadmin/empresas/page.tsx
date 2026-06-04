"use client";

import { useEffect, useState, useTransition } from "react";
import styles from "../superadmin.module.css";
import s from "@/styles/module-page.module.css";
import { getAllCompanies, updateSubscription } from "@/actions/superadmin";

interface CompanyRow {
  id: string;
  name: string;
  fantasyName: string | null;
  cuit: string | null;
  email: string | null;
  phone: string | null;
  taxCategory: string | null;
  afipEnvironment: string;
  createdAt: Date;
  userCount: number;
  adminCount: number;
  clientCount: number;
  invoiceCount: number;
  subscription: {
    plan: string;
    status: string;
    trialEnd: Date | null;
    currentPeriodEnd: Date | null;
  } | null;
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

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [editingSub, setEditingSub] = useState<CompanyRow | null>(null);
  const [subForm, setSubForm] = useState({ plan: "trial", status: "active", trialEnd: "", currentPeriodEnd: "" });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCompanies = () => {
    setLoading(true);
    getAllCompanies().then((result) => {
      if (result.success && result.data) {
        setCompanies(result.data as CompanyRow[]);
      }
      setLoading(false);
    });
  };

  useEffect(() => { loadCompanies(); }, []);

  const filtered = companies.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.fantasyName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.cuit ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase());
    const plan = c.subscription?.plan ?? "none";
    const matchPlan = filterPlan === "all" || plan === filterPlan;
    return matchSearch && matchPlan;
  });

  const openEditSub = (company: CompanyRow) => {
    setEditingSub(company);
    const sub = company.subscription;
    setSubForm({
      plan: sub?.plan ?? "trial",
      status: sub?.status ?? "active",
      trialEnd: sub?.trialEnd ? new Date(sub.trialEnd).toISOString().split("T")[0] : "",
      currentPeriodEnd: sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString().split("T")[0] : "",
    });
  };

  const handleSaveSub = () => {
    if (!editingSub) return;
    startTransition(async () => {
      const result = await updateSubscription(editingSub.id, {
        plan: subForm.plan,
        status: subForm.status,
        trialEnd: subForm.trialEnd || null,
        currentPeriodEnd: subForm.currentPeriodEnd || null,
      });
      if (result.success) {
        showToast("Suscripción actualizada ✅");
        setEditingSub(null);
        loadCompanies();
      } else {
        showToast(result.error ?? "Error al actualizar", "error");
      }
    });
  };

  const getPlanClass = (plan: string) => PLAN_CSS[plan] ?? PLAN_CSS.none;

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle} style={{ background: "linear-gradient(135deg, #c4b5fd, #a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Empresas
          </h1>
          <p className={s.pageSubtitle}>
            {loading ? "Cargando..." : `${companies.length} empresa${companies.length !== 1 ? "s" : ""} registrada${companies.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🏢</div>
          <div className={s.statCardValue}>{loading ? "—" : companies.length}</div>
          <div className={s.statCardLabel}>Total Empresas</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🧪</div>
          <div className={`${s.statCardValue}`} style={{ color: "#fbbf24" }}>
            {loading ? "—" : companies.filter((c) => c.subscription?.plan === "trial" || !c.subscription).length}
          </div>
          <div className={s.statCardLabel}>En Trial</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🚀</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>
            {loading ? "—" : companies.filter((c) => c.subscription?.plan === "pro" || c.subscription?.plan === "enterprise").length}
          </div>
          <div className={s.statCardLabel}>Pro / Enterprise</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🔴</div>
          <div className={`${s.statCardValue} ${s.balanceNegative}`}>
            {loading ? "—" : companies.filter((c) => c.subscription?.status === "expired" || c.subscription?.status === "cancelled").length}
          </div>
          <div className={s.statCardLabel}>Expiradas</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <span className={s.searchIcon}>🔍</span>
          <input
            type="text"
            className={s.searchInput}
            placeholder="Buscar por nombre, CUIT o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--text-tertiary)" }}>
          Cargando empresas...
        </div>
      ) : (
        <div className={s.tableWrapper}>
          <table className={styles.saTable}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>CUIT</th>
                <th>Usuarios</th>
                <th>Clientes</th>
                <th>Facturas</th>
                <th>Plan</th>
                <th>AFIP</th>
                <th>Alta</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "var(--space-8)" }}>
                    {search ? "Sin resultados para la búsqueda" : "No hay empresas registradas"}
                  </td>
                </tr>
              ) : (
                filtered.map((company) => {
                  const plan = company.subscription?.plan ?? "none";
                  const subStatus = company.subscription?.status ?? "—";
                  const endDate = company.subscription?.trialEnd ?? company.subscription?.currentPeriodEnd;
                  const daysLeft = endDate
                    ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
                    : null;

                  return (
                    <tr key={company.id}>
                      <td>
                        <div className={s.cellMain}>{company.fantasyName ?? company.name}</div>
                        {company.fantasyName && (
                          <div className={s.cellSub}>{company.name}</div>
                        )}
                        {company.email && (
                          <div className={s.cellSub}>{company.email}</div>
                        )}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "var(--font-xs)" }}>
                        {company.cuit ?? "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 700 }}>{company.userCount}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 700 }}>{company.clientCount}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 700 }}>{company.invoiceCount}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className={`${styles.planPill} ${getPlanClass(plan)}`}>
                            {PLAN_LABELS[plan] ?? plan}
                          </span>
                          {daysLeft !== null && (
                            <span style={{
                              fontSize: "var(--font-xs)",
                              color: daysLeft < 0 ? "var(--error-400)" : daysLeft <= 3 ? "var(--warning-400)" : "var(--text-tertiary)"
                            }}>
                              {daysLeft < 0 ? "Expirada" : daysLeft === 0 ? "Vence hoy" : `${daysLeft}d restantes`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`${s.badge} ${company.afipEnvironment === "production" ? s.active : s.warning}`}>
                          {company.afipEnvironment === "production" ? "Producción" : "Testing"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-tertiary)", fontSize: "var(--font-xs)" }}>
                        {new Date(company.createdAt).toLocaleDateString("es-AR")}
                      </td>
                      <td>
                        <div className={s.cellActions}>
                          <button
                            className={`${s.actionBtn} ${s.edit}`}
                            title="Editar suscripción"
                            onClick={() => openEditSub(company)}
                          >
                            💳
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

      {/* Edit Subscription Modal */}
      {editingSub && (
        <div className={s.modalOverlay} onClick={() => setEditingSub(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                Editar Suscripción — {editingSub.fantasyName ?? editingSub.name}
              </h2>
              <button className={s.modalClose} onClick={() => setEditingSub(null)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Plan</label>
                  <select
                    className={s.formSelect}
                    value={subForm.plan}
                    onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}
                  >
                    <option value="trial">🧪 Trial</option>
                    <option value="starter">📦 Starter</option>
                    <option value="pro">🚀 Pro</option>
                    <option value="enterprise">🏢 Enterprise</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Estado</label>
                  <select
                    className={s.formSelect}
                    value={subForm.status}
                    onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                  >
                    <option value="active">✅ Activa</option>
                    <option value="trialing">🧪 Trialing</option>
                    <option value="past_due">⚠️ Pago pendiente</option>
                    <option value="cancelled">❌ Cancelada</option>
                    <option value="expired">🔴 Expirada</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Fin de Trial</label>
                  <input
                    type="date"
                    className={s.formInput}
                    value={subForm.trialEnd}
                    onChange={(e) => setSubForm({ ...subForm, trialEnd: e.target.value })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Próxima Renovación</label>
                  <input
                    type="date"
                    className={s.formInput}
                    value={subForm.currentPeriodEnd}
                    onChange={(e) => setSubForm({ ...subForm, currentPeriodEnd: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setEditingSub(null)} disabled={isPending}>
                Cancelar
              </button>
              <button className={s.btnPrimary} onClick={handleSaveSub} disabled={isPending}>
                {isPending ? "Guardando..." : "💾 Guardar Suscripción"}
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
