"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export interface RemitoItemInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unit?: string;
}

export interface CreateRemitoInput {
  clientId?: string | null;
  date: string; // ISO date string
  notes?: string | null;
  items: RemitoItemInput[];
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["delivered", "cancelled"],
  delivered: [], // terminal state
  cancelled: [], // terminal state
};

// ─── getRemitos ──────────────────────────────────────────────────────

export async function getRemitos(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const remitos = await prisma.remito.findMany({
      where: { companyId: session.companyId },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        items: true,
      },
      orderBy: { date: "desc" },
    });

    return { success: true, data: serializeDecimals(remitos) };
  } catch (error) {
    console.error("Error al obtener remitos:", error);
    return { success: false, error: "Error al obtener los remitos" };
  }
}

// ─── createRemito ────────────────────────────────────────────────────

export async function createRemito(
  data: CreateRemitoInput
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: "El remito debe tener al menos un ítem",
      };
    }

    const remito = await prisma.$transaction(async (tx) => {
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
      const lastRemito = await tx.remito.findFirst({
        where: { companyId: session.companyId },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const nextNumber = (lastRemito?.number ?? 0) + 1;

      const created = await tx.remito.create({
        data: {
          companyId: session.companyId,
          clientId: data.clientId || null,
          number: nextNumber,
          date: new Date(data.date),
          status: "pending",
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId || null,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit ?? "unidad",
            })),
          },
        },
        include: { items: true },
      });

      return created;
    });

    revalidatePath("/dashboard/remitos");
    return { success: true, data: serializeDecimals(remito) };
  } catch (error) {
    console.error("Error al crear remito:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al crear el remito" };
  }
}

// ─── getRemitoById ───────────────────────────────────────────────────

export async function getRemitoById(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    const remito = await prisma.remito.findFirst({
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
    if (!remito) return { success: false, error: "Remito no encontrado" };
    return { success: true, data: serializeDecimals(remito) };
  } catch (error) {
    console.error("Error al obtener remito por ID:", error);
    return { success: false, error: "Error al obtener el detalle del remito" };
  }
}

// ─── updateRemitoStatus ──────────────────────────────────────────────

export async function updateRemitoStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Verify remito belongs to this company
    const remito = await prisma.remito.findFirst({
      where: { id, companyId: session.companyId },
      select: { id: true, status: true },
    });

    if (!remito) {
      return { success: false, error: "Remito no encontrado" };
    }

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[remito.status];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return {
        success: false,
        error: `No se puede cambiar el estado de "${remito.status}" a "${status}"`,
      };
    }

    const updated = await prisma.remito.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/dashboard/remitos");
    return { success: true, data: serializeDecimals(updated) };
  } catch (error) {
    console.error("Error al actualizar estado del remito:", error);
    return {
      success: false,
      error: "Error al actualizar el estado del remito",
    };
  }
}

// ─── getRemitoStats ──────────────────────────────────────────────────

export async function getRemitoStats(): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Total remitos
    const total = await prisma.remito.count({
      where: { companyId: session.companyId },
    });

    // Pending
    const pending = await prisma.remito.count({
      where: {
        companyId: session.companyId,
        status: "pending",
      },
    });

    // Delivered
    const delivered = await prisma.remito.count({
      where: {
        companyId: session.companyId,
        status: "delivered",
      },
    });

    // Total units dispatched (sum of quantities from delivered remitos)
    const deliveredRemitos = await prisma.remito.findMany({
      where: {
        companyId: session.companyId,
        status: "delivered",
      },
      include: {
        items: { select: { quantity: true } },
      },
    });

    const totalUnitsDispatched = deliveredRemitos.reduce(
      (sum, remito) =>
        sum +
        remito.items.reduce(
          (itemSum, item) => itemSum + Number(item.quantity),
          0
        ),
      0
    );

    return {
      success: true,
      data: serializeDecimals({
        total,
        pending,
        delivered,
        totalUnitsDispatched,
      }),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de remitos:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de remitos",
    };
  }
}
