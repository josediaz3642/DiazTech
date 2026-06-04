"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ─── Types ───────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── getProfile ──────────────────────────────────────────────────────

export async function getProfile(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        memberships: {
          where: { isActive: true },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                fantasyName: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const membership = user.memberships[0];

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        role: session.role,
        company: membership?.company ?? null,
        isGlobalAdmin: session.isGlobalAdmin,
      },
    };
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return { success: false, error: "Error al obtener el perfil" };
  }
}

// ─── updateProfile ───────────────────────────────────────────────────

export async function updateProfile(
  data: UpdateProfileInput
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: "El nombre debe tener al menos 2 caracteres" };
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        updatedAt: true,
      },
    });

    revalidatePath("/dashboard/perfil");
    revalidatePath("/dashboard");

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return { success: false, error: "Error al actualizar el perfil" };
  }
}

// ─── changePassword ──────────────────────────────────────────────────

export async function changePassword(
  data: ChangePasswordInput
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!data.currentPassword || !data.newPassword) {
      return { success: false, error: "Todos los campos son obligatorios" };
    }

    if (data.newPassword.length < 8) {
      return {
        success: false,
        error: "La nueva contraseña debe tener al menos 8 caracteres",
      };
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: "La contraseña actual es incorrecta" };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword },
    });

    revalidatePath("/dashboard/perfil");

    return { success: true };
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return { success: false, error: "Error al cambiar la contraseña" };
  }
}
