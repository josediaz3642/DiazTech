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

interface BankAccountInput {
  bankName: string;
  accountType: string; // CA | CC
  accountNumber?: string;
  cbu?: string;
  alias?: string;
  currency?: string;
  balance?: number;
}

interface BankMovementInput {
  bankAccountId: string;
  type: string; // credit | debit
  description: string;
  amount: number;
  referenceId?: string;
  date?: string; // ISO date
}

// ── Bank Accounts ──────────────────────────────────────

export async function getBankAccounts(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const accounts = await prisma.bankAccount.findMany({
      where: { companyId, isActive: true },
      include: {
        movements: {
          orderBy: { date: "desc" },
          take: 5,
        },
      },
      orderBy: { bankName: "asc" },
    });

    return { success: true, data: accounts };
  } catch (error) {
    console.error("Error al obtener cuentas bancarias:", error);
    return {
      success: false,
      error: "Error al obtener las cuentas bancarias",
    };
  }
}

export async function createBankAccount(
  data: BankAccountInput
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const account = await prisma.bankAccount.create({
      data: {
        companyId,
        bankName: data.bankName,
        accountType: data.accountType,
        accountNumber: data.accountNumber ?? null,
        cbu: data.cbu ?? null,
        alias: data.alias ?? null,
        currency: data.currency ?? "ARS",
        balance: data.balance ?? 0,
      },
    });

    revalidatePath("/bancos");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error al crear cuenta bancaria:", error);
    return { success: false, error: "Error al crear la cuenta bancaria" };
  }
}

export async function updateBankAccount(
  id: string,
  data: Partial<BankAccountInput>
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    // Verify ownership
    const existing = await prisma.bankAccount.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return { success: false, error: "Cuenta bancaria no encontrada" };
    }

    const account = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.accountType !== undefined && {
          accountType: data.accountType,
        }),
        ...(data.accountNumber !== undefined && {
          accountNumber: data.accountNumber,
        }),
        ...(data.cbu !== undefined && { cbu: data.cbu }),
        ...(data.alias !== undefined && { alias: data.alias }),
        ...(data.currency !== undefined && { currency: data.currency }),
      },
    });

    revalidatePath("/bancos");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error al actualizar cuenta bancaria:", error);
    return {
      success: false,
      error: "Error al actualizar la cuenta bancaria",
    };
  }
}

export async function deleteBankAccount(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    // Verify ownership
    const existing = await prisma.bankAccount.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return { success: false, error: "Cuenta bancaria no encontrada" };
    }

    // Soft delete
    await prisma.bankAccount.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/bancos");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar cuenta bancaria:", error);
    return { success: false, error: "Error al eliminar la cuenta bancaria" };
  }
}

// ── Bank Movements ─────────────────────────────────────

export async function getBankMovements(
  accountId: string
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    // Verify the account belongs to this company
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, companyId },
    });

    if (!account) {
      return { success: false, error: "Cuenta bancaria no encontrada" };
    }

    const movements = await prisma.bankMovement.findMany({
      where: { bankAccountId: accountId },
      orderBy: { date: "desc" },
    });

    return { success: true, data: movements };
  } catch (error) {
    console.error("Error al obtener movimientos bancarios:", error);
    return {
      success: false,
      error: "Error al obtener los movimientos bancarios",
    };
  }
}

export async function addBankMovement(
  data: BankMovementInput
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    // Verify the account belongs to this company
    const account = await prisma.bankAccount.findFirst({
      where: { id: data.bankAccountId, companyId },
    });

    if (!account) {
      return { success: false, error: "Cuenta bancaria no encontrada" };
    }

    // Use transaction to atomically update balance and create movement
    const result = await prisma.$transaction(async (tx) => {
      // Calculate new balance
      const balanceChange =
        data.type === "credit" ? data.amount : -data.amount;
      const newBalance = Number(account.balance) + balanceChange;

      // Update account balance
      await tx.bankAccount.update({
        where: { id: data.bankAccountId },
        data: { balance: newBalance },
      });

      // Create movement with running balance
      const movement = await tx.bankMovement.create({
        data: {
          bankAccountId: data.bankAccountId,
          type: data.type,
          description: data.description,
          amount: data.amount,
          balance: newBalance,
          referenceId: data.referenceId ?? null,
          date: data.date ? new Date(data.date) : new Date(),
        },
      });

      return movement;
    });

    revalidatePath("/bancos");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error al agregar movimiento bancario:", error);
    return {
      success: false,
      error: "Error al agregar el movimiento bancario",
    };
  }
}

// ── Stats ──────────────────────────────────────────────

export async function getBankStats(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const accounts = await prisma.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { currency: true, balance: true },
    });

    let totalArs = 0;
    let totalUsd = 0;

    for (const acc of accounts) {
      const balance = Number(acc.balance);
      if (acc.currency === "USD") {
        totalUsd += balance;
      } else {
        totalArs += balance;
      }
    }

    return {
      success: true,
      data: {
        totalArs,
        totalUsd,
        accountCount: accounts.length,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas bancarias:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas bancarias",
    };
  }
}
