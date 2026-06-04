"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

// ── Types ──────────────────────────────────────────────

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Helpers ────────────────────────────────────────────

function getPeriodDates(period: string, from?: string, to?: string) {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "custom" && from && to) {
    start = new Date(from);
    start.setHours(0, 0, 0, 0);
    end = new Date(to);
    end.setHours(23, 59, 59, 999);
  } else if (period === "week") {
    start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    // Default: last 30 days
    start = new Date(now);
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ── Sales Report ───────────────────────────────────────

export interface SalesByDay {
  date: string;
  total: number;
  count: number;
}

export interface TopClient {
  name: string;
  total: number;
  invoiceCount: number;
}

export interface InvoiceByType {
  type: string;
  total: number;
  count: number;
}

export interface SalesReportData {
  totalSales: number;
  totalInvoices: number;
  avgTicket: number;
  byDay: SalesByDay[];
  topClients: TopClient[];
  byType: InvoiceByType[];
  previousPeriodTotal: number;
}

export async function getSalesReport(
  period: string = "month",
  from?: string,
  to?: string
): Promise<ActionResult<SalesReportData>> {
  try {
    const { companyId } = await getSession();
    const { start, end } = getPeriodDates(period, from, to);

    // Previous period (same duration)
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime() - 1);

    const [invoices, prevInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          companyId,
          date: { gte: start, lte: end },
          status: { not: "cancelled" },
        },
        include: { client: { select: { name: true } } },
        orderBy: { date: "asc" },
      }),
      prisma.invoice.findMany({
        where: {
          companyId,
          date: { gte: prevStart, lte: prevEnd },
          status: { not: "cancelled" },
        },
        select: { total: true },
      }),
    ]);

    // Aggregate by day
    const byDayMap = new Map<string, { total: number; count: number }>();
    for (const inv of invoices) {
      const day = formatDate(new Date(inv.date));
      const existing = byDayMap.get(day) ?? { total: 0, count: 0 };
      byDayMap.set(day, {
        total: existing.total + Number(inv.total),
        count: existing.count + 1,
      });
    }

    // Fill missing days between start and end
    const byDay: SalesByDay[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const day = formatDate(cursor);
      const entry = byDayMap.get(day) ?? { total: 0, count: 0 };
      byDay.push({ date: day, ...entry });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Top clients
    const clientMap = new Map<string, { total: number; count: number }>();
    for (const inv of invoices) {
      const name = inv.client?.name ?? "Consumidor Final";
      const existing = clientMap.get(name) ?? { total: 0, count: 0 };
      clientMap.set(name, {
        total: existing.total + Number(inv.total),
        count: existing.count + 1,
      });
    }
    const topClients: TopClient[] = Array.from(clientMap.entries())
      .map(([name, data]) => ({ name, total: data.total, invoiceCount: data.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // By type
    const typeMap = new Map<string, { total: number; count: number }>();
    for (const inv of invoices) {
      const existing = typeMap.get(inv.type) ?? { total: 0, count: 0 };
      typeMap.set(inv.type, {
        total: existing.total + Number(inv.total),
        count: existing.count + 1,
      });
    }
    const byType: InvoiceByType[] = Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, total: data.total, count: data.count }))
      .sort((a, b) => b.total - a.total);

    const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalInvoices = invoices.length;
    const previousPeriodTotal = prevInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    );

    return {
      success: true,
      data: {
        totalSales,
        totalInvoices,
        avgTicket: totalInvoices > 0 ? totalSales / totalInvoices : 0,
        byDay,
        topClients,
        byType,
        previousPeriodTotal,
      },
    };
  } catch (error) {
    console.error("Error en reporte de ventas:", error);
    return { success: false, error: "Error al generar el reporte de ventas" };
  }
}

// ── Treasury Report ────────────────────────────────────

export interface CashFlowDay {
  date: string;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
}

export interface BankBalance {
  bankName: string;
  accountType: string;
  balance: number;
  currency: string;
}

export interface UpcomingCheck {
  id: string;
  type: string;
  bankName: string;
  number: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

export interface TreasuryReportData {
  cashFlowByDay: CashFlowDay[];
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  bankBalances: BankBalance[];
  totalBankBalance: number;
  upcomingChecks: UpcomingCheck[];
}

export async function getTreasuryReport(
  period: string = "month",
  from?: string,
  to?: string
): Promise<ActionResult<TreasuryReportData>> {
  try {
    const { companyId } = await getSession();
    const { start, end } = getPeriodDates(period, from, to);

    const checkDue = new Date();
    checkDue.setDate(checkDue.getDate() + 30);

    const [cashMovements, bankAccounts, checks] = await Promise.all([
      prisma.cashMovement.findMany({
        where: {
          cashRegister: { companyId },
          date: { gte: start, lte: end },
        },
        orderBy: { date: "asc" },
      }),
      prisma.bankAccount.findMany({
        where: { companyId, isActive: true },
        select: { bankName: true, accountType: true, balance: true, currency: true },
      }),
      prisma.check.findMany({
        where: {
          companyId,
          status: "pending",
          dueDate: { lte: checkDue },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    // Aggregate cash flow by day
    const dayMap = new Map<
      string,
      { income: number; expense: number }
    >();
    for (const mov of cashMovements) {
      const day = formatDate(new Date(mov.date));
      const existing = dayMap.get(day) ?? { income: 0, expense: 0 };
      if (mov.type === "income") {
        dayMap.set(day, {
          ...existing,
          income: existing.income + Number(mov.amount),
        });
      } else {
        dayMap.set(day, {
          ...existing,
          expense: existing.expense + Number(mov.amount),
        });
      }
    }

    // Fill days + cumulative
    const cashFlowByDay: CashFlowDay[] = [];
    let cumulative = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const day = formatDate(cursor);
      const entry = dayMap.get(day) ?? { income: 0, expense: 0 };
      const net = entry.income - entry.expense;
      cumulative += net;
      cashFlowByDay.push({ date: day, ...entry, net, cumulative });
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalIncome = cashFlowByDay.reduce((s, d) => s + d.income, 0);
    const totalExpense = cashFlowByDay.reduce((s, d) => s + d.expense, 0);

    const bankBalances: BankBalance[] = bankAccounts.map((acc) => ({
      bankName: acc.bankName,
      accountType: acc.accountType,
      balance: Number(acc.balance),
      currency: acc.currency,
    }));
    const totalBankBalance = bankBalances.reduce((s, b) => s + b.balance, 0);

    const now = new Date();
    const upcomingChecks: UpcomingCheck[] = checks.map((ch) => ({
      id: ch.id,
      type: ch.type,
      bankName: ch.bankName,
      number: ch.number,
      amount: Number(ch.amount),
      dueDate: formatDate(new Date(ch.dueDate)),
      daysUntilDue: Math.ceil(
        (new Date(ch.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    return {
      success: true,
      data: {
        cashFlowByDay,
        totalIncome,
        totalExpense,
        netFlow: totalIncome - totalExpense,
        bankBalances,
        totalBankBalance,
        upcomingChecks,
      },
    };
  } catch (error) {
    console.error("Error en reporte de tesorería:", error);
    return { success: false, error: "Error al generar el reporte de tesorería" };
  }
}

// ── Stock Report ───────────────────────────────────────

export interface StockProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  totalStock: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  stockValue: number;
  isBelowMin: boolean;
}

export interface StockByCategory {
  category: string;
  totalValue: number;
  productCount: number;
}

export interface StockReportData {
  totalStockValue: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  topByValue: StockProduct[];
  lowStock: StockProduct[];
  byCategory: StockByCategory[];
}

export async function getStockReport(): Promise<ActionResult<StockReportData>> {
  try {
    const { companyId } = await getSession();

    const products = await prisma.product.findMany({
      where: { companyId, isActive: true },
      include: {
        category: { select: { name: true } },
        stockLevels: { select: { quantity: true } },
      },
      orderBy: { name: "asc" },
    });

    const stockProducts: StockProduct[] = products.map((p) => {
      const totalStock = p.stockLevels.reduce(
        (sum, sl) => sum + Number(sl.quantity),
        0
      );
      const minStock = Number(p.minStock);
      const costPrice = Number(p.costPrice);
      const salePrice = Number(p.salePrice);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category?.name ?? "Sin categoría",
        totalStock,
        minStock,
        costPrice,
        salePrice,
        stockValue: totalStock * costPrice,
        isBelowMin: minStock > 0 && totalStock <= minStock,
      };
    });

    // By category
    const catMap = new Map<string, { totalValue: number; count: number }>();
    for (const sp of stockProducts) {
      const existing = catMap.get(sp.category) ?? { totalValue: 0, count: 0 };
      catMap.set(sp.category, {
        totalValue: existing.totalValue + sp.stockValue,
        count: existing.count + 1,
      });
    }
    const byCategory: StockByCategory[] = Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        totalValue: data.totalValue,
        productCount: data.count,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return {
      success: true,
      data: {
        totalStockValue: stockProducts.reduce((s, p) => s + p.stockValue, 0),
        totalProducts: stockProducts.length,
        lowStockCount: stockProducts.filter((p) => p.isBelowMin).length,
        outOfStockCount: stockProducts.filter((p) => p.totalStock === 0).length,
        topByValue: [...stockProducts]
          .sort((a, b) => b.stockValue - a.stockValue)
          .slice(0, 10),
        lowStock: stockProducts.filter((p) => p.isBelowMin),
        byCategory,
      },
    };
  } catch (error) {
    console.error("Error en reporte de stock:", error);
    return { success: false, error: "Error al generar el reporte de stock" };
  }
}

// ── CRM Report ─────────────────────────────────────────

export interface TaskByStatus {
  status: string;
  count: number;
}

export interface TaskByPriority {
  priority: string;
  count: number;
}

export interface CrmTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  isOverdue: boolean;
}

export interface CrmReportData {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  byStatus: TaskByStatus[];
  byPriority: TaskByPriority[];
  recentTasks: CrmTask[];
}

export async function getCrmReport(
  period: string = "month",
  from?: string,
  to?: string
): Promise<ActionResult<CrmReportData>> {
  try {
    const { companyId } = await getSession();
    const { start, end } = getPeriodDates(period, from, to);

    const [allTasks, periodTasks] = await Promise.all([
      prisma.crmTask.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.crmTask.findMany({
        where: {
          companyId,
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    const now = new Date();

    // By status
    const statusMap = new Map<string, number>();
    for (const t of periodTasks) {
      statusMap.set(t.status, (statusMap.get(t.status) ?? 0) + 1);
    }
    const byStatus: TaskByStatus[] = Array.from(statusMap.entries()).map(
      ([status, count]) => ({ status, count })
    );

    // By priority
    const prioMap = new Map<string, number>();
    for (const t of periodTasks) {
      prioMap.set(t.priority, (prioMap.get(t.priority) ?? 0) + 1);
    }
    const byPriority: TaskByPriority[] = Array.from(prioMap.entries()).map(
      ([priority, count]) => ({ priority, count })
    );

    const completedTasks = periodTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const overdueTasks = periodTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "completed" &&
        t.status !== "cancelled"
    ).length;

    const recentTasks: CrmTask[] = allTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? formatDate(new Date(t.dueDate)) : null,
      isOverdue:
        !!t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "completed" &&
        t.status !== "cancelled",
    }));

    return {
      success: true,
      data: {
        totalTasks: periodTasks.length,
        completedTasks,
        overdueTasks,
        completionRate:
          periodTasks.length > 0
            ? Math.round((completedTasks / periodTasks.length) * 100)
            : 0,
        byStatus,
        byPriority,
        recentTasks,
      },
    };
  } catch (error) {
    console.error("Error en reporte CRM:", error);
    return { success: false, error: "Error al generar el reporte de CRM" };
  }
}
