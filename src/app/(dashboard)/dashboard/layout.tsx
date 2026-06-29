/**
 * Server-side layout para el segmento /dashboard.
 *
 * Usamos `connection()` de `next/server` para indicar a Next.js 16
 * que este layout (y todas sus rutas hijas) requieren una conexión
 * de usuario real y no deben pre-renderizarse estáticamente.
 *
 * Este layout es intencionalmente un thin wrapper (no agrega UI propia).
 * El layout con UI (sidebar, header, etc.) vive en el layout "use client"
 * del grupo (dashboard) padre.
 */
import { connection } from "next/server";

export default async function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return <>{children}</>;
}
