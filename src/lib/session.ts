"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export interface SessionData {
  userId: string;
  companyId: string;
  role: string;
  isGlobalAdmin: boolean;
}

/**
 * Get the authenticated user's session data including their active company.
 * Throws if not authenticated.
 */
export async function getSession(): Promise<SessionData> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }

  const userId = session.user.id;

  // Get user with membership
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { isActive: true },
        include: { company: true },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const membership = user.memberships[0];

  if (!membership && !user.isGlobalAdmin) {
    throw new Error("No tenés una empresa asociada");
  }

  return {
    userId: user.id,
    companyId: membership?.companyId ?? "",
    role: membership?.role ?? "VIEWER",
    isGlobalAdmin: user.isGlobalAdmin,
  };
}

/**
 * Get session or return null (non-throwing version)
 */
export async function getSessionSafe(): Promise<SessionData | null> {
  try {
    return await getSession();
  } catch {
    return null;
  }
}
