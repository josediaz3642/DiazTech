"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";
import { loginUser } from "@/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginUser(formData.email, formData.password);
      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error || "Error al iniciar sesión");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
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
          <h1 className={styles.authTitle}>Bienvenido de vuelta</h1>
          <p className={styles.authSubtitle}>
            Ingresá a tu cuenta para continuar
          </p>
        </div>

        {error && (
          <div style={{ padding: "var(--space-3)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-lg)", color: "var(--error-400)", fontSize: "var(--font-sm)", marginBottom: "var(--space-4)", textAlign: "center" }}>
            ❌ {error}
          </div>
        )}

        <form className={styles.authForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email
            </label>
            <input
              id="email"
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
            <label htmlFor="password" className={styles.formLabel}>
              Contraseña
            </label>
            <div className={styles.formInputGroup}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={styles.formInput}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                autoComplete="current-password"
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

          <div className={styles.formRow}>
            <label className={styles.formCheck}>
              <input type="checkbox" />
              Recordarme
            </label>
            <Link href="#" className={styles.formLink}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className={styles.authBtn} id="login-submit" disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className={styles.authFooter}>
          ¿No tenés cuenta?{" "}
          <Link href="/register">Registrate gratis</Link>
        </div>
      </div>
    </div>
  );
}
