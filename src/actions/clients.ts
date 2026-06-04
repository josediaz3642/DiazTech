"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { serializeDecimals } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

export type ClientFormData = {
  name: string;
  cuit?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  taxCategory?: string | null;
  notes?: string | null;
};

type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ─── GET ALL ─────────────────────────────────────────────────────

export async function getClients(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const clients = await prisma.client.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    });

    return { success: true, data: serializeDecimals(clients) };
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    return {
      success: false,
      error: "Error al obtener la lista de clientes",
    };
  }
}

// ─── GET ONE ─────────────────────────────────────────────────────

export async function getClient(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    const client = await prisma.client.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!client) {
      return { success: false, error: "Cliente no encontrado" };
    }

    return { success: true, data: serializeDecimals(client) };
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    return { success: false, error: "Error al obtener el cliente" };
  }
}

// ─── CREATE ──────────────────────────────────────────────────────

export async function createClient(
  data: ClientFormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    const client = await prisma.client.create({
      data: {
        companyId: session.companyId,
        name: data.name,
        cuit: data.cuit ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        province: data.province ?? null,
        taxCategory: data.taxCategory ?? null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath("/clientes");
    return { success: true, data: serializeDecimals(client) };
  } catch (error) {
    console.error("Error al crear cliente:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe un cliente con esos datos" };
    }
    return { success: false, error: "Error al crear el cliente" };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────

export async function updateClient(
  id: string,
  data: ClientFormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Verify ownership first
    const existing = await prisma.client.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Cliente no encontrado" };
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        cuit: data.cuit ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        province: data.province ?? null,
        taxCategory: data.taxCategory ?? null,
        notes: data.notes ?? null,
      },
    });

    revalidatePath("/clientes");
    return { success: true, data: serializeDecimals(client) };
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    return { success: false, error: "Error al actualizar el cliente" };
  }
}

// ─── DELETE (soft) ───────────────────────────────────────────────

export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    // Verify ownership first
    const existing = await prisma.client.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Cliente no encontrado" };
    }

    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    return { success: false, error: "Error al eliminar el cliente" };
  }
}

// ─── STATS ───────────────────────────────────────────────────────

export async function getClientStats(): Promise<ActionResult> {
  try {
    const session = await getSession();
    const companyId = session.companyId;

    const [total, activeCount, aggregations] = await Promise.all([
      prisma.client.count({
        where: { companyId },
      }),
      prisma.client.count({
        where: { companyId, isActive: true },
      }),
      prisma.client.aggregate({
        where: { companyId, isActive: true },
        _sum: { balance: true },
      }),
    ]);

    const totalDebt = aggregations._sum.balance ?? new Prisma.Decimal(0);

    const debtorsCount = await prisma.client.count({
      where: {
        companyId,
        isActive: true,
        balance: { gt: 0 },
      },
    });

    return {
      success: true,
      data: serializeDecimals({
        total,
        activeCount,
        totalDebt,
        debtorsCount,
      }),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de clientes:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de clientes",
    };
  }
}
