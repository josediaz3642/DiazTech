"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { serializeDecimals } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

export type ProductFormData = {
  code: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  unit?: string;
  costPrice?: number;
  salePrice?: number;
  costPriceUsd?: number;
  salePriceUsd?: number;
  ivaRate?: number;
  minStock?: number;
};

export type StockLevelInput = {
  warehouseId: string;
  quantity: number;
};

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ─── GET ALL ─────────────────────────────────────────────────────

export async function getProducts(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const products = await prisma.product.findMany({
      where: { companyId: session.companyId },
      include: {
        stockLevels: {
          include: { warehouse: true },
        },
        category: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: serializeDecimals(products) };
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return {
      success: false,
      error: "Error al obtener la lista de productos",
    };
  }
}

// ─── GET ONE ─────────────────────────────────────────────────────

export async function getProduct(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    const product = await prisma.product.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        stockLevels: {
          include: { warehouse: true },
        },
        category: true,
      },
    });

    if (!product) {
      return { success: false, error: "Producto no encontrado" };
    }

    return { success: true, data: serializeDecimals(product) };
  } catch (error) {
    console.error("Error al obtener producto:", error);
    return { success: false, error: "Error al obtener el producto" };
  }
}

// ─── CREATE ──────────────────────────────────────────────────────

export async function createProduct(
  data: ProductFormData,
  stockLevels?: StockLevelInput[]
): Promise<ActionResult> {
  try {
    const session = await getSession();
    const companyId = session.companyId;

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          companyId,
          code: data.code,
          name: data.name,
          description: data.description ?? null,
          categoryId: data.categoryId ?? null,
          unit: data.unit ?? "unidad",
          costPrice: data.costPrice ?? 0,
          salePrice: data.salePrice ?? 0,
          costPriceUsd: data.costPriceUsd ?? 0,
          salePriceUsd: data.salePriceUsd ?? 0,
          ivaRate: data.ivaRate ?? 21,
          minStock: data.minStock ?? 0,
        },
      });

      // Create initial stock levels per warehouse
      if (stockLevels && stockLevels.length > 0) {
        await tx.stockLevel.createMany({
          data: stockLevels.map((sl) => ({
            productId: newProduct.id,
            warehouseId: sl.warehouseId,
            quantity: sl.quantity,
          })),
        });
      } else {
        // Auto-create stock level for all active warehouses with quantity 0
        const warehouses = await tx.warehouse.findMany({
          where: { companyId, isActive: true },
          select: { id: true },
        });

        if (warehouses.length > 0) {
          await tx.stockLevel.createMany({
            data: warehouses.map((w) => ({
              productId: newProduct.id,
              warehouseId: w.id,
              quantity: 0,
            })),
          });
        }
      }

      return newProduct;
    });

    revalidatePath("/productos");
    return { success: true, data: serializeDecimals(product) };
  } catch (error) {
    console.error("Error al crear producto:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Ya existe un producto con ese código",
      };
    }
    return { success: false, error: "Error al crear el producto" };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  data: ProductFormData,
  stockLevels?: StockLevelInput[]
): Promise<ActionResult> {
  try {
    const session = await getSession();

    const existing = await prisma.product.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Producto no encontrado" };
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          description: data.description ?? null,
          categoryId: data.categoryId ?? null,
          unit: data.unit ?? "unidad",
          costPrice: data.costPrice ?? 0,
          salePrice: data.salePrice ?? 0,
          costPriceUsd: data.costPriceUsd ?? 0,
          salePriceUsd: data.salePriceUsd ?? 0,
          ivaRate: data.ivaRate ?? 21,
          minStock: data.minStock ?? 0,
        },
      });

      if (stockLevels && stockLevels.length > 0) {
        for (const sl of stockLevels) {
          await tx.stockLevel.upsert({
            where: {
              productId_warehouseId: {
                productId: id,
                warehouseId: sl.warehouseId,
              },
            },
            update: { quantity: sl.quantity },
            create: {
              productId: id,
              warehouseId: sl.warehouseId,
              quantity: sl.quantity,
            },
          });
        }
      }

      return updated;
    });

    revalidatePath("/productos");
    return { success: true, data: serializeDecimals(product) };
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Ya existe un producto con ese código",
      };
    }
    return { success: false, error: "Error al actualizar el producto" };
  }
}

// ─── DELETE (soft) ───────────────────────────────────────────────

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    const existing = await prisma.product.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Producto no encontrado" };
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/productos");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return { success: false, error: "Error al eliminar el producto" };
  }
}

// ─── WAREHOUSES ──────────────────────────────────────────────────

export async function getWarehouses(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const warehouses = await prisma.warehouse.findMany({
      where: { companyId: session.companyId, isActive: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: warehouses };
  } catch (error) {
    console.error("Error al obtener depósitos:", error);
    return {
      success: false,
      error: "Error al obtener la lista de depósitos",
    };
  }
}

// ─── CATEGORIES ──────────────────────────────────────────────────

export async function getCategories(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const categories = await prisma.category.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return {
      success: false,
      error: "Error al obtener la lista de categorías",
    };
  }
}

// ─── STATS ───────────────────────────────────────────────────────

export async function getProductStats(): Promise<ActionResult> {
  try {
    const session = await getSession();
    const companyId = session.companyId;

    const [totalProducts, stockAgg, lowStockProducts] = await Promise.all([
      prisma.product.count({
        where: { companyId, isActive: true },
      }),
      prisma.stockLevel.aggregate({
        where: {
          product: { companyId, isActive: true },
        },
        _sum: { quantity: true },
      }),
      // Products where total stock across all warehouses is below minStock
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT p.id)::bigint as count
        FROM "Product" p
        LEFT JOIN "StockLevel" sl ON sl."productId" = p.id
        WHERE p."companyId" = ${companyId}
          AND p."isActive" = true
          AND p."minStock" > 0
        GROUP BY p.id, p."minStock"
        HAVING COALESCE(SUM(sl.quantity), 0) < p."minStock"
      `,
    ]);

    const totalUnits = stockAgg._sum.quantity ?? new Prisma.Decimal(0);

    // Calculate total inventory value (cost price × stock quantity)
    const valueResult = await prisma.$queryRaw<{ total: Prisma.Decimal | null }[]>`
      SELECT COALESCE(SUM(p."costPrice" * sl.quantity), 0) as total
      FROM "Product" p
      JOIN "StockLevel" sl ON sl."productId" = p.id
      WHERE p."companyId" = ${companyId}
        AND p."isActive" = true
    `;

    const totalValue = valueResult[0]?.total ?? new Prisma.Decimal(0);

    return {
      success: true,
      data: serializeDecimals({
        totalProducts,
        totalUnits,
        totalValue,
        lowStockCount: lowStockProducts.length,
      }),
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de productos:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de productos",
    };
  }
}
