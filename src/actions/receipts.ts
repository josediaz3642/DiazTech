"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ReceiptInput {
  clientId?: string;
  supplierId?: string;
  type: string; // collection (cobro) | payment (pago)
  date: string; // ISO date
  total: number;
  currency?: string;
  paymentMethod: string; // cash, transfer, check, mercadopago, other
  description?: string;
  notes?: string;
}

// ── CRUD ───────────────────────────────────────────────

export async function getReceipts(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const receipts = await prisma.receipt.findMany({
      where: { companyId },
      include: {
        client: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return { success: true, data: serializeDecimals(receipts) };
  } catch (error) {
    console.error("Error al obtener recibos:", error);
    return { success: false, error: "Error al obtener los recibos" };
  }
}

export async function createReceipt(
  data: ReceiptInput
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const companyId = session.companyId;

    const receipt = await prisma.$transaction(async (tx) => {
      // Validate client if provided
      if (data.clientId) {
        const client = await tx.client.findFirst({
          where: { id: data.clientId, companyId },
        });
        if (!client) {
          throw new Error("El cliente seleccionado no existe o no pertenece a esta empresa.");
        }
      }

      // Validate supplier if provided
      if (data.supplierId) {
        const supplier = await tx.supplier.findFirst({
          where: { id: data.supplierId, companyId },
        });
        if (!supplier) {
          throw new Error("El proveedor seleccionado no existe o no pertenece a esta empresa.");
        }
      }

      // Auto-increment number per company + type
      const lastReceipt = await tx.receipt.findFirst({
        where: { companyId, type: data.type },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const nextNumber = (lastReceipt?.number ?? 0) + 1;

      const created = await tx.receipt.create({
        data: {
          companyId,
          clientId: data.clientId ?? null,
          supplierId: data.supplierId ?? null,
          number: nextNumber,
          type: data.type,
          date: new Date(data.date),
          total: data.total,
          currency: data.currency ?? "ARS",
          paymentMethod: data.paymentMethod,
          description: data.description ?? null,
          notes: data.notes ?? null,
        },
        include: {
          client: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      });

      // Update balances & create AccountMovements
      const amount = Number(data.total);
      const receiptCurrency = data.currency ?? "ARS";

      if (data.clientId) {
        // Receipt from client (cobro) reduces client balance
        const delta = -amount;

        const client = await tx.client.findUniqueOrThrow({
          where: { id: data.clientId },
        });

        const newBalance = (receiptCurrency === "USD" ? Number(client.balanceUsd) : Number(client.balance)) + delta;

        await tx.client.update({
          where: { id: data.clientId },
          data: receiptCurrency === "USD"
            ? { balanceUsd: newBalance }
            : { balance: newBalance }
        });

        const docName = `Recibo de Cobro N° ${nextNumber.toString().padStart(8, "0")}`;

        await tx.accountMovement.create({
          data: {
            companyId,
            clientId: data.clientId,
            type: "receipt",
            description: docName,
            amount: delta,
            currency: receiptCurrency,
            balance: newBalance,
            referenceId: created.id,
            date: new Date(data.date),
          }
        });
      } else if (data.supplierId) {
        // Payment to supplier reduces what we owe (supplier balance)
        const delta = -amount;

        const supplier = await tx.supplier.findUniqueOrThrow({
          where: { id: data.supplierId },
        });

        const newBalance = (receiptCurrency === "USD" ? Number(supplier.balanceUsd) : Number(supplier.balance)) + delta;

        await tx.supplier.update({
          where: { id: data.supplierId },
          data: receiptCurrency === "USD"
            ? { balanceUsd: newBalance }
            : { balance: newBalance }
        });

        const docName = `Recibo de Pago N° ${nextNumber.toString().padStart(8, "0")}`;

        await tx.accountMovement.create({
          data: {
            companyId,
            supplierId: data.supplierId,
            type: "payment",
            description: docName,
            amount: delta,
            currency: receiptCurrency,
            balance: newBalance,
            referenceId: created.id,
            date: new Date(data.date),
          }
        });
      }

      return created;
    });

    revalidatePath("/dashboard/receipts");
    revalidatePath("/dashboard/clientes");
    revalidatePath("/dashboard/proveedores");
    return { success: true, data: serializeDecimals(receipt) };
  } catch (error) {
    console.error("Error al crear recibo:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al crear el recibo" };
  }
}

// ─── getReceiptById ──────────────────────────────────────────────────

export async function getReceiptById(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    const receipt = await prisma.receipt.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        client: { select: { id: true, name: true, cuit: true, taxCategory: true, address: true, city: true, province: true } },
        supplier: { select: { id: true, name: true, cuit: true, taxCategory: true, address: true, city: true, province: true } }
      }
    });
    if (!receipt) return { success: false, error: "Recibo no encontrado" };
    return { success: true, data: serializeDecimals(receipt) };
  } catch (error) {
    console.error("Error al obtener recibo por ID:", error);
    return { success: false, error: "Error al obtener el detalle del recibo" };
  }
}

// ── Stats ──────────────────────────────────────────────

export async function getReceiptStats(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const receipts = await prisma.receipt.findMany({
      where: { companyId },
      select: { type: true, total: true, date: true },
    });

    let totalCollections = 0;
    let totalPayments = 0;
    let thisMonthCollections = 0;
    let thisMonthPayments = 0;

    for (const receipt of receipts) {
      const amount = Number(receipt.total);
      const isThisMonth = receipt.date >= startOfMonth;

      if (receipt.type === "collection") {
        totalCollections += amount;
        if (isThisMonth) thisMonthCollections += amount;
      } else {
        totalPayments += amount;
        if (isThisMonth) thisMonthPayments += amount;
      }
    }

    return {
      success: true,
      data: {
        totalCollections,
        totalPayments,
        thisMonth: {
          collections: thisMonthCollections,
          payments: thisMonthPayments,
        },
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de recibos:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de recibos",
    };
  }
}
