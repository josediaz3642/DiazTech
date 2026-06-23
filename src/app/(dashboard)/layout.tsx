"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { canManageUsers, canManageSettings } from "@/lib/permissions";
import { getDashboardMetrics } from "@/actions/dashboard";
import styles from "./dashboard.module.css";
import DiazBot from "./dashboard/components/DiazBot";
import POSMode from "./dashboard/components/POSMode";

const BASE_NAV = [
  {
    section: "Principal",
    items: [
      { icon: "🏠", label: "Dashboard", href: "/dashboard" },
      { icon: "📊", label: "Reportes", href: "/dashboard/reportes" },
    ],
  },
  {
    section: "Comercial",
    items: [
      { icon: "👥", label: "Clientes", href: "/dashboard/clientes" },
      { icon: "🏪", label: "Proveedores", href: "/dashboard/proveedores" },
      { icon: "🧾", label: "Facturación", href: "/dashboard/facturacion" },
      { icon: "📋", label: "Presupuestos", href: "/dashboard/presupuestos" },
      { icon: "🚚", label: "Remitos", href: "/dashboard/remitos" },
      { icon: "🧾", label: "Recibos", href: "/dashboard/recibos" },
    ],
  },
  {
    section: "Finanzas",
    items: [
      { icon: "💵", label: "Caja", href: "/dashboard/caja" },
      { icon: "🏦", label: "Bancos", href: "/dashboard/bancos" },
      { icon: "📝", label: "Cheques", href: "/dashboard/cheques" },
      { icon: "📅", label: "Agenda", href: "/dashboard/agenda" },
    ],
  },
  {
    section: "Inventario",
    items: [
      { icon: "📦", label: "Stock", href: "/dashboard/stock" },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  // POS & Dark Mode
  const [showPOS, setShowPOS] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark-true" : "light");
  }, [darkMode]);

  // Search & Notification States
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; desc: string; href: string; read: boolean }>>([]);

  // Fetch metrics dynamically for notifications on mount
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await getDashboardMetrics();
        if (res.success && res.data) {
          const list = [];
          if (res.data.lowStockCount > 0) {
            list.push({
              id: "stock-alert",
              type: "warning",
              title: "Stock bajo el mínimo",
              desc: `Hay ${res.data.lowStockCount} productos que requieren reposición inmediata.`,
              href: "/dashboard/stock",
              read: false,
            });
          }
          if (res.data.pendingInvoices > 0) {
            list.push({
              id: "invoices-alert",
              type: "info",
              title: "Facturas pendientes",
              desc: `Tienes ${res.data.pendingInvoices} facturas pendientes de cobro o pago.`,
              href: "/dashboard/facturacion",
              read: false,
            });
          }
          // Always add a system tip for UX delight
          list.push({
            id: "cash-tip",
            type: "success",
            title: "Cierre de caja",
            desc: "Recuerda conciliar la caja chica al final de la jornada.",
            href: "/dashboard/caja",
            read: false,
          });

          setNotifications(list);
        }
      } catch (err) {
        console.error("Error loading layout notifications:", err);
      }
    }

    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(prev => !prev);
        setSearchQuery("");
        setSelectedSearchIndex(0);
      }
      // Ctrl+Shift+V → POS Mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        setShowPOS(prev => !prev);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowNotifications(false);
        setShowPOS(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const searchItems = useMemo(() => [
    { icon: "🏠", label: "Dashboard", href: "/dashboard", description: "Resumen principal e indicadores" },
    { icon: "📊", label: "Reportes", href: "/dashboard/reportes", description: "Ventas, tesorería, stock y CRM" },
    { icon: "👥", label: "Clientes", href: "/dashboard/clientes", description: "Gestión de cuentas corrientes de clientes" },
    { icon: "🏪", label: "Proveedores", href: "/dashboard/proveedores", description: "Gestión de cuentas corrientes de proveedores" },
    { icon: "🧾", label: "Facturación", href: "/dashboard/facturacion", description: "Emisión de facturas y notas de crédito" },
    { icon: "📋", label: "Presupuestos", href: "/dashboard/presupuestos", description: "Creación y seguimiento de cotizaciones" },
    { icon: "🚚", label: "Remitos", href: "/dashboard/remitos", description: "Control de envíos y entregas de mercadería" },
    { icon: "🧾", label: "Recibos", href: "/dashboard/recibos", description: "Cobros y pagos de cuenta corriente" },
    { icon: "💵", label: "Caja", href: "/dashboard/caja", description: "Arqueo de caja diaria y movimientos" },
    { icon: "🏦", label: "Bancos", href: "/dashboard/bancos", description: "Conciliación bancaria y cuentas" },
    { icon: "📝", label: "Cheques", href: "/dashboard/cheques", description: "Control de cheques de terceros y propios" },
    { icon: "📅", label: "Agenda", href: "/dashboard/agenda", description: "Calendario financiero — cheques, facturas, CRM" },
    { icon: "📦", label: "Stock", href: "/dashboard/stock", description: "Control de inventario, stock y almacén" },
    { icon: "🎯", label: "CRM", href: "/dashboard/crm", description: "Seguimiento de oportunidades y prospectos" },
    { icon: "👤", label: "Mi Perfil", href: "/dashboard/perfil", description: "Configuración de perfil de usuario" },
    { icon: "👥", label: "Usuarios", href: "/dashboard/usuarios", description: "Control de acceso y roles de usuario" },
    { icon: "⚙️", label: "Ajustes", href: "/dashboard/ajustes", description: "Configuración general del sistema" },
  ], []);


  // Filter search items
  const filteredSearchItems = useMemo(() => {
    if (!searchQuery.trim()) return searchItems;
    return searchItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, searchItems]);

  useEffect(() => {
    setSelectedSearchIndex(0);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIndex(prev => (prev + 1) % filteredSearchItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIndex(prev => (prev - 1 + filteredSearchItems.length) % filteredSearchItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSearchItems[selectedSearchIndex]) {
        router.push(filteredSearchItems[selectedSearchIndex].href);
        setShowSearch(false);
      }
    }
  };

  const userName = session?.user?.name || "Usuario";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const userRole = (session?.user as { role?: string })?.role ?? "VIEWER";
  const isGlobalAdmin = (session?.user as { isGlobalAdmin?: boolean })?.isGlobalAdmin ?? false;


  // Build nav with permission-based items
  const navItems = [
    ...BASE_NAV,
    {
      section: "Gestión",
      items: [
        { icon: "🎯", label: "CRM", href: "/dashboard/crm" },
        { icon: "👤", label: "Mi Perfil", href: "/dashboard/perfil" },
        ...(canManageUsers(userRole) ? [{ icon: "👥", label: "Usuarios", href: "/dashboard/usuarios" }] : []),
        ...(canManageSettings(userRole) ? [{ icon: "⚙️", label: "Ajustes", href: "/dashboard/ajustes" }] : []),
      ],
    },
  ];

  const getPageTitle = () => {
    // Check nested report routes first
    if (pathname.startsWith("/dashboard/reportes/ventas")) return "Reporte de Ventas";
    if (pathname.startsWith("/dashboard/reportes/tesoreria")) return "Reporte de Tesorería";
    if (pathname.startsWith("/dashboard/reportes/stock")) return "Reporte de Stock";
    if (pathname.startsWith("/dashboard/reportes/crm")) return "Reporte de CRM";
    if (pathname.startsWith("/dashboard/reportes")) return "Reportes";
    for (const section of navItems) {
      for (const item of section.items) {
        if (pathname === item.href) return item.label;
      }
    }
    return "Dashboard";
  };

  const handleLogout = async () => {
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
        id="sidebar"
      >
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.sidebarLogo}>
            <Image src="/logo.png" alt="DiazTech" width={32} height={32} />
            <span className={styles.sidebarBrand}>DiazTech</span>
          </Link>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((section, sectionIndex) => (
            <div key={sectionIndex} className={styles.navSection}>
              <div className={styles.navSectionTitle}>{section.section}</div>
              {section.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  href={item.href}
                  className={`${styles.navItem} ${
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                      ? styles.active
                      : ""
                  }`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {isGlobalAdmin && (
            <Link
              href="/superadmin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                marginBottom: "var(--space-3)",
                background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.12))",
                border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-xs)",
                color: "rgba(196,181,253,0.9)",
                fontWeight: 700,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              ⚡ Panel Super Admin
            </Link>
          )}
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{userInitials}</div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{userName}</div>
              <div className={styles.userRole}>{isGlobalAdmin ? "Super Admin" : userRole}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`${styles.mainContent} ${
          collapsed ? styles.expanded : ""
        }`}
      >
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.breadcrumb}>
              <Link href="/dashboard">DiazTech</Link>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbCurrent}>{getPageTitle()}</span>
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* Dark mode toggle */}
            <button
              className={styles.headerBtn}
              onClick={() => setDarkMode(prev => !prev)}
              aria-label="Cambiar tema"
              title={darkMode ? "Modo claro" : "Modo oscuro"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {/* POS Mode button */}
            <button
              className={styles.headerBtn}
              onClick={() => setShowPOS(true)}
              aria-label="Modo Vendedor Rápido"
              title="Modo Vendedor Rápido (Ctrl+Shift+V)"
              style={{ position: "relative" }}
            >
              ⚡
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "var(--primary-500)", color: "white",
                fontSize: "0.5rem", fontWeight: 900,
                borderRadius: "var(--radius-full)",
                padding: "1px 3px", lineHeight: 1,
              }}>POS</span>
            </button>

            {/* Search Toggle button */}
            <button
              className={styles.headerBtn}
              onClick={() => {
                setShowSearch(true);
                setSearchQuery("");
                setSelectedSearchIndex(0);
              }}
              aria-label="Buscar"
              title="Buscar (Ctrl+K)"
            >
              🔍
            </button>

            {/* Notifications popover */}
            <div style={{ position: "relative" }}>
              <button
                className={styles.headerBtn}
                onClick={() => setShowNotifications(prev => !prev)}
                aria-label="Notificaciones"
                title="Notificaciones"
              >
                🔔
                {unreadCount > 0 && <span className={styles.notifBadge}></span>}
              </button>

              {showNotifications && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    width: "320px",
                    backgroundColor: "var(--bg-surface)",
                    border: "2px solid var(--border-primary)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: "var(--shadow-xl)",
                    zIndex: 999,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "2px solid var(--border-primary)",
                      padding: "var(--space-3)",
                      backgroundColor: "var(--bg-secondary)",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: "var(--font-sm)", color: "var(--text-primary)" }}>
                      Notificaciones
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }}
                        style={{
                          fontSize: "var(--font-xs)",
                          color: "var(--text-secondary)",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: "var(--space-6)",
                          textAlign: "center",
                          color: "var(--text-tertiary)",
                          fontSize: "var(--font-sm)",
                        }}
                      >
                        Sin notificaciones nuevas
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            router.push(n.href);
                            setShowNotifications(false);
                            setNotifications(prev =>
                              prev.map(item => (item.id === n.id ? { ...item, read: true } : item))
                            );
                          }}
                          style={{
                            padding: "var(--space-3)",
                            borderBottom: "1px solid var(--border-secondary)",
                            cursor: "pointer",
                            backgroundColor: n.read ? "transparent" : "rgba(224, 122, 95, 0.05)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            transition: "background var(--transition-fast)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {!n.read && (
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  backgroundColor: "var(--primary-500)",
                                  borderRadius: "50%",
                                  display: "inline-block",
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "var(--font-xs)",
                                color: "var(--text-primary)",
                              }}
                            >
                              {n.title}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "var(--font-xs)",
                              color: "var(--text-tertiary)",
                              lineHeight: 1.3,
                            }}
                          >
                            {n.desc}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div
                    style={{
                      borderTop: "2px solid var(--border-primary)",
                      padding: "var(--space-3)",
                      textAlign: "center",
                      backgroundColor: "var(--bg-secondary)",
                    }}
                  >
                    <Link
                      href="/dashboard/reportes"
                      onClick={() => setShowNotifications(false)}
                      style={{
                        fontSize: "var(--font-xs)",
                        color: "var(--text-secondary)",
                        fontWeight: 700,
                      }}
                    >
                      Ver todos los reportes →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button className={styles.headerBtn} onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
              🚪
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles.pageContent}>{children}</div>
      </main>

      {/* DiazBot floating assistant */}
      <DiazBot />

      {/* POS Mode overlay */}
      <POSMode open={showPOS} onClose={() => setShowPOS(false)} />

      {/* Search overlay portal */}
      {showSearch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(61, 64, 91, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "10vh",
          }}
          onClick={() => setShowSearch(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--border-primary)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderBottom: "2px solid var(--border-primary)",
                padding: "var(--space-4)",
                gap: "var(--space-3)",
              }}
            >
              <span style={{ fontSize: "var(--font-xl)" }}>🔍</span>
              <input
                autoFocus
                placeholder="Buscar módulo o sección... (ej. Stock, Clientes)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  fontSize: "var(--font-base)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              />
              <span
                style={{
                  fontSize: "var(--font-xs)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--border-secondary)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 6px",
                  backgroundColor: "var(--bg-secondary)",
                  fontWeight: 600,
                }}
              >
                ESC
              </span>
            </div>

            <div
              style={{
                maxHeight: "350px",
                overflowY: "auto",
                padding: "var(--space-2)",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {filteredSearchItems.length === 0 ? (
                <div
                  style={{
                    padding: "var(--space-6)",
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: "var(--font-sm)",
                  }}
                >
                  No se encontraron resultados
                </div>
              ) : (
                filteredSearchItems.map((item, index) => (
                  <div
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setShowSearch(false);
                    }}
                    onMouseEnter={() => setSelectedSearchIndex(index)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3)",
                      borderRadius: "var(--radius-lg)",
                      cursor: "pointer",
                      backgroundColor:
                        index === selectedSearchIndex
                          ? "var(--bg-secondary)"
                          : "transparent",
                      border:
                        index === selectedSearchIndex
                          ? "2px solid var(--border-primary)"
                          : "2px solid transparent",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <span style={{ fontSize: "var(--font-lg)" }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "var(--font-sm)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--font-xs)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                    {index === selectedSearchIndex && (
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
                        Enter ↵
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div
              style={{
                borderTop: "2px solid var(--border-primary)",
                padding: "var(--space-3)",
                backgroundColor: "var(--bg-secondary)",
                fontSize: "var(--font-xs)",
                color: "var(--text-tertiary)",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
              }}
            >
              <span>Navegar con ↑ ↓</span>
              <span>Abrir con Enter ↵</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
