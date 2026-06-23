"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export interface FinancialInsight {
  type: "danger" | "warning" | "success" | "info";
  title: string;
  description: string;
  value?: string;
  href?: string;
}

export interface CashFlowPrediction {
  incomingChecks7: number;
  incomingChecks30: number;
  outgoingChecks7: number;
  outgoingChecks30: number;
  pendingCollections: number;
  netFlow7: number;
  netFlow30: number;
}

export interface HealthScore {
  score: number; // 0-100
  label: "Crítico" | "Regular" | "Bueno" | "Excelente";
  color: string;
  breakdown: { label: string; score: number; weight: number }[];
}

export interface AIInsightsData {
  healthScore: HealthScore;
  insights: FinancialInsight[];
  cashFlowPrediction: CashFlowPrediction;
  bestDayOfWeek: string | null;
  worstDayOfWeek: string | null;
  topClientAlert: string | null;
}

function dayName(d: number): string {
  return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][d];
}

export async function getAIInsights(): Promise<{ success: boolean; data?: AIInsightsData; error?: string }> {
  try {
    const { companyId } = await getSession();

    const now = new Date();
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);
    const last60 = new Date(now);
    last60.setDate(last60.getDate() - 60);
    const last15 = new Date(now);
    last15.setDate(last15.getDate() - 15);

    // Run all queries in parallel
    const [
      recentInvoices,
      prevPeriodInvoices,
      pendingInvoices,
      lowStockProducts,
      upcomingChecksIn,
      upcomingChecksOut,
      bankAccounts,
      topClients,
      recentTopClient,
    ] = await Promise.all([
      // Last 30 days invoices
      prisma.invoice.findMany({
        where: { companyId, date: { gte: last30 }, status: { not: "cancelled" } },
        select: { total: true, date: true, clientId: true },
      }),
      // 30-60 days ago invoices (previous period)
      prisma.invoice.findMany({
        where: { companyId, date: { gte: last60, lt: last30 }, status: { not: "cancelled" } },
        select: { total: true },
      }),
      // Pending invoices
      prisma.invoice.count({ where: { companyId, status: "pending" } }),
      // Low stock
      prisma.product.findMany({
        where: { companyId, isActive: true, minStock: { gt: 0 } },
        include: { stockLevels: { select: { quantity: true } } },
      }),
      // Incoming checks next 30 days
      prisma.check.findMany({
        where: { companyId, type: "received", status: "pending", dueDate: { lte: in30 } },
        select: { amount: true, dueDate: true },
      }),
      // Outgoing checks next 30 days
      prisma.check.findMany({
        where: { companyId, type: "issued", status: "pending", dueDate: { lte: in30 } },
        select: { amount: true, dueDate: true },
      }),
      // Bank accounts
      prisma.bankAccount.findMany({
        where: { companyId, isActive: true },
        select: { balance: true, currency: true },
      }),
      // Top 3 clients by total in last 30 days
      prisma.invoice.groupBy({
        by: ["clientId"],
        where: { companyId, date: { gte: last30 }, status: { not: "cancelled" }, clientId: { not: null } },
        _sum: { total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 3,
      }),
      // Top client last purchase (last 15 days)
      prisma.invoice.findFirst({
        where: { companyId, date: { gte: last15 }, status: { not: "cancelled" } },
        orderBy: { total: "desc" },
        include: { client: { select: { name: true } } },
      }),
    ]);

    // ── Compute metrics ──────────────────────────────────────────

    const currentTotal = recentInvoices.reduce((s, i) => s + Number(i.total), 0);
    const prevTotal = prevPeriodInvoices.reduce((s, i) => s + Number(i.total), 0);
    const salesGrowth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

    const lowStockCount = lowStockProducts.filter((p) => {
      const qty = p.stockLevels.reduce((s, sl) => s + Number(sl.quantity), 0);
      return qty <= Number(p.minStock);
    }).length;

    const totalBankArs = bankAccounts
      .filter((a) => a.currency === "ARS")
      .reduce((s, a) => s + Number(a.balance), 0);

    // Best/worst day of week by sales
    const dayTotals: Record<number, number> = {};
    for (const inv of recentInvoices) {
      const d = new Date(inv.date).getDay();
      dayTotals[d] = (dayTotals[d] ?? 0) + Number(inv.total);
    }
    const dayEntries = Object.entries(dayTotals).map(([d, t]) => ({ day: Number(d), total: t }));
    const bestDay = dayEntries.sort((a, b) => b.total - a.total)[0];
    const worstDay = dayEntries.sort((a, b) => a.total - b.total)[0];

    // Cash flow prediction
    const inChecks7 = upcomingChecksIn
      .filter((c) => c.dueDate <= in7)
      .reduce((s, c) => s + Number(c.amount), 0);
    const inChecks30 = upcomingChecksIn.reduce((s, c) => s + Number(c.amount), 0);
    const outChecks7 = upcomingChecksOut
      .filter((c) => c.dueDate <= in7)
      .reduce((s, c) => s + Number(c.amount), 0);
    const outChecks30 = upcomingChecksOut.reduce((s, c) => s + Number(c.amount), 0);

    // ── Health Score ─────────────────────────────────────────────

    // 4 components, each 0-25 points
    const s1 = Math.min(25, Math.max(0, 25 - lowStockCount * 3)); // stock health
    const s2 = Math.min(25, Math.max(0, pendingInvoices === 0 ? 25 : 25 - pendingInvoices * 2)); // invoice health
    const s3 = Math.min(25, Math.max(0, salesGrowth >= 0 ? 25 : 25 + salesGrowth / 2)); // sales trend
    const s4 = Math.min(25, Math.max(0, totalBankArs > 0 ? 25 : 10)); // bank balance

    const score = Math.round(s1 + s2 + s3 + s4);
    const label: HealthScore["label"] =
      score >= 80 ? "Excelente" : score >= 60 ? "Bueno" : score >= 40 ? "Regular" : "Crítico";
    const color =
      score >= 80 ? "#6CA28A" : score >= 60 ? "#E2B83E" : score >= 40 ? "#E07A5F" : "#D9383A";

    const healthScore: HealthScore = {
      score,
      label,
      color,
      breakdown: [
        { label: "Stock", score: Math.round(s1), weight: 25 },
        { label: "Cobranzas", score: Math.round(s2), weight: 25 },
        { label: "Tendencia ventas", score: Math.round(s3), weight: 25 },
        { label: "Liquidez bancaria", score: Math.round(s4), weight: 25 },
      ],
    };

    // ── Insights ─────────────────────────────────────────────────

    const insights: FinancialInsight[] = [];

    if (salesGrowth <= -15) {
      insights.push({
        type: "danger",
        title: "Caída significativa de ventas",
        description: `Las ventas de los últimos 30 días cayeron un ${Math.abs(salesGrowth).toFixed(0)}% respecto al período anterior.`,
        value: `−${Math.abs(salesGrowth).toFixed(0)}%`,
        href: "/dashboard/reportes/ventas",
      });
    } else if (salesGrowth >= 15) {
      insights.push({
        type: "success",
        title: "Ventas en crecimiento",
        description: `Las ventas crecieron un ${salesGrowth.toFixed(0)}% respecto al período anterior. ¡Excelente momento!`,
        value: `+${salesGrowth.toFixed(0)}%`,
        href: "/dashboard/reportes/ventas",
      });
    }

    if (lowStockCount > 0) {
      insights.push({
        type: lowStockCount > 5 ? "danger" : "warning",
        title: `${lowStockCount} producto${lowStockCount > 1 ? "s" : ""} bajo stock mínimo`,
        description: `Reponés estos artículos antes de que afecten las ventas.`,
        value: `${lowStockCount} items`,
        href: "/dashboard/stock",
      });
    }

    if (pendingInvoices > 0) {
      insights.push({
        type: "warning",
        title: "Facturas pendientes de cobro",
        description: `Tenés ${pendingInvoices} factura${pendingInvoices > 1 ? "s" : ""} pendiente${pendingInvoices > 1 ? "s" : ""}. Recordá gestionar el cobro.`,
        value: `${pendingInvoices} facturas`,
        href: "/dashboard/facturacion",
      });
    }

    if (outChecks7 > 0) {
      insights.push({
        type: "warning",
        title: "Cheques a pagar en 7 días",
        description: `Deberás pagar $${outChecks7.toLocaleString("es-AR", { maximumFractionDigits: 0 })} en cheques en la próxima semana.`,
        value: `$${(outChecks7 / 1000).toFixed(0)}K`,
        href: "/dashboard/cheques",
      });
    }

    if (inChecks7 > 0) {
      insights.push({
        type: "info",
        title: "Cheques a cobrar en 7 días",
        description: `Recibirás $${inChecks7.toLocaleString("es-AR", { maximumFractionDigits: 0 })} en cheques de terceros esta semana.`,
        value: `$${(inChecks7 / 1000).toFixed(0)}K`,
        href: "/dashboard/cheques",
      });
    }

    if (totalBankArs > 0) {
      insights.push({
        type: "success",
        title: "Liquidez bancaria",
        description: `Saldo total en cuentas ARS: $${totalBankArs.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
        value: `$${(totalBankArs / 1000).toFixed(0)}K`,
        href: "/dashboard/bancos",
      });
    }

    // Top client alert — who has NOT bought in last 15 days
    let topClientAlert: string | null = null;
    if (topClients.length > 0 && topClients[0].clientId) {
      const topClientId = topClients[0].clientId;
      const lastPurchase = await prisma.invoice.findFirst({
        where: { companyId, clientId: topClientId, status: { not: "cancelled" } },
        orderBy: { date: "desc" },
        include: { client: { select: { name: true } } },
      });
      if (lastPurchase) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastPurchase.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince > 14) {
          topClientAlert = `${lastPurchase.client?.name ?? "Tu mejor cliente"} no compra hace ${daysSince} días.`;
          insights.push({
            type: "info",
            title: "Seguimiento de cliente top",
            description: topClientAlert,
            href: "/dashboard/clientes",
          });
        }
      }
    }

    const cashFlowPrediction: CashFlowPrediction = {
      incomingChecks7: inChecks7,
      incomingChecks30: inChecks30,
      outgoingChecks7: outChecks7,
      outgoingChecks30: outChecks30,
      pendingCollections: 0,
      netFlow7: inChecks7 - outChecks7,
      netFlow30: inChecks30 - outChecks30,
    };

    return {
      success: true,
      data: {
        healthScore,
        insights,
        cashFlowPrediction,
        bestDayOfWeek: bestDay ? dayName(bestDay.day) : null,
        worstDayOfWeek: worstDay && worstDay.day !== bestDay?.day ? dayName(worstDay.day) : null,
        topClientAlert,
      },
    };
  } catch (error) {
    console.error("Error en AI Insights:", error);
    return { success: false, error: "Error al calcular los insights" };
  }
}
