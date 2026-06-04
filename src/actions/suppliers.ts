"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { serializeDecimals } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

export type SupplierFormData = {
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

export async function getSuppliers(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const suppliers = await prisma.supplier.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    });

    return { success: true, data: serializeDecimals(suppliers) };
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    return {
      success: false,
      error: "Error al obtener la lista de proveedores",
    };
  }
}

// ─── GET ONE ─────────────────────────────────────────────────────

export async function getSupplier(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    const supplier = await prisma.supplier.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!supplier) {
      return { success: false, error: "Proveedor no encontrado" };
    }

    return { success: true, data: serializeDecimals(supplier) };
  } catch (error) {
    console.error("Error al obtener proveedor:", error);
    return { success: false, error: "Error al obtener el proveedor" };
  }
}

// ─── CREATE ──────────────────────────────────────────────────────

export async function createSupplier(
  data: SupplierFormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    const supplier = await prisma.supplier.create({
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

    revalidatePath("/proveedores");
    return { success: true, data: serializeDecimals(supplier) };
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Ya existe un proveedor con esos datos",
      };
    }
    return { success: false, error: "Error al crear el proveedor" };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────

export async function updateSupplier(
  id: string,
  data: SupplierFormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    const existing = await prisma.supplier.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Proveedor no encontrado" };
    }

    const supplier = await prisma.supplier.update({
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

    revalidatePath("/proveedores");
    return { success: true, data: serializeDecimals(supplier) };
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    return { success: false, error: "Error al actualizar el proveedor" };
  }
}

// ─── DELETE (soft) ───────────────────────────────────────────────

export async function deleteSupplier(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    const existing = await prisma.supplier.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Proveedor no encontrado" };
    }

    await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/proveedores");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
    return { success: false, error: "Error al eliminar el proveedor" };
  }
}

// ─── STATS ───────────────────────────────────────────────────────

export async function getSupplierStats(): Promise<ActionResult> {
  try {
    const session = await getSession();
    const companyId = session.companyId;

    const [total, activeCount, aggregations] = await Promise.all([
      prisma.supplier.count({
        where: { companyId },
      }),
      prisma.supplier.count({
        where: { companyId, isActive: true },
      }),
      prisma.supplier.aggregate({
        where: { companyId, isActive: true },
        _sum: { balance: true, balanceUsd: true },
      }),
    ]);

    return {
      success: true,
      data: serializeDecimals({
        total,
        activeCount,
        totalDebtArs: aggregations._sum.balance ?? new Prisma.Decimal(0),
        totalDebtUsd: aggregations._sum.balanceUsd ?? new Prisma.Decimal(0),
      }),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de proveedores:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de proveedores",
    };
  }
}
