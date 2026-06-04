"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/lib/utils";


// ─── Types ───────────────────────────────────────────────────────────

export interface InvoiceItemInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
  ivaAmount: number;
  subtotal: number;
  total: number;
}

export interface CreateInvoiceInput {
  clientId?: string | null;
  type: string;
  pointOfSale: number;
  date: string; // ISO date string
  dueDate?: string | null;
  currency?: string;
  exchangeRate?: number;
  notes?: string | null;
  items: InvoiceItemInput[];
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── getInvoices ─────────────────────────────────────────────────────

export async function getInvoices(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const invoices = await prisma.invoice.findMany({
      where: { companyId: session.companyId },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        items: true,
      },
      orderBy: { date: "desc" },
    });

    return { success: true, data: serializeDecimals(invoices) };
  } catch (error) {
    console.error("Error al obtener facturas:", error);
    return { success: false, error: "Error al obtener las facturas" };
  }
}

// ─── createInvoice ───────────────────────────────────────────────────

export async function createInvoice(
  data: CreateInvoiceInput
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (!data.items || data.items.length === 0) {
      return { success: false, error: "La factura debe tener al menos un ítem" };
    }

    const invoice = await prisma.$transaction(async (tx) => {
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

      // Auto-increment: get next number for this type + point of sale
      const lastInvoice = await tx.invoice.findFirst({
        where: {
          companyId: session.companyId,
          type: data.type,
          pointOfSale: data.pointOfSale,
        },
        orderBy: { number: "desc" },
        select: { number: true },
      });

      const nextNumber = (lastInvoice?.number ?? 0) + 1;

      // Calculate totals from items
      const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
      const ivaTotal = data.items.reduce(
        (sum, item) => sum + item.ivaAmount,
        0
      );
      const total = data.items.reduce((sum, item) => sum + item.total, 0);

      // Create invoice with items
      const created = await tx.invoice.create({
        data: {
          companyId: session.companyId,
          clientId: data.clientId || null,
          type: data.type,
          pointOfSale: data.pointOfSale,
          number: nextNumber,
          date: new Date(data.date),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          subtotal,
          ivaTotal,
          total,
          currency: data.currency ?? "ARS",
          exchangeRate: data.exchangeRate ?? 1,
          notes: data.notes || null,
          status: "pending",
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

      // Update Client balance and create AccountMovement if clientId is set
      if (data.clientId) {
        const isCreditNote = ["NCA", "NCB", "NCC"].includes(data.type);
        const delta = isCreditNote ? -total : total;

        const client = await tx.client.findUniqueOrThrow({
          where: { id: data.clientId },
        });

        const invoiceCurrency = data.currency ?? "ARS";
        const newBalance = (invoiceCurrency === "USD" ? Number(client.balanceUsd) : Number(client.balance)) + delta;

        // Update client balance
        await tx.client.update({
          where: { id: data.clientId },
          data: invoiceCurrency === "USD"
            ? { balanceUsd: newBalance }
            : { balance: newBalance }
        });

        // Determine description
        let desc = "Factura";
        if (data.type.startsWith("NC")) desc = "Nota de Crédito";
        if (data.type.startsWith("ND")) desc = "Nota de Débito";
        const docName = `${desc} ${data.type} N° ${data.pointOfSale.toString().padStart(4, "0")}-${nextNumber.toString().padStart(8, "0")}`;

        // Create movement
        await tx.accountMovement.create({
          data: {
            companyId: session.companyId,
            clientId: data.clientId,
            type: "invoice",
            description: docName,
            amount: delta,
            currency: invoiceCurrency,
            balance: newBalance,
            referenceId: created.id,
            date: new Date(data.date),
          }
        });
      }

      return created;
    });

    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/clientes");
    return { success: true, data: serializeDecimals(invoice) };
  } catch (error) {
    console.error("Error al crear factura:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al crear la factura" };
  }
}

// ─── getInvoiceById ──────────────────────────────────────────────────

export async function getInvoiceById(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    const invoice = await prisma.invoice.findFirst({
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
    if (!invoice) return { success: false, error: "Factura no encontrada" };
    return { success: true, data: serializeDecimals(invoice) };
  } catch (error) {
    console.error("Error al obtener factura por ID:", error);
    return { success: false, error: "Error al obtener el detalle de la factura" };
  }
}

// ─── getClientsForSelect ─────────────────────────────────────────────

export async function getClientsForSelect(): Promise<ActionResult> {
  try {
    const session = await getSession();
    const clients = await prisma.client.findMany({
      where: { companyId: session.companyId, isActive: true },
      select: {
        id: true,
        name: true,
        cuit: true,
        taxCategory: true,
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: serializeDecimals(clients) };
  } catch (error) {
    console.error("Error al obtener clientes para select:", error);
    return { success: false, error: "Error al obtener clientes para la selección" };
  }
}

// ─── getProductsForSelect ────────────────────────────────────────────

export async function getProductsForSelect(): Promise<ActionResult> {
  try {
    const session = await getSession();
    const products = await prisma.product.findMany({
      where: { companyId: session.companyId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        salePrice: true,
        ivaRate: true,
        unit: true,
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: serializeDecimals(products) };
  } catch (error) {
    console.error("Error al obtener productos para select:", error);
    return { success: false, error: "Error al obtener productos para la selección" };
  }
}

// ─── getInvoiceStats ─────────────────────────────────────────────────

export async function getInvoiceStats(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Total facturado en el mes (excluye notas de crédito)
    const invoicesThisMonth = await prisma.invoice.findMany({
      where: {
        companyId: session.companyId,
        date: { gte: startOfMonth, lte: endOfMonth },
        type: { notIn: ["NCA", "NCB", "NCC"] },
      },
      select: { total: true },
    });

    const totalMonth = invoicesThisMonth.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    );

    // Notas de crédito del mes
    const creditNotesThisMonth = await prisma.invoice.findMany({
      where: {
        companyId: session.companyId,
        date: { gte: startOfMonth, lte: endOfMonth },
        type: { in: ["NCA", "NCB", "NCC"] },
      },
      select: { total: true },
    });

    const creditNotesMonth = creditNotesThisMonth.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    );

    // Facturas autorizadas (con CAE)
    const authorizedCount = await prisma.invoice.count({
      where: {
        companyId: session.companyId,
        status: "authorized",
      },
    });

    // Facturas pendientes de CAE
    const pendingCaeCount = await prisma.invoice.count({
      where: {
        companyId: session.companyId,
        status: "pending",
        cae: null,
      },
    });

    return {
      success: true,
      data: serializeDecimals({
        totalMonth,
        creditNotesMonth,
        authorizedCount,
        pendingCaeCount,
      }),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de facturas:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de facturación",
    };
  }
}

// ─── getNextInvoiceNumber ────────────────────────────────────────────

export async function getNextInvoiceNumber(
  type: string,
  pointOfSale: number
): Promise<ActionResult<number>> {
  try {
    const session = await getSession();

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        companyId: session.companyId,
        type,
        pointOfSale,
      },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    const nextNumber = (lastInvoice?.number ?? 0) + 1;

    return { success: true, data: nextNumber };
  } catch (error) {
    console.error("Error al obtener próximo número:", error);
    return {
      success: false,
      error: "Error al obtener el próximo número de factura",
    };
  }
}
