"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CheckInput {
  type: string; // received | issued
  bankName: string;
  number: string;
  amount: number;
  currency?: string;
  issueDate: string; // ISO date
  dueDate: string; // ISO date
  status?: string;
  payer?: string;
  payee?: string;
  notes?: string;
}

// ── Valid status transitions ───────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["deposited", "cashed", "cancelled", "endorsed"],
  deposited: ["cashed", "bounced", "cancelled"],
  cashed: [],
  bounced: ["pending"],
  cancelled: [],
  endorsed: ["cashed", "bounced"],
};

// ── CRUD ───────────────────────────────────────────────

export async function getChecks(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const checks = await prisma.check.findMany({
      where: { companyId },
      orderBy: { dueDate: "asc" },
    });

    return { success: true, data: checks };
  } catch (error) {
    console.error("Error al obtener cheques:", error);
    return { success: false, error: "Error al obtener los cheques" };
  }
}

export async function createCheck(data: CheckInput): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const check = await prisma.check.create({
      data: {
        companyId,
        type: data.type,
        bankName: data.bankName,
        number: data.number,
        amount: data.amount,
        currency: data.currency ?? "ARS",
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        status: data.status ?? "pending",
        payer: data.payer ?? null,
        payee: data.payee ?? null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath("/cheques");
    return { success: true, data: check };
  } catch (error) {
    console.error("Error al crear cheque:", error);
    return { success: false, error: "Error al crear el cheque" };
  }
}

export async function updateCheck(
  id: string,
  data: Partial<CheckInput>
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    // Verify ownership
    const existing = await prisma.check.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return { success: false, error: "Cheque no encontrado" };
    }

    const check = await prisma.check.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.number !== undefined && { number: data.number }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.issueDate !== undefined && {
          issueDate: new Date(data.issueDate),
        }),
        ...(data.dueDate !== undefined && {
          dueDate: new Date(data.dueDate),
        }),
        ...(data.payer !== undefined && { payer: data.payer }),
        ...(data.payee !== undefined && { payee: data.payee }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    revalidatePath("/cheques");
    return { success: true, data: check };
  } catch (error) {
    console.error("Error al actualizar cheque:", error);
    return { success: false, error: "Error al actualizar el cheque" };
  }
}

export async function deleteCheck(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    // Verify ownership
    const existing = await prisma.check.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return { success: false, error: "Cheque no encontrado" };
    }

    await prisma.check.delete({ where: { id } });

    revalidatePath("/cheques");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar cheque:", error);
    return { success: false, error: "Error al eliminar el cheque" };
  }
}

export async function updateCheckStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const existing = await prisma.check.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return { success: false, error: "Cheque no encontrado" };
    }

    // Validate status transition
    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(status)) {
      return {
        success: false,
        error: `No se puede cambiar el estado de "${existing.status}" a "${status}"`,
      };
    }

    const check = await prisma.check.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/cheques");
    return { success: true, data: check };
  } catch (error) {
    console.error("Error al cambiar estado del cheque:", error);
    return {
      success: false,
      error: "Error al cambiar el estado del cheque",
    };
  }
}

// ── Stats ──────────────────────────────────────────────

export async function getCheckStats(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const checks = await prisma.check.findMany({
      where: { companyId },
      select: { type: true, status: true, amount: true },
    });

    let totalReceived = 0;
    let totalIssued = 0;
    let pendingCount = 0;
    let totalPendingAmount = 0;

    for (const check of checks) {
      const amount = Number(check.amount);
      if (check.type === "received") {
        totalReceived += amount;
      } else {
        totalIssued += amount;
      }
      if (check.status === "pending") {
        pendingCount++;
        totalPendingAmount += amount;
      }
    }

    return {
      success: true,
      data: {
        totalReceived,
        totalIssued,
        pendingCount,
        totalPendingAmount,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de cheques:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de cheques",
    };
  }
}
