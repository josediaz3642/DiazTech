import type { NextAuthConfig } from "next-auth";

// ── Edge-compatible auth config ─────────────────────────
// This file must NOT import bcryptjs, prisma, or any Node-only modules
// because it is used in the proxy (Edge Runtime).

export const authConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "VIEWER";
        token.companyId =
          (user as { companyId?: string | null }).companyId ?? null;
        token.isGlobalAdmin =
          (user as { isGlobalAdmin?: boolean }).isGlobalAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const u = session.user as unknown as Record<string, unknown>;
        u.role = token.role;
        u.companyId = token.companyId;
        u.isGlobalAdmin = token.isGlobalAdmin;
      }
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnSuperAdmin = nextUrl.pathname.startsWith("/superadmin");
      const isOnAuth =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");

      if (isOnDashboard || isOnSuperAdmin) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login
      }

      if (isOnAuth && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
