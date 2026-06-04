"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export interface BudgetItemInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
  ivaAmount: number;
  subtotal: number;
  total: number;
}

export interface CreateBudgetInput {
  clientId?: string | null;
  date: string; // ISO date string
  validUntil?: string | null;
  currency?: string;
  notes?: string | null;
  items: BudgetItemInput[];
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "rejected"],
  sent: ["approved", "rejected"],
  approved: ["invoiced", "rejected"],
  rejected: [], // terminal state
  invoiced: [], // terminal state
};

// ─── getBudgets ──────────────────────────────────────────────────────

export async function getBudgets(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const budgets = await prisma.budget.findMany({
      where: { companyId: session.companyId },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        items: true,
      },
      orderBy: { date: "desc" },
    });

    return { success: true, data: serializeDecimals(budgets) };
  } catch (error) {
    console.error("Error al obtener presupuestos:", error);
    return { success: false, error: "Error al obtener los presupuestos" };
  }
}

// ─── createBudget ────────────────────────────────────────────────────

export async function createBudget(
  data: CreateBudgetInput
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: "El presupuesto debe tener al menos un ítem",
      };
    }

    const budget = await prisma.$transaction(async (tx) => {
      // Validate client if provided
      if (data.clientId) {
        const client = await tx.client.findFirst({
          where: { id: data.clientId, companyId: session.companyId },
        });
        if (!client) {
          throw new Error("El cliente seleccionado no existe o no pertenece a esta empresa.");
        }
      }

      // Validate products if provided
      for (const item of data.items) {
        if (item.productId) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, companyId: session.companyId },
          });
          if (!product) {
            throw new Error(`El producto con ID ${item.productId} no existe o no pertenece a esta empresa.`);
          }
        }
      }

      // Auto-increment: get next number
      const lastBudget = await tx.budget.findFirst({
        where: { companyId: session.companyId },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const nextNumber = (lastBudget?.number ?? 0) + 1;

      // Calculate totals from items
      const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
      const ivaTotal = data.items.reduce(
        (sum, item) => sum + item.ivaAmount,
        0
      );
      const total = data.items.reduce((sum, item) => sum + item.total, 0);

      const created = await tx.budget.create({
        data: {
          companyId: session.companyId,
          clientId: data.clientId || null,
          number: nextNumber,
          date: new Date(data.date),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          subtotal,
          ivaTotal,
          total,
          currency: data.currency ?? "ARS",
          status: "draft",
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              ivaRate: item.ivaRate,
              ivaAmount: item.ivaAmount,
              subtotal: item.subtotal,
              total: item.total,
            })),
          },
        },
        include: { items: true },
      });

      return created;
    });

    revalidatePath("/dashboard/budgets");
    return { success: true, data: serializeDecimals(budget) };
  } catch (error) {
    console.error("Error al crear presupuesto:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al crear el presupuesto" };
  }
}

// ─── getBudgetById ───────────────────────────────────────────────────

export async function getBudgetById(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    const budget = await prisma.budget.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        client: { select: { id: true, name: true, cuit: true, taxCategory: true, address: true, city: true, province: true } },
        items: {
          include: {
            product: true
          }
        }
      }
    });
    if (!budget) return { success: false, error: "Presupuesto no encontrado" };
    return { success: true, data: serializeDecimals(budget) };
  } catch (error) {
    console.error("Error al obtener presupuesto por ID:", error);
    return { success: false, error: "Error al obtener el detalle del presupuesto" };
  }
}

// ─── updateBudgetStatus ──────────────────────────────────────────────

export async function updateBudgetStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Verify budget belongs to this company
    const budget = await prisma.budget.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true, status: true },
    });

    if (!budget) {
      return { success: false, error: "Presupuesto no encontrado" };
    }

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[budget.status];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return {
        success: false,
        error: `No se puede cambiar el estado de "${budget.status}" a "${status}"`,
      };
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/dashboard/budgets");
    return { success: true, data: serializeDecimals(updated) };
  } catch (error) {
    console.error("Error al actualizar estado del presupuesto:", error);
    return {
      success: false,
      error: "Error al actualizar el estado del presupuesto",
    };
  }
}

// ─── getBudgetStats ──────────────────────────────────────────────────

export async function getBudgetStats(): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Total presupuestado (todos los presupuestos activos: draft, sent, approved)
    const activeBudgets = await prisma.budget.findMany({
      where: {
        companyId: session.companyId,
        status: { in: ["draft", "sent", "approved"] },
      },
      select: { total: true },
    });

    const totalBudgeted = activeBudgets.reduce(
      (sum, b) => sum + Number(b.total),
      0
    );

    // Approved count
    const approvedCount = await prisma.budget.count({
      where: {
        companyId: session.companyId,
        status: "approved",
      },
    });

    // Pending count (draft + sent)
    const pendingCount = await prisma.budget.count({
      where: {
        companyId: session.companyId,
        status: { in: ["draft", "sent"] },
      },
    });

    // Conversion rate: approved + invoiced / total (excluding draft)
    const totalNonDraft = await prisma.budget.count({
      where: {
        companyId: session.companyId,
        status: { not: "draft" },
      },
    });

    const convertedCount = await prisma.budget.count({
      where: {
        companyId: session.companyId,
        status: { in: ["approved", "invoiced"] },
      },
    });

    const conversionRate =
      totalNonDraft > 0
        ? Math.round((convertedCount / totalNonDraft) * 100)
        : 0;

    return {
      success: true,
      data: serializeDecimals({
        totalBudgeted,
        approvedCount,
        pendingCount,
        conversionRate,
      }),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de presupuestos:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de presupuestos",
    };
  }
}
