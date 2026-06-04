"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";
import { registerUser, loginUser } from "@/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        companyName: formData.companyName,
      });

      if (!result.success) {
        setError(result.error || "Error al crear la cuenta");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const loginResult = await loginUser(formData.email, formData.password);
      if (loginResult.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        // Registration succeeded but login failed, redirect to login
        router.push("/login");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authBg}>
        <div className={styles.authOrb}></div>
        <div className={styles.authOrb}></div>
        <div className={styles.authGrid}></div>
      </div>

      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <Link href="/" className={styles.authLogo}>
            <Image src="/logo.png" alt="DiazTech" width={48} height={48} />
          </Link>
          <h1 className={styles.authTitle}>Crear cuenta</h1>
          <p className={styles.authSubtitle}>
            Empezá a gestionar tu negocio hoy
          </p>
        </div>

        {error && (
          <div style={{ padding: "var(--space-3)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-lg)", color: "var(--error-400)", fontSize: "var(--font-sm)", marginBottom: "var(--space-4)", textAlign: "center" }}>
            ❌ {error}
          </div>
        )}

        <form className={styles.authForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              className={styles.formInput}
              placeholder="José Díaz"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="register-email" className={styles.formLabel}>
              Email
            </label>
            <input
              id="register-email"
              type="email"
              className={styles.formInput}
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone" className={styles.formLabel}>
              Teléfono (WhatsApp)
            </label>
            <input
              id="phone"
              type="tel"
              className={styles.formInput}
              placeholder="+54 9 11 1234-5678"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              autoComplete="tel"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="companyName" className={styles.formLabel}>
              Nombre de tu empresa
            </label>
            <input
              id="companyName"
              type="text"
              className={styles.formInput}
              placeholder="Mi Empresa S.R.L."
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="register-password" className={styles.formLabel}>
              Contraseña
            </label>
            <div className={styles.formInputGroup}>
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                className={styles.formInput}
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={styles.formInput}
              placeholder="Repetí tu contraseña"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.authBtn} id="register-submit" disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Creando cuenta..." : "Crear Cuenta Gratis"}
          </button>
        </form>

        <div className={styles.authFooter}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login">Iniciar Sesión</Link>
        </div>
      </div>
    </div>
  );
}
