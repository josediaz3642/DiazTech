"use client";

import { useState, useEffect, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import {
  getCompanySettings,
  updateCompanySettings,
  getSubscriptionInfo,
  type UpdateCompanyInput,
} from "@/actions/settings";

type Tab = "empresa" | "afip" | "suscripcion";

interface CompanyData {
  id: string;
  name: string;
  fantasyName: string | null;
  cuit: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  taxCategory: string | null;
  iibbNumber: string | null;
  startDate: Date | null;
  afipEnvironment: string | null;
  afipCertPath: string | null;
  afipKeyPath: string | null;
  defaultPointOfSale: number | null;
}

interface SubscriptionData {
  plan?: string;
  status?: string;
  daysRemaining?: number | null;
  isTrialing?: boolean;
  isExpired?: boolean;
  currentPeriodEnd?: Date | null;
  trialEnd?: Date | null;
  message?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("empresa");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Company form state
  const [company, setCompany] = useState<Partial<CompanyData>>({});
  const [afipEnv, setAfipEnv] = useState("testing");
  const [afipPos, setAfipPos] = useState(1);

  // Subscription
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load data ─────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getCompanySettings(), getSubscriptionInfo()]).then(
      ([compResult, subResult]) => {
        if (compResult.success && compResult.data) {
          const data = compResult.data as CompanyData;
          setCompany(data);
          setAfipEnv(data.afipEnvironment ?? "testing");
          setAfipPos(data.defaultPointOfSale ?? 1);
        }
        if (subResult.success && subResult.data) {
          setSubscription(subResult.data as SubscriptionData);
        }
        setLoading(false);
      }
    );
  }, []);

  // ── Save company ──────────────────────────────────────────────────
  const handleSaveCompany = () => {
    if (!company.name?.trim()) {
      showToast("La razón social es obligatoria", "error");
      return;
    }
    startTransition(async () => {
      const payload: UpdateCompanyInput = {
        name: company.name ?? "",
        fantasyName: company.fantasyName ?? null,
        cuit: company.cuit ?? null,
        address: company.address ?? null,
        phone: company.phone ?? null,
        email: company.email ?? null,
        taxCategory: company.taxCategory ?? null,
        iibbNumber: company.iibbNumber ?? null,
        startDate: company.startDate
          ? new Date(company.startDate).toISOString()
          : null,
      };
      const result = await updateCompanySettings(payload);
      if (result.success) {
        showToast("Datos de la empresa guardados ✅");
      } else {
        showToast(result.error ?? "Error al guardar", "error");
      }
    });
  };

  // ── Save AFIP ─────────────────────────────────────────────────────
  const handleSaveAfip = () => {
    startTransition(async () => {
      const payload: UpdateCompanyInput = {
        afipEnvironment: afipEnv,
        defaultPointOfSale: afipPos,
      };
      const result = await updateCompanySettings(payload);
      if (result.success) {
        showToast("Configuración AFIP guardada ✅");
      } else {
        showToast(result.error ?? "Error al guardar AFIP", "error");
      }
    });
  };

  const planLabels: Record<string, string> = {
    trial: "🧪 Trial",
    basic: "📦 Básico",
    professional: "🚀 Profesional",
    enterprise: "🏢 Enterprise",
    none: "Sin plan",
  };

  const planBadge: Record<string, string> = {
    active: "active",
    trialing: "info",
    expired: "danger",
    cancelled: "inactive",
    inactive: "inactive",
  };

  const endDate =
    subscription?.trialEnd ?? subscription?.currentPeriodEnd ?? null;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          color: "var(--text-tertiary)",
          fontSize: "var(--font-sm)",
        }}
      >
        Cargando configuración...
      </div>
    );
  }

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Ajustes</h1>
          <p className={s.pageSubtitle}>Configuración de la empresa y el sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabs}>
        <button
          className={`${s.tab} ${activeTab === "empresa" ? s.active : ""}`}
          onClick={() => setActiveTab("empresa")}
        >
          🏢 Empresa
        </button>
        <button
          className={`${s.tab} ${activeTab === "afip" ? s.active : ""}`}
          onClick={() => setActiveTab("afip")}
        >
          🧾 AFIP
        </button>
        <button
          className={`${s.tab} ${activeTab === "suscripcion" ? s.active : ""}`}
          onClick={() => setActiveTab("suscripcion")}
        >
          💳 Suscripción
        </button>
      </div>

      {/* ── Tab: Empresa ── */}
      {activeTab === "empresa" && (
        <div
          className={s.tableWrapper}
          style={{ padding: "var(--space-6)", marginTop: "var(--space-4)" }}
        >
          <h3
            style={{
              fontWeight: 700,
              marginBottom: "var(--space-5)",
              fontSize: "var(--font-lg)",
            }}
          >
            Datos de la Empresa
          </h3>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Razón Social *</label>
              <input
                type="text"
                className={s.formInput}
                value={company.name ?? ""}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Nombre Fantasía</label>
              <input
                type="text"
                className={s.formInput}
                value={company.fantasyName ?? ""}
                onChange={(e) =>
                  setCompany({ ...company, fantasyName: e.target.value })
                }
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>CUIT</label>
              <input
                type="text"
                className={s.formInput}
                placeholder="XX-XXXXXXXX-X"
                value={company.cuit ?? ""}
                onChange={(e) => setCompany({ ...company, cuit: e.target.value })}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Condición Fiscal</label>
              <select
                className={s.formSelect}
                value={company.taxCategory ?? "Monotributista"}
                onChange={(e) =>
                  setCompany({ ...company, taxCategory: e.target.value })
                }
              >
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributista">Monotributista</option>
                <option value="Exento">Exento</option>
                <option value="Consumidor Final">Consumidor Final</option>
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Dirección</label>
              <input
                type="text"
                className={s.formInput}
                value={company.address ?? ""}
                onChange={(e) =>
                  setCompany({ ...company, address: e.target.value })
                }
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Teléfono</label>
              <input
                type="tel"
                className={s.formInput}
                value={company.phone ?? ""}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Email de contacto</label>
              <input
                type="email"
                className={s.formInput}
                value={company.email ?? ""}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>N° Ingresos Brutos</label>
              <input
                type="text"
                className={s.formInput}
                placeholder="Opcional"
                value={company.iibbNumber ?? ""}
                onChange={(e) =>
                  setCompany({ ...company, iibbNumber: e.target.value })
                }
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "var(--space-5)",
            }}
          >
            <button
              className={s.btnPrimary}
              onClick={handleSaveCompany}
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: AFIP ── */}
      {activeTab === "afip" && (
        <div
          className={s.tableWrapper}
          style={{ padding: "var(--space-6)", marginTop: "var(--space-4)" }}
        >
          <h3
            style={{
              fontWeight: 700,
              marginBottom: "var(--space-5)",
              fontSize: "var(--font-lg)",
            }}
          >
            Configuración AFIP / ARCA
          </h3>

          <div
            style={{
              padding: "var(--space-3)",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "var(--radius-lg)",
              fontSize: "var(--font-sm)",
              color: "var(--warning-400)",
              marginBottom: "var(--space-5)",
            }}
          >
            🧪{" "}
            {afipEnv === "testing" ? (
              <>
                <strong>Modo Homologación activo.</strong> Las facturas se
                emiten contra el servidor de testing de AFIP. No tienen validez
                fiscal.
              </>
            ) : (
              <>
                <strong>Modo Producción activo.</strong> Las facturas emitidas
                tienen validez fiscal ante AFIP/ARCA.
              </>
            )}
          </div>

          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Entorno</label>
              <select
                className={s.formSelect}
                value={afipEnv}
                onChange={(e) => setAfipEnv(e.target.value)}
              >
                <option value="testing">🧪 Homologación (Testing)</option>
                <option value="production">🏭 Producción</option>
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Punto de Venta</label>
              <input
                type="number"
                className={s.formInput}
                min={1}
                value={afipPos}
                onChange={(e) => setAfipPos(Number(e.target.value))}
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Certificado (.crt)</label>
              <input
                type="file"
                className={s.formInput}
                accept=".crt,.pem"
                disabled={afipEnv === "testing"}
                style={{ opacity: afipEnv === "testing" ? 0.5 : 1 }}
              />
              {afipEnv === "testing" && (
                <span
                  style={{
                    fontSize: "var(--font-xs)",
                    color: "var(--text-tertiary)",
                    marginTop: "var(--space-1)",
                    display: "block",
                  }}
                >
                  Disponible solo en modo Producción
                </span>
              )}
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Clave Privada (.key)</label>
              <input
                type="file"
                className={s.formInput}
                accept=".key,.pem"
                disabled={afipEnv === "testing"}
                style={{ opacity: afipEnv === "testing" ? 0.5 : 1 }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "var(--space-5)",
            }}
          >
            <button
              className={s.btnPrimary}
              onClick={handleSaveAfip}
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Guardar AFIP"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Suscripción ── */}
      {activeTab === "suscripcion" && (
        <div
          className={s.tableWrapper}
          style={{ padding: "var(--space-6)", marginTop: "var(--space-4)" }}
        >
          <h3
            style={{
              fontWeight: 700,
              marginBottom: "var(--space-5)",
              fontSize: "var(--font-lg)",
            }}
          >
            Suscripción
          </h3>

          {subscription ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "var(--space-6)",
                  marginBottom: "var(--space-6)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "var(--font-xs)",
                      color: "var(--text-tertiary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Plan Actual
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-xl)",
                      fontWeight: 800,
                    }}
                  >
                    {planLabels[subscription.plan ?? "none"] ?? subscription.plan}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "var(--font-xs)",
                      color: "var(--text-tertiary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    Estado
                  </div>
                  <span
                    className={`${s.badge} ${s[planBadge[subscription.status ?? "inactive"] ?? "inactive"]}`}
                    style={{
                      fontSize: "var(--font-sm)",
                      padding: "var(--space-1) var(--space-4)",
                    }}
                  >
                    {subscription.isExpired
                      ? "Expirada"
                      : subscription.isTrialing
                      ? "Trial"
                      : subscription.status === "active"
                      ? "Activa"
                      : subscription.status ?? "Inactiva"}
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "var(--font-xs)",
                      color: "var(--text-tertiary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    {subscription.isTrialing ? "Trial vence" : "Próxima renovación"}
                  </div>
                  <div style={{ fontSize: "var(--font-lg)", fontWeight: 700 }}>
                    {endDate
                      ? new Date(endDate).toLocaleDateString("es-AR")
                      : "—"}
                  </div>
                  {subscription.daysRemaining !== null &&
                    subscription.daysRemaining !== undefined && (
                      <div
                        style={{
                          fontSize: "var(--font-xs)",
                          color:
                            subscription.daysRemaining <= 3
                              ? "var(--error-400)"
                              : "var(--text-tertiary)",
                          marginTop: "var(--space-1)",
                        }}
                      >
                        {subscription.daysRemaining === 0
                          ? "Vence hoy"
                          : subscription.daysRemaining < 0
                          ? "Expirada"
                          : `${subscription.daysRemaining} días restantes`}
                      </div>
                    )}
                </div>
              </div>

              {(subscription.isExpired || subscription.plan === "trial") && (
                <div
                  style={{
                    padding: "var(--space-4)",
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: "var(--space-5)",
                    fontSize: "var(--font-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  🚀 <strong>Mejorá tu plan</strong> para acceso ilimitado a
                  todos los módulos, más usuarios y soporte prioritario.
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <button className={s.btnPrimary}>
                  💳 Cambiar a Plan Profesional
                </button>
                <button className={s.btnSecondary}>Ver todos los planes</button>
              </div>
            </>
          ) : (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>💳</div>
              <h3 className={s.emptyTitle}>Sin suscripción</h3>
              <p className={s.emptyDescription}>
                No hay suscripción activa para esta empresa.
              </p>
              <button className={s.btnPrimary}>Ver Planes</button>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className={`${s.toast} ${s[toast.type]}`}>
          <span className={s.toastIcon}>
            {toast.type === "success" ? "✅" : "❌"}
          </span>
          <span className={s.toastMessage}>{toast.message}</span>
          <button className={s.toastClose} onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
