"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./landing.module.css";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: "🧾",
      title: "Facturación Electrónica",
      description:
        "Factura A, B, C, Notas de Crédito y Débito. Integración directa con AFIP/ARCA con CAE automático.",
    },
    {
      icon: "👥",
      title: "Clientes y Proveedores",
      description:
        "Gestión completa con cuenta corriente, historial de operaciones y envío de resúmenes por WhatsApp.",
    },
    {
      icon: "📦",
      title: "Stock Multi-Depósito",
      description:
        "Control de inventario en múltiples depósitos. Movimientos, alertas de stock mínimo y trazabilidad.",
    },
    {
      icon: "💰",
      title: "Caja y Bancos",
      description:
        "Apertura/cierre de caja diaria, movimientos bancarios, conciliación y seguimiento de cheques.",
    },
    {
      icon: "📊",
      title: "Dashboard Inteligente",
      description:
        "Métricas del día en tiempo real: ventas, cobros, deudas, stock bajo y tareas pendientes.",
    },
    {
      icon: "📱",
      title: "WhatsApp Integrado",
      description:
        "Envío de presupuestos, facturas y recordatorios de pago directo por WhatsApp con un click.",
    },
  ];

  const modules = [
    { icon: "📊", name: "Dashboard", desc: "Métricas en vivo" },
    { icon: "👥", name: "Clientes", desc: "CRM completo" },
    { icon: "🧾", name: "Facturación", desc: "AFIP integrado" },
    { icon: "🏪", name: "Proveedores", desc: "Compras y deudas" },
    { icon: "💵", name: "Caja", desc: "Control diario" },
    { icon: "🏦", name: "Bancos", desc: "Movimientos" },
    { icon: "📝", name: "Cheques", desc: "Cartera completa" },
    { icon: "📋", name: "Presupuestos", desc: "Envío por WA" },
    { icon: "📦", name: "Stock", desc: "Multi-depósito" },
    { icon: "🚚", name: "Remitos", desc: "Entregas" },
    { icon: "🧾", name: "Recibos", desc: "Cobros y pagos" },
    { icon: "🎯", name: "CRM", desc: "Tareas y seguimiento" },
  ];

  const plans = [
    {
      name: "Starter",
      description: "Para emprendedores y pequeños negocios",
      price: "Gratis",
      period: "14 días de prueba",
      features: [
        "1 usuario",
        "Facturación básica",
        "Clientes y proveedores",
        "Stock básico",
        "Dashboard",
      ],
      popular: false,
    },
    {
      name: "Profesional",
      description: "Para PyMEs en crecimiento",
      price: "$XX.XXX",
      period: "/mes",
      features: [
        "Hasta 5 usuarios",
        "Todos los módulos",
        "Multi-depósito",
        "Cheques y bancos",
        "WhatsApp integrado",
        "Soporte prioritario",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      description: "Para empresas grandes",
      price: "Contactar",
      period: "",
      features: [
        "Usuarios ilimitados",
        "Todos los módulos",
        "API completa",
        "Soporte dedicado",
        "Personalización",
        "SLA garantizado",
      ],
      popular: false,
    },
  ];

  const chartHeights = [40, 65, 50, 80, 55, 70, 90, 60, 75, 45, 85, 65];

  return (
    <div className={styles.landing}>
      {/* Navbar */}
      <nav
        className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}
        id="navbar"
      >
        <div className={styles.navContent}>
          <Link href="/" className={styles.navLogo}>
            <Image src="/logo.png" alt="DiazTech" width={40} height={40} />
            <span className={styles.navBrand}>DiazTech</span>
          </Link>

          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>
              Características
            </a>
            <a href="#modules" className={styles.navLink}>
              Módulos
            </a>
            <a href="#pricing" className={styles.navLink}>
              Precios
            </a>
          </div>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.btnLogin}>
              Iniciar Sesión
            </Link>
            <Link href="/register" className={styles.btnRegister}>
              Empezar Gratis
            </Link>
          </div>

          <button className={styles.mobileMenu} aria-label="Menú">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero} id="hero">
        <div className={styles.heroBg}>
          <div className={styles.heroOrb}></div>
          <div className={styles.heroOrb}></div>
          <div className={styles.heroOrb}></div>
          <div className={styles.heroGrid}></div>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              <span className={styles.dot}></span>
              Plataforma Argentina #1
            </div>

            <h1 className={styles.heroTitle}>
              Tu negocio,
              <br />
              <span className={styles.highlight}>bajo control total</span>
            </h1>

            <p className={styles.heroDescription}>
              Sistema de gestión empresarial integral con facturación electrónica
              AFIP, control de stock, caja, bancos, CRM y más. Todo en una sola
              plataforma.
            </p>

            <div className={styles.heroButtons}>
              <Link href="/register" className={styles.btnPrimary}>
                Empezar Gratis →
              </Link>
              <a href="#modules" className={styles.btnSecondary}>
                Ver Módulos
              </a>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <div className={styles.statNumber}>17+</div>
                <div className={styles.statLabel}>Módulos</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNumber}>AFIP</div>
                <div className={styles.statLabel}>Integrado</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>Disponible</div>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.dashboardPreview}>
              <div className={styles.previewHeader}>
                <div className={`${styles.previewDot} ${styles.red}`}></div>
                <div className={`${styles.previewDot} ${styles.yellow}`}></div>
                <div className={`${styles.previewDot} ${styles.green}`}></div>
              </div>
              <div className={styles.previewContent}>
                <div className={styles.previewCard}>
                  <div className={styles.previewCardIcon}>💰</div>
                  <div className={styles.previewCardValue}>$1.250.000</div>
                  <div className={styles.previewCardLabel}>Ventas del mes</div>
                </div>
                <div className={styles.previewCard}>
                  <div className={styles.previewCardIcon}>👥</div>
                  <div className={styles.previewCardValue}>148</div>
                  <div className={styles.previewCardLabel}>Clientes activos</div>
                </div>
                <div className={styles.previewCard}>
                  <div className={styles.previewCardIcon}>📦</div>
                  <div className={styles.previewCardValue}>523</div>
                  <div className={styles.previewCardLabel}>Productos en stock</div>
                </div>
                <div className={styles.previewCard}>
                  <div className={styles.previewCardIcon}>🧾</div>
                  <div className={styles.previewCardValue}>87</div>
                  <div className={styles.previewCardLabel}>Facturas emitidas</div>
                </div>
                <div className={styles.previewChart}>
                  <div className={styles.chartBars}>
                    {chartHeights.map((h, i) => (
                      <div
                        key={i}
                        className={styles.chartBar}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className={styles.previewChartLabel}>
                    Ventas últimos 12 meses
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features} id="features">
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>✨ Características</span>
            <h2 className={styles.sectionTitle}>
              Todo lo que necesitás para{" "}
              <span className="gradient-text">gestionar tu empresa</span>
            </h2>
            <p className={styles.sectionDescription}>
              Herramientas profesionales diseñadas para el mercado argentino.
              Facturación AFIP, control financiero y gestión comercial en un solo
              lugar.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div
                key={index}
                className={styles.featureCard}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className={styles.modules} id="modules">
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>📦 Módulos</span>
            <h2 className={styles.sectionTitle}>
              <span className="gradient-text">17 módulos</span> integrados
            </h2>
            <p className={styles.sectionDescription}>
              Cada módulo está diseñado para trabajar en conjunto, brindándote
              una visión completa de tu negocio.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            {modules.map((mod, index) => (
              <div key={index} className={styles.moduleItem}>
                <div className={styles.moduleIcon}>{mod.icon}</div>
                <div className={styles.moduleName}>{mod.name}</div>
                <div className={styles.moduleDescription}>{mod.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={styles.pricing} id="pricing">
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>💳 Precios</span>
            <h2 className={styles.sectionTitle}>
              Planes que se adaptan a{" "}
              <span className="gradient-text">tu negocio</span>
            </h2>
            <p className={styles.sectionDescription}>
              Empezá gratis y escalá según tus necesidades. Pagá con Mercado
              Pago.
            </p>
          </div>

          <div className={styles.pricingGrid}>
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`${styles.pricingCard} ${
                  plan.popular ? styles.popular : ""
                }`}
              >
                {plan.popular && (
                  <div className={styles.popularBadge}>Más popular</div>
                )}
                <div className={styles.pricingPlan}>{plan.name}</div>
                <div className={styles.pricingDescription}>
                  {plan.description}
                </div>
                <div className={styles.pricingPrice}>
                  <span className={styles.priceAmount}>{plan.price}</span>
                  <span className={styles.pricePeriod}>{plan.period}</span>
                </div>
                <div className={styles.pricingFeatures}>
                  {plan.features.map((feature, i) => (
                    <div key={i} className={styles.pricingFeature}>
                      <span className={styles.check}>✓</span>
                      {feature}
                    </div>
                  ))}
                </div>
                <Link
                  href="/register"
                  className={`${styles.pricingBtn} ${
                    plan.popular ? styles.primary : styles.outline
                  }`}
                >
                  {plan.price === "Contactar"
                    ? "Contactar Ventas"
                    : "Empezar Ahora"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>
              ¿Listo para{" "}
              <span className="gradient-text">transformar tu negocio</span>?
            </h2>
            <p className={styles.ctaDescription}>
              Empezá hoy con 14 días gratis. Sin tarjeta de crédito, sin
              compromisos.
            </p>
            <div className={styles.ctaButtons}>
              <Link href="/register" className={styles.btnPrimary}>
                Crear Cuenta Gratis →
              </Link>
              <a
                href="https://wa.me/5491100000000?text=Hola%20DiazTech,%20quiero%20más%20información"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnSecondary}
              >
                💬 Consultar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <Image src="/logo.png" alt="DiazTech" width={36} height={36} />
                <span className={styles.footerLogoText}>DiazTech</span>
              </div>
              <p className={styles.footerDescription}>
                Sistema de gestión empresarial integral diseñado para Argentina.
                Facturación AFIP, control de stock, finanzas y más.
              </p>
            </div>

            <div>
              <div className={styles.footerTitle}>Producto</div>
              <div className={styles.footerLinks}>
                <a href="#features" className={styles.footerLink}>
                  Características
                </a>
                <a href="#modules" className={styles.footerLink}>
                  Módulos
                </a>
                <a href="#pricing" className={styles.footerLink}>
                  Precios
                </a>
              </div>
            </div>

            <div>
              <div className={styles.footerTitle}>Empresa</div>
              <div className={styles.footerLinks}>
                <a href="#" className={styles.footerLink}>
                  Sobre Nosotros
                </a>
                <a href="#" className={styles.footerLink}>
                  Blog
                </a>
                <a href="#" className={styles.footerLink}>
                  Contacto
                </a>
              </div>
            </div>

            <div>
              <div className={styles.footerTitle}>Legal</div>
              <div className={styles.footerLinks}>
                <a href="#" className={styles.footerLink}>
                  Términos de Servicio
                </a>
                <a href="#" className={styles.footerLink}>
                  Política de Privacidad
                </a>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} DiazTech. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
