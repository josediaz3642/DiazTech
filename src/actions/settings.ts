"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────────

export interface UpdateCompanyInput {
  name?: string;
  fantasyName?: string | null;
  cuit?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
  taxCategory?: string | null;
  iibbNumber?: string | null;
  startDate?: string | null; // ISO date string
  afipEnvironment?: string;
  afipCertPath?: string | null;
  afipKeyPath?: string | null;
  defaultPointOfSale?: number;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

// ─── getCompanySettings ──────────────────────────────────────────────

export async function getCompanySettings(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: {
        id: true,
        name: true,
        fantasyName: true,
        cuit: true,
        address: true,
        phone: true,
        email: true,
        logo: true,
        taxCategory: true,
        iibbNumber: true,
        startDate: true,
        afipEnvironment: true,
        afipCertPath: true,
        afipKeyPath: true,
        defaultPointOfSale: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!company) {
      return { success: false, error: "Empresa no encontrada" };
    }

    return { success: true, data: company };
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    return {
      success: false,
      error: "Error al obtener la configuración de la empresa",
    };
  }
}

// ─── updateCompanySettings ───────────────────────────────────────────

export async function updateCompanySettings(
  data: UpdateCompanyInput
): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Only ADMIN or SUPER_ADMIN can update settings
    if (!ADMIN_ROLES.includes(session.role)) {
      return {
        success: false,
        error: "No tenés permisos para modificar la configuración",
      };
    }

    // Verify company exists and belongs to user
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { id: true },
    });

    if (!company) {
      return { success: false, error: "Empresa no encontrada" };
    }

    // Build update data, only including defined fields
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.fantasyName !== undefined) updateData.fantasyName = data.fantasyName;
    if (data.cuit !== undefined) updateData.cuit = data.cuit;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.taxCategory !== undefined) updateData.taxCategory = data.taxCategory;
    if (data.iibbNumber !== undefined) updateData.iibbNumber = data.iibbNumber;
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.afipEnvironment !== undefined) {
      updateData.afipEnvironment = data.afipEnvironment;
    }
    if (data.afipCertPath !== undefined) updateData.afipCertPath = data.afipCertPath;
    if (data.afipKeyPath !== undefined) updateData.afipKeyPath = data.afipKeyPath;
    if (data.defaultPointOfSale !== undefined) {
      updateData.defaultPointOfSale = data.defaultPointOfSale;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No se proporcionaron datos para actualizar" };
    }

    const updated = await prisma.company.update({
      where: { id: session.companyId },
      data: updateData,
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    return {
      success: false,
      error: "Error al actualizar la configuración de la empresa",
    };
  }
}

// ─── getSubscriptionInfo ─────────────────────────────────────────────

export async function getSubscriptionInfo(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const subscription = await prisma.subscription.findUnique({
      where: { companyId: session.companyId },
      select: {
        id: true,
        plan: true,
        status: true,
        mpSubscriptionId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        trialEnd: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!subscription) {
      return {
        success: true,
        data: {
          plan: "none",
          status: "inactive",
          message: "No hay suscripción activa",
        },
      };
    }

    // Calculate days remaining
    let daysRemaining: number | null = null;
    const endDate = subscription.trialEnd ?? subscription.currentPeriodEnd;
    if (endDate) {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      success: true,
      data: {
        ...subscription,
        daysRemaining,
        isTrialing: subscription.plan === "trial",
        isExpired:
          subscription.status === "expired" ||
          (endDate ? endDate < new Date() : false),
      },
    };
  } catch (error) {
    console.error("Error al obtener suscripción:", error);
    return {
      success: false,
      error: "Error al obtener la información de suscripción",
    };
  }
}
