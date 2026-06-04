"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CashMovementInput {
  type: string; // income | expense
  category: string; // sale, collection, purchase, payment, withdrawal, deposit, other
  description: string;
  amount: number;
  currency?: string;
  referenceId?: string;
}

// ── Cash Registers ─────────────────────────────────────

export async function getCashRegisters(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const registers = await prisma.cashRegister.findMany({
      where: { companyId },
      include: {
        movements: {
          orderBy: { date: "desc" },
          take: 5,
        },
      },
      orderBy: { date: "desc" },
    });

    return { success: true, data: serializeDecimals(registers) };
  } catch (error) {
    console.error("Error al obtener cajas:", error);
    return {
      success: false,
      error: "Error al obtener las cajas registradoras",
    };
  }
}

export async function getActiveCashRegister(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const register = await prisma.cashRegister.findFirst({
      where: { companyId, status: "open" },
      include: {
        movements: {
          orderBy: { date: "desc" },
        },
      },
    });

    return { success: true, data: serializeDecimals(register) };
  } catch (error) {
    console.error("Error al obtener caja activa:", error);
    return {
      success: false,
      error: "Error al obtener la caja activa",
    };
  }
}

export async function openCashRegister(
  openAmount: number
): Promise<ActionResult> {
  try {
    const { companyId, userId } = await getSession();

    // Check if there's already an open register
    const existing = await prisma.cashRegister.findFirst({
      where: { companyId, status: "open" },
    });

    if (existing) {
      return {
        success: false,
        error: "Ya existe una caja abierta. Cerrala antes de abrir una nueva.",
      };
    }

    const register = await prisma.cashRegister.create({
      data: {
        companyId,
        date: new Date(),
        openAmount,
        status: "open",
        openedBy: userId,
      },
    });

    revalidatePath("/caja");
    return { success: true, data: serializeDecimals(register) };
  } catch (error) {
    console.error("Error al abrir caja:", error);
    return { success: false, error: "Error al abrir la caja" };
  }
}

export async function closeCashRegister(id: string): Promise<ActionResult> {
  try {
    const { companyId, userId } = await getSession();

    const register = await prisma.cashRegister.findFirst({
      where: { id, companyId, status: "open" },
      include: { movements: true },
    });

    if (!register) {
      return {
        success: false,
        error: "Caja no encontrada o ya está cerrada",
      };
    }

    // Calculate close amount: open amount + sum of income movements - sum of expense movements
    let closeAmount = Number(register.openAmount);
    for (const mov of register.movements) {
      if (mov.type === "income") {
        closeAmount += Number(mov.amount);
      } else {
        closeAmount -= Number(mov.amount);
      }
    }

    const updated = await prisma.cashRegister.update({
      where: { id },
      data: {
        status: "closed",
        closeAmount,
        closedBy: userId,
      },
    });

    revalidatePath("/caja");
    return { success: true, data: serializeDecimals(updated) };
  } catch (error) {
    console.error("Error al cerrar caja:", error);
    return { success: false, error: "Error al cerrar la caja" };
  }
}

// ── Cash Movements ─────────────────────────────────────

export async function addCashMovement(
  data: CashMovementInput
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    // Find the active register
    const register = await prisma.cashRegister.findFirst({
      where: { companyId, status: "open" },
    });

    if (!register) {
      return {
        success: false,
        error: "No hay una caja abierta. Abrí una caja primero.",
      };
    }

    const movement = await prisma.cashMovement.create({
      data: {
        cashRegisterId: register.id,
        type: data.type,
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency ?? "ARS",
        referenceId: data.referenceId ?? null,
        date: new Date(),
      },
    });

    revalidatePath("/caja");
    return { success: true, data: serializeDecimals(movement) };
  } catch (error) {
    console.error("Error al agregar movimiento de caja:", error);
    return { success: false, error: "Error al agregar el movimiento de caja" };
  }
}

// ── Stats ──────────────────────────────────────────────

export async function getCashStats(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's open register
    const activeRegister = await prisma.cashRegister.findFirst({
      where: { companyId, status: "open" },
      include: { movements: true },
    });

    let todayBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    if (activeRegister) {
      todayBalance = Number(activeRegister.openAmount);
      for (const mov of activeRegister.movements) {
        const amount = Number(mov.amount);
        if (mov.type === "income") {
          totalIncome += amount;
          todayBalance += amount;
        } else {
          totalExpense += amount;
          todayBalance -= amount;
        }
      }
    }

    return {
      success: true,
      data: {
        todayBalance,
        totalIncome,
        totalExpense,
        isOpen: !!activeRegister,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de caja:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de caja",
    };
  }
}
