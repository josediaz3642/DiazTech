"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

// ── Types ──────────────────────────────────────────────

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  amount?: number;
  date: Date;
}

// ── Dashboard ──────────────────────────────────────────

export interface DashboardMetricsData {
  todaySales: number;
  todayCollections: number;
  pendingInvoices: number;
  lowStockCount: number;
  recentActivity: RecentActivity[];
}

export async function getDashboardMetrics(): Promise<ActionResult<DashboardMetricsData>> {
  try {
    const { companyId } = await getSession();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all queries in parallel
    const [
      todayInvoices,
      todayReceipts,
      pendingInvoices,
      lowStockProducts,
      recentInvoices,
      recentReceipts,
      recentCashMovements,
    ] = await Promise.all([
      // Today's sales (authorized invoices)
      prisma.invoice.findMany({
        where: {
          companyId,
          date: { gte: today, lt: tomorrow },
          status: { not: "cancelled" },
        },
        select: { total: true },
      }),

      // Today's collections
      prisma.receipt.findMany({
        where: {
          companyId,
          type: "collection",
          date: { gte: today, lt: tomorrow },
        },
        select: { total: true },
      }),

      // Pending invoices count
      prisma.invoice.count({
        where: { companyId, status: "pending" },
      }),

      // Low stock products: products where total stock across warehouses is at or below minStock
      prisma.product.findMany({
        where: {
          companyId,
          isActive: true,
          minStock: { gt: 0 },
        },
        include: {
          stockLevels: {
            select: { quantity: true },
          },
        },
      }),

      // Recent invoices for activity feed
      prisma.invoice.findMany({
        where: { companyId },
        include: {
          client: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Recent receipts for activity feed
      prisma.receipt.findMany({
        where: { companyId },
        include: {
          client: { select: { name: true } },
          supplier: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Recent cash movements for activity feed
      prisma.cashMovement.findMany({
        where: {
          cashRegister: { companyId },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Calculate today's sales total
    const todaySales = todayInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    );

    // Calculate today's collections total
    const todayCollections = todayReceipts.reduce(
      (sum, rec) => sum + Number(rec.total),
      0
    );

    // Count low-stock products (total quantity across all warehouses <= minStock)
    const lowStockCount = lowStockProducts.filter((product) => {
      const totalStock = product.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.quantity),
        0
      );
      return totalStock <= Number(product.minStock);
    }).length;

    // Build recent activity feed
    const recentActivity: RecentActivity[] = [];

    for (const inv of recentInvoices) {
      recentActivity.push({
        id: inv.id,
        type: "invoice",
        description: `Factura ${inv.type} ${inv.pointOfSale.toString().padStart(4, "0")}-${inv.number.toString().padStart(8, "0")}${inv.client ? ` - ${inv.client.name}` : ""}`,
        amount: Number(inv.total),
        date: inv.createdAt,
      });
    }

    for (const rec of recentReceipts) {
      const entity = rec.client?.name ?? rec.supplier?.name ?? "";
      const label = rec.type === "collection" ? "Cobro" : "Pago";
      recentActivity.push({
        id: rec.id,
        type: "receipt",
        description: `${label} #${rec.number}${entity ? ` - ${entity}` : ""}`,
        amount: Number(rec.total),
        date: rec.createdAt,
      });
    }

    for (const mov of recentCashMovements) {
      recentActivity.push({
        id: mov.id,
        type: "cash_movement",
        description: `Caja: ${mov.description}`,
        amount: Number(mov.amount),
        date: mov.createdAt,
      });
    }

    // Sort by date descending and take top 10
    recentActivity.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const topActivity = recentActivity.slice(0, 10);

    return {
      success: true,
      data: {
        todaySales,
        todayCollections,
        pendingInvoices,
        lowStockCount,
        recentActivity: topActivity,
      },
    };
  } catch (error) {
    console.error("Error al obtener métricas del dashboard:", error);
    return {
      success: false,
      error: "Error al obtener las métricas del dashboard",
    };
  }
}
