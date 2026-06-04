import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "DiazTech — Gestión Empresarial",
  description:
    "Sistema de gestión empresarial integral para Argentina. Facturación electrónica AFIP, clientes, proveedores, stock, caja, bancos, CRM y más.",
  keywords: [
    "ERP Argentina",
    "facturación electrónica",
    "AFIP",
    "gestión empresarial",
    "DiazTech",
    "sistema de gestión",
  ],
  authors: [{ name: "José Díaz" }],
  openGraph: {
    title: "DiazTech — Gestión Empresarial",
    description:
      "Sistema de gestión empresarial integral para Argentina. Facturación, clientes, stock, caja y más.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" data-scroll-behavior="smooth">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
