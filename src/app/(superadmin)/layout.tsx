"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./superadmin/superadmin.module.css";

const navItems = [
  { icon: "⚡", label: "Panel Global", href: "/superadmin" },
  { icon: "🏢", label: "Empresas", href: "/superadmin/empresas" },
  { icon: "💳", label: "Suscripciones", href: "/superadmin/suscripciones" },
  { icon: "👤", label: "Usuarios", href: "/superadmin/usuarios" },
  { icon: "📋", label: "Auditoría", href: "/superadmin/auditoria" },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    const isGlobalAdmin = (session?.user as { isGlobalAdmin?: boolean })
      ?.isGlobalAdmin;
    if (!session || !isGlobalAdmin) {
      router.replace("/dashboard");
    } else {
      setChecked(true);
    }
  }, [session, status, router]);

  if (!checked) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg-primary)",
          color: "var(--text-tertiary)",
          fontSize: "var(--font-sm)",
        }}
      >
        Verificando acceso...
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <div>
              <div className={styles.logoTitle}>Super Admin</div>
              <div className={styles.logoSub}>GestiónPro</div>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${
                (item.href === "/superadmin"
                  ? pathname === "/superadmin"
                  : pathname.startsWith(item.href))
                  ? styles.active
                  : ""
              }`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/dashboard" className={styles.backLink}>
            ← Volver al Dashboard
          </Link>
          <div className={styles.adminBadge}>
            <span>👑</span>
            <span>{session?.user?.name ?? "Super Admin"}</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
