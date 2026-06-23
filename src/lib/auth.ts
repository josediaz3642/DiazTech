import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              where: { isActive: true },
              include: { company: true },
              take: 1,
            },
          },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        const membership = user.memberships[0];

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: membership?.role ?? "VIEWER",
          companyId: membership?.companyId ?? null,
          isGlobalAdmin: user.isGlobalAdmin,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // ── JWT: extend token with custom fields + stale-session check ──
    async jwt({ token, user, trigger }) {
      // Fresh login: populate token from the user object
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "VIEWER";
        token.companyId = (user as { companyId?: string | null }).companyId ?? null;
        token.isGlobalAdmin = (user as { isGlobalAdmin?: boolean }).isGlobalAdmin ?? false;
        token._dbCheckedAt = Date.now();
        return token;
      }

      // Subsequent requests: periodically verify the user still exists in DB.
      // This prevents stale JWTs (e.g. after a DB migration) from causing cryptic errors.
      const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
      const lastCheck = (token._dbCheckedAt as number) ?? 0;

      if (Date.now() - lastCheck > CHECK_INTERVAL_MS && token.id) {
        try {
          const exists = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true },
          });

          if (!exists) {
            // User no longer exists in DB (e.g. DB was replaced/migrated).
            // Return null to invalidate the session and force re-login.
            console.warn(`[auth] JWT invalidated: user ${token.id} not found in DB.`);
            return null as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          }

          token._dbCheckedAt = Date.now();
        } catch (err) {
          // If the DB check fails (network issue, etc.), keep the token.
          console.error("[auth] DB user check failed, keeping token:", err);
        }
      }

      return token;
    },
  },
});

