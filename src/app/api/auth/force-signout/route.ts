import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/force-signout
 *
 * Clears all NextAuth session cookies and redirects to /login.
 * Use this when a stale JWT token has a userId that no longer exists in the DB
 * (e.g. after migrating from local Postgres to Neon).
 */
export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Build a redirect response to /login
  const response = NextResponse.redirect(
    new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  );

  // Delete all cookies that belong to NextAuth
  for (const cookie of allCookies) {
    if (
      cookie.name.startsWith("authjs.") ||
      cookie.name.startsWith("next-auth.") ||
      cookie.name === "__Secure-authjs.session-token" ||
      cookie.name === "__Host-authjs.csrf-token" ||
      cookie.name === "authjs.session-token" ||
      cookie.name === "authjs.csrf-token" ||
      cookie.name === "authjs.callback-url"
    ) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}
