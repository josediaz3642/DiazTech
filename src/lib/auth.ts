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
});
