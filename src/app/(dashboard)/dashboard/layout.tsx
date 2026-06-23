/**
 * Server-side layout para el segmento /dashboard.
 *
 * Al declarar `dynamic = "force-dynamic"` aquí, Next.js App Router
 * propaga esa directiva a todas las rutas hijas del segmento /dashboard.
 * Esto evita el error DYNAMIC_SERVER_USAGE en Vercel cuando las páginas
 * usan `auth()` o cualquier API que lea headers/cookies.
 *
 * Este layout es intencionalmente un thin wrapper (no agrega UI propia).
 * El layout con UI (sidebar, header, etc.) vive en el layout "use client"
 * del grupo (dashboard) padre.
 */
export const dynamic = "force-dynamic";

export default function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
