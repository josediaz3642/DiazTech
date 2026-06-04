"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ─── Types ───────────────────────────────────────────────────────────

export interface InviteUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  role?: "ADMIN" | "MANAGER" | "EMPLOYEE" | "VIEWER";
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

// ─── getCompanyUsers ─────────────────────────────────────────────────

export async function getCompanyUsers(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const memberships = await prisma.membership.findMany({
      where: { companyId: session.companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const users = memberships.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone,
      avatar: m.user.avatar,
      role: m.role,
      isActive: m.isActive,
      permissions: m.permissions,
      joinedAt: m.createdAt,
      userCreatedAt: m.user.createdAt,
    }));

    return { success: true, data: users };
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return { success: false, error: "Error al obtener los usuarios" };
  }
}

// ─── inviteUser ──────────────────────────────────────────────────────

export async function inviteUser(
  data: InviteUserInput
): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Only ADMIN or SUPER_ADMIN can invite users
    if (!ADMIN_ROLES.includes(session.role)) {
      return {
        success: false,
        error: "No tenés permisos para invitar usuarios",
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      // Check if already a member of this company
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId: existingUser.id,
            companyId: session.companyId,
          },
        },
      });

      if (existingMembership) {
        if (existingMembership.isActive) {
          return {
            success: false,
            error: "Este usuario ya es miembro de la empresa",
          };
        }

        // Reactivate existing membership
        const reactivated = await prisma.membership.update({
          where: { id: existingMembership.id },
          data: {
            isActive: true,
            role: data.role ?? "EMPLOYEE",
          },
        });

        revalidatePath("/dashboard/users");
        return { success: true, data: reactivated };
      }

      // User exists but is not a member — create membership
      const membership = await prisma.membership.create({
        data: {
          userId: existingUser.id,
          companyId: session.companyId,
          role: data.role ?? "EMPLOYEE",
        },
      });

      revalidatePath("/dashboard/users");
      return { success: true, data: membership };
    }

    // Create new user + membership in transaction
    const result = await prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(data.password, 12);

      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          phone: data.phone || null,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          companyId: session.companyId,
          role: data.role ?? "EMPLOYEE",
        },
      });

      return { user, membership };
    });

    revalidatePath("/dashboard/users");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error al invitar usuario:", error);
    return { success: false, error: "Error al invitar al usuario" };
  }
}

// ─── updateUserRole ──────────────────────────────────────────────────

export async function updateUserRole(
  membershipId: string,
  role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "VIEWER"
): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Only ADMIN or SUPER_ADMIN can change roles
    if (!ADMIN_ROLES.includes(session.role)) {
      return {
        success: false,
        error: "No tenés permisos para cambiar roles",
      };
    }

    // Verify membership belongs to this company
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, companyId: session.companyId },
    });

    if (!membership) {
      return { success: false, error: "Miembro no encontrado" };
    }

    // Prevent changing own role
    if (membership.userId === session.userId) {
      return {
        success: false,
        error: "No podés cambiar tu propio rol",
      };
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { role },
    });

    revalidatePath("/dashboard/users");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error al actualizar rol:", error);
    return { success: false, error: "Error al actualizar el rol del usuario" };
  }
}

// ─── removeUser ──────────────────────────────────────────────────────

export async function removeUser(
  membershipId: string
): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Only ADMIN or SUPER_ADMIN can remove users
    if (!ADMIN_ROLES.includes(session.role)) {
      return {
        success: false,
        error: "No tenés permisos para eliminar usuarios",
      };
    }

    // Verify membership belongs to this company
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, companyId: session.companyId },
    });

    if (!membership) {
      return { success: false, error: "Miembro no encontrado" };
    }

    // Prevent removing self
    if (membership.userId === session.userId) {
      return {
        success: false,
        error: "No podés eliminarte a vos mismo de la empresa",
      };
    }

    // Soft-delete: deactivate membership instead of deleting
    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/users");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return { success: false, error: "Error al eliminar al usuario" };
  }
}
