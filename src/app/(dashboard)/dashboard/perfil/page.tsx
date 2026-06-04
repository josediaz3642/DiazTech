"use client";

import { useState, useEffect, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import { getProfile, updateProfile, changePassword } from "@/actions/profile";
import { ROLE_LABELS, ROLE_BADGE_CLASS } from "@/lib/permissions";

type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "VIEWER";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  role: string;
  company: { id: string; name: string; fantasyName: string | null } | null;
  isGlobalAdmin: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");
  const [isPending, startTransition] = useTransition();

  // Form state — personal info
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");

  // Form state — password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    getProfile().then((result) => {
      if (result.success && result.data) {
        const data = result.data as ProfileData;
        setProfile(data);
        setFormName(data.name);
        setFormPhone(data.phone ?? "");
      }
      setLoading(false);
    });
  }, []);

  const handleSaveInfo = () => {
    if (!formName.trim() || formName.trim().length < 2) {
      showToast("El nombre debe tener al menos 2 caracteres", "error");
      return;
    }
    startTransition(async () => {
      const result = await updateProfile({
        name: formName.trim(),
        phone: formPhone.trim() || null,
      });
      if (result.success) {
        setProfile((prev) => prev ? { ...prev, name: formName.trim(), phone: formPhone.trim() || null } : prev);
        showToast("Perfil actualizado correctamente ✅");
      } else {
        showToast(result.error ?? "Error al guardar", "error");
      }
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Completá todos los campos", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Las contraseñas nuevas no coinciden", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("La contraseña debe tener al menos 8 caracteres", "error");
      return;
    }
    startTransition(async () => {
      const result = await changePassword({ currentPassword, newPassword });
      if (result.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showToast("Contraseña cambiada correctamente 🔐");
      } else {
        showToast(result.error ?? "Error al cambiar la contraseña", "error");
      }
    });
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const role = profile?.role as Role | undefined;

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "", color: "", width: "0%" };
    if (pwd.length < 6) return { label: "Muy débil", color: "var(--error-500)", width: "20%" };
    if (pwd.length < 8) return { label: "Débil", color: "var(--warning-500)", width: "40%" };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: "Media", color: "var(--warning-400)", width: "60%" };
    if (pwd.length >= 10 && /[^a-zA-Z0-9]/.test(pwd)) return { label: "Muy fuerte", color: "var(--secondary-500)", width: "100%" };
    return { label: "Fuerte", color: "var(--secondary-600)", width: "80%" };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-tertiary)", fontSize: "var(--font-sm)" }}>
        Cargando perfil...
      </div>
    );
  }

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Mi Perfil</h1>
          <p className={s.pageSubtitle}>Datos personales y seguridad de tu cuenta</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className={s.tableWrapper} style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: "var(--radius-full)",
            background: "linear-gradient(135deg, var(--primary-600), var(--primary-400))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "var(--font-2xl)", fontWeight: 800, color: "white",
            flexShrink: 0, boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
          }}>
            {initials}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--font-xl)", fontWeight: 700, marginBottom: "var(--space-1)" }}>
              {profile?.name}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginBottom: "var(--space-2)" }}>
              {profile?.email}
              {profile?.emailVerified && (
                <span style={{ marginLeft: "var(--space-2)", color: "var(--secondary-400)", fontSize: "var(--font-xs)" }}>
                  ✓ Email verificado
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {role && (
                <span className={`${s.badge} ${s[ROLE_BADGE_CLASS[role] ?? "inactive"]}`}>
                  {ROLE_LABELS[role] ?? role}
                </span>
              )}
              {profile?.isGlobalAdmin && (
                <span className={`${s.badge} ${s.danger}`}>⚡ Super Admin</span>
              )}
              {profile?.company && (
                <span className={`${s.badge} ${s.info}`}>
                  🏢 {profile.company.fantasyName ?? profile.company.name}
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right", color: "var(--text-tertiary)", fontSize: "var(--font-xs)" }}>
            <div>Cuenta creada</div>
            <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("es-AR") : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabs} style={{ marginBottom: "var(--space-5)" }}>
        <button
          className={`${s.tab} ${activeTab === "info" ? s.active : ""}`}
          onClick={() => setActiveTab("info")}
        >
          👤 Datos Personales
        </button>
        <button
          className={`${s.tab} ${activeTab === "password" ? s.active : ""}`}
          onClick={() => setActiveTab("password")}
        >
          🔐 Cambiar Contraseña
        </button>
      </div>

      {/* Tab: Datos Personales */}
      {activeTab === "info" && (
        <div className={s.tableWrapper} style={{ padding: "var(--space-6)" }}>
          <h3 style={{ fontWeight: 700, marginBottom: "var(--space-5)", fontSize: "var(--font-lg)" }}>
            Datos Personales
          </h3>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Nombre completo *</label>
              <input
                type="text"
                className={s.formInput}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Teléfono</label>
              <input
                type="tel"
                className={s.formInput}
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="Ej: 11 5500-0000"
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Email</label>
              <input
                type="email"
                className={s.formInput}
                value={profile?.email ?? ""}
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
              <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", marginTop: "var(--space-1)", display: "block" }}>
                El email no se puede cambiar desde aquí
              </span>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Rol en la empresa</label>
              <input
                type="text"
                className={s.formInput}
                value={role ? ROLE_LABELS[role] ?? role : ""}
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-5)" }}>
            <button
              className={s.btnPrimary}
              onClick={handleSaveInfo}
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Cambiar Contraseña */}
      {activeTab === "password" && (
        <div className={s.tableWrapper} style={{ padding: "var(--space-6)" }}>
          <h3 style={{ fontWeight: 700, marginBottom: "var(--space-2)", fontSize: "var(--font-lg)" }}>
            Cambiar Contraseña
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginBottom: "var(--space-5)" }}>
            Usá una contraseña segura de al menos 8 caracteres.
          </p>
          <div className={s.formGrid}>
            <div className={`${s.formGroup} ${s.formGroupFull}`}>
              <label className={s.formLabel}>Contraseña actual *</label>
              <input
                type="password"
                className={s.formInput}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Tu contraseña actual"
                autoComplete="current-password"
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Nueva contraseña *</label>
              <input
                type="password"
                className={s.formInput}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              {newPassword && (
                <div style={{ marginTop: "var(--space-2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)", fontSize: "var(--font-xs)" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Seguridad</span>
                    <span style={{ color: pwdStrength.color, fontWeight: 600 }}>{pwdStrength.label}</span>
                  </div>
                  <div style={{ height: 4, background: "var(--border-primary)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: pwdStrength.width,
                      background: pwdStrength.color,
                      transition: "width 0.3s ease, background 0.3s ease",
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              )}
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Confirmar nueva contraseña *</label>
              <input
                type="password"
                className={s.formInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí la nueva contraseña"
                autoComplete="new-password"
                style={{
                  borderColor: confirmPassword && newPassword !== confirmPassword
                    ? "var(--error-500)"
                    : confirmPassword && newPassword === confirmPassword
                      ? "var(--secondary-500)"
                      : undefined,
                }}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <span style={{ fontSize: "var(--font-xs)", color: "var(--error-400)", marginTop: "var(--space-1)", display: "block" }}>
                  ⚠️ Las contraseñas no coinciden
                </span>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <span style={{ fontSize: "var(--font-xs)", color: "var(--secondary-400)", marginTop: "var(--space-1)", display: "block" }}>
                  ✓ Las contraseñas coinciden
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-5)" }}>
            <button
              className={s.btnPrimary}
              onClick={handleChangePassword}
              disabled={isPending}
            >
              {isPending ? "Cambiando..." : "🔐 Cambiar Contraseña"}
            </button>
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
