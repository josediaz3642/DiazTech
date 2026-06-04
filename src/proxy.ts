import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use only the edge-compatible config (no bcrypt/prisma imports)
// so the proxy can run in the Edge Runtime without Node-only modules.
const { auth } = NextAuth(authConfig);

// Must be exported as "proxy" (Next.js 16 convention)
export { auth as proxy };

export const config = {
  matcher: ["/dashboard/:path*", "/superadmin/:path*", "/login", "/register"],
};
