"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export interface AgendaEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: "check_in" | "check_out" | "invoice" | "crm";
  title: string;
  amount?: number;
  currency?: string;
  urgency: "high" | "medium" | "low";
  href: string;
  daysFromToday: number;
}

export interface AgendaData {
  events: AgendaEvent[];
  totalUpcoming7: number;
  totalUpcoming30: number;
  criticalCount: number;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getAgendaEvents(
  fromDate?: string,
  toDate?: string
): Promise<{ success: boolean; data?: AgendaData; error?: string }> {
  try {
    const { companyId } = await getSession();

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = fromDate ? new Date(fromDate) : now;
    const end = toDate ? new Date(toDate) : (() => { const d = new Date(now); d.setDate(d.getDate() + 60); return d; })();

    const [checks, invoices, crmTasks] = await Promise.all([
      prisma.check.findMany({
        where: {
          companyId,
          status: "pending",
          dueDate: { gte: start, lte: end },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.invoice.findMany({
        where: {
          companyId,
          status: "pending",
          dueDate: { gte: start, lte: end },
        },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 30,
      }),
      prisma.crmTask.findMany({
        where: {
          companyId,
          status: { in: ["pending", "in_progress"] },
          dueDate: { gte: start, lte: end },
        },
        orderBy: { dueDate: "asc" },
        take: 30,
      }),
    ]);

    const events: AgendaEvent[] = [];

    // Checks
    for (const ch of checks) {
      const daysFromToday = Math.ceil(
        (new Date(ch.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const urgency = daysFromToday <= 2 ? "high" : daysFromToday <= 7 ? "medium" : "low";
      events.push({
        id: ch.id,
        date: dateStr(new Date(ch.dueDate)),
        type: ch.type === "received" ? "check_in" : "check_out",
        title:
          ch.type === "received"
            ? `Cheque a cobrar — ${ch.bankName} #${ch.number}`
            : `Cheque a pagar — ${ch.bankName} #${ch.number}`,
        amount: Number(ch.amount),
        currency: ch.currency,
        urgency,
        href: "/dashboard/cheques",
        daysFromToday,
      });
    }

    // Pending invoices with due date
    for (const inv of invoices) {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
      const daysFromToday = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const urgency = daysFromToday < 0 ? "high" : daysFromToday <= 7 ? "medium" : "low";
      events.push({
        id: inv.id,
        date: dateStr(dueDate),
        type: "invoice",
        title: `Factura ${inv.type} — ${inv.client?.name ?? "Consumidor Final"}`,
        amount: Number(inv.total),
        currency: inv.currency,
        urgency: daysFromToday < 0 ? "high" : urgency,
        href: "/dashboard/facturacion",
        daysFromToday,
      });
    }

    // CRM Tasks
    for (const task of crmTasks) {
      if (!task.dueDate) continue;
      const daysFromToday = Math.ceil(
        (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const urgency =
        task.priority === "urgent" || daysFromToday <= 0
          ? "high"
          : task.priority === "high" || daysFromToday <= 3
          ? "medium"
          : "low";
      events.push({
        id: task.id,
        date: dateStr(new Date(task.dueDate)),
        type: "crm",
        title: task.title,
        urgency,
        href: "/dashboard/crm",
        daysFromToday,
      });
    }

    // Sort by date
    events.sort((a, b) => a.date.localeCompare(b.date));

    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    return {
      success: true,
      data: {
        events,
        totalUpcoming7: events.filter((e) => e.daysFromToday <= 7).length,
        totalUpcoming30: events.filter((e) => e.daysFromToday <= 30).length,
        criticalCount: events.filter((e) => e.urgency === "high").length,
      },
    };
  } catch (error) {
    console.error("Error en agenda:", error);
    return { success: false, error: "Error al obtener la agenda" };
  }
}
