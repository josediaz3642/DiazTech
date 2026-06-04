"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

// ─── Types ───────────────────────────────────────────────────────────

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Guard: only SUPER_ADMIN (isGlobalAdmin) can call these actions
async function requireSuperAdmin() {
  const session = await getSession();
  if (!session.isGlobalAdmin) {
    throw new Error("Acceso denegado: se requiere Super Admin");
  }
  return session;
}

// ─── getAllCompanies ──────────────────────────────────────────────────

export async function getAllCompanies(): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const companies = await prisma.company.findMany({
      include: {
        memberships: {
          where: { isActive: true },
          select: { id: true, role: true },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
            trialEnd: true,
            currentPeriodEnd: true,
          },
        },
        _count: {
          select: {
            clients: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = companies.map((c) => ({
      id: c.id,
      name: c.name,
      fantasyName: c.fantasyName,
      cuit: c.cuit,
      email: c.email,
      phone: c.phone,
      taxCategory: c.taxCategory,
      afipEnvironment: c.afipEnvironment,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      userCount: c.memberships.length,
      adminCount: c.memberships.filter((m) => m.role === "ADMIN").length,
      clientCount: c._count.clients,
      invoiceCount: c._count.invoices,
      subscription: c.subscription ?? null,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error al obtener empresas:", error);
    return { success: false, error: "Error al obtener las empresas" };
  }
}

// ─── getCompanyDetail ─────────────────────────────────────────────────

export async function getCompanyDetail(companyId: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
        },
        subscription: true,
        _count: {
          select: {
            clients: true,
            suppliers: true,
            products: true,
            invoices: true,
            budgets: true,
            remitos: true,
            cashRegisters: true,
            bankAccounts: true,
            checks: true,
            crmTasks: true,
          },
        },
      },
    });

    if (!company) {
      return { success: false, error: "Empresa no encontrada" };
    }

    return { success: true, data: company };
  } catch (error) {
    console.error("Error al obtener detalle de empresa:", error);
    return { success: false, error: "Error al obtener el detalle de la empresa" };
  }
}

// ─── getGlobalStats ───────────────────────────────────────────────────

export async function getGlobalStats(): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const [
      totalCompanies,
      totalUsers,
      activeSubscriptions,
      trialSubscriptions,
      totalInvoices,
      totalClients,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "active", plan: { not: "trial" } } }),
      prisma.subscription.count({ where: { plan: "trial" } }),
      prisma.invoice.count(),
      prisma.client.count(),
    ]);

    // Subscriptions by plan
    const subscriptionsByPlan = await prisma.subscription.groupBy({
      by: ["plan"],
      _count: { id: true },
    });

    // New companies last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCompaniesLast30 = await prisma.company.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // New companies last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newCompaniesLast7 = await prisma.company.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    return {
      success: true,
      data: {
        totalCompanies,
        totalUsers,
        activeSubscriptions,
        trialSubscriptions,
        totalInvoices,
        totalClients,
        newCompaniesLast30,
        newCompaniesLast7,
        subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
          plan: s.plan,
          count: s._count.id,
        })),
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas globales:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas del sistema",
    };
  }
}

// ─── updateSubscription ───────────────────────────────────────────────

export async function updateSubscription(
  companyId: string,
  data: {
    plan: string;
    status: string;
    trialEnd?: string | null;
    currentPeriodEnd?: string | null;
  }
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const existing = await prisma.subscription.findUnique({
      where: { companyId },
    });

    let subscription;
    if (existing) {
      subscription = await prisma.subscription.update({
        where: { companyId },
        data: {
          plan: data.plan,
          status: data.status,
          trialEnd: data.trialEnd ? new Date(data.trialEnd) : null,
          currentPeriodEnd: data.currentPeriodEnd
            ? new Date(data.currentPeriodEnd)
            : null,
        },
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          companyId,
          plan: data.plan,
          status: data.status,
          trialEnd: data.trialEnd ? new Date(data.trialEnd) : null,
          currentPeriodEnd: data.currentPeriodEnd
            ? new Date(data.currentPeriodEnd)
            : null,
        },
      });
    }

    return { success: true, data: subscription };
  } catch (error) {
    console.error("Error al actualizar suscripción:", error);
    return {
      success: false,
      error: "Error al actualizar la suscripción",
    };
  }
}

// ─── getAuditLogs ─────────────────────────────────────────────────────

export async function getAuditLogs(options?: {
  companyId?: string;
  userId?: string;
  action?: string;
  entity?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const where: Record<string, unknown> = {};
    if (options?.companyId) where.companyId = options.companyId;
    if (options?.userId) where.userId = options.userId;
    if (options?.action) where.action = options.action;
    if (options?.entity) where.entity = options.entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          company: {
            select: { id: true, name: true, fantasyName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { success: true, data: { logs, total } };
  } catch (error) {
    console.error("Error al obtener audit logs:", error);
    return { success: false, error: "Error al obtener el log de auditoría" };
  }
}

// ─── getAllUsers ──────────────────────────────────────────────────────

export async function getAllUsers(): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const users = await prisma.user.findMany({
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            company: { select: { id: true, name: true, fantasyName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      isGlobalAdmin: u.isGlobalAdmin,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      companies: u.memberships.map((m) => ({
        companyId: m.companyId,
        companyName: m.company.fantasyName ?? m.company.name,
        role: m.role,
      })),
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error al obtener usuarios globales:", error);
    return { success: false, error: "Error al obtener los usuarios" };
  }
}
