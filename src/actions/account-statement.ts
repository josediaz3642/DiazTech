"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { serializeDecimals } from "@/lib/utils";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getClientStatement(
  clientId: string,
  filters: { from?: string; to?: string; type?: string } = {}
): Promise<ActionResult<any[]>> {
  try {
    const session = await getSession();

    const whereClause: any = {
      companyId: session.companyId,
      clientId: clientId,
    };

    if (filters.from || filters.to) {
      whereClause.date = {};
      if (filters.from) {
        whereClause.date.gte = new Date(filters.from);
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        whereClause.date.lte = toDate;
      }
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    const movements = await prisma.accountMovement.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });

    return { success: true, data: serializeDecimals(movements) };
  } catch (error) {
    console.error("Error al obtener cuenta corriente del cliente:", error);
    return {
      success: false,
      error: "Error al obtener los movimientos de la cuenta corriente",
    };
  }
}

export async function getSupplierStatement(
  supplierId: string,
  filters: { from?: string; to?: string; type?: string } = {}
): Promise<ActionResult<any[]>> {
  try {
    const session = await getSession();

    const whereClause: any = {
      companyId: session.companyId,
      supplierId: supplierId,
    };

    if (filters.from || filters.to) {
      whereClause.date = {};
      if (filters.from) {
        whereClause.date.gte = new Date(filters.from);
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        whereClause.date.lte = toDate;
      }
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    const movements = await prisma.accountMovement.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });

    return { success: true, data: serializeDecimals(movements) };
  } catch (error) {
    console.error("Error al obtener cuenta corriente del proveedor:", error);
    return {
      success: false,
      error: "Error al obtener los movimientos de la cuenta corriente",
    };
  }
}
