"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────

export type CrmTaskFormData = {
  title: string;
  description?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  dueDate?: Date | string | null;
  assignedTo?: string | null;
  clientId?: string | null;
};

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ─── GET ALL ─────────────────────────────────────────────────────

export async function getCrmTasks(): Promise<ActionResult> {
  try {
    const session = await getSession();

    const tasks = await prisma.crmTask.findMany({
      where: { companyId: session.companyId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: tasks };
  } catch (error) {
    console.error("Error al obtener tareas CRM:", error);
    return {
      success: false,
      error: "Error al obtener la lista de tareas",
    };
  }
}

// ─── CREATE ──────────────────────────────────────────────────────

export async function createCrmTask(
  data: CrmTaskFormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    const task = await prisma.crmTask.create({
      data: {
        companyId: session.companyId,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? "medium",
        status: data.status ?? "pending",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedTo: data.assignedTo ?? null,
        clientId: data.clientId ?? null,
      },
    });

    revalidatePath("/crm");
    return { success: true, data: task };
  } catch (error) {
    console.error("Error al crear tarea CRM:", error);
    return { success: false, error: "Error al crear la tarea" };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────

export async function updateCrmTask(
  id: string,
  data: CrmTaskFormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    const existing = await prisma.crmTask.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Tarea no encontrada" };
    }

    const task = await prisma.crmTask.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? "medium",
        status: data.status ?? existing.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedTo: data.assignedTo ?? null,
        clientId: data.clientId ?? null,
      },
    });

    revalidatePath("/crm");
    return { success: true, data: task };
  } catch (error) {
    console.error("Error al actualizar tarea CRM:", error);
    return { success: false, error: "Error al actualizar la tarea" };
  }
}

// ─── DELETE ──────────────────────────────────────────────────────

export async function deleteCrmTask(id: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    const existing = await prisma.crmTask.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Tarea no encontrada" };
    }

    await prisma.crmTask.delete({
      where: { id },
    });

    revalidatePath("/crm");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar tarea CRM:", error);
    return { success: false, error: "Error al eliminar la tarea" };
  }
}

// ─── TOGGLE COMPLETE ─────────────────────────────────────────────

export async function toggleCrmTaskComplete(
  id: string
): Promise<ActionResult> {
  try {
    const session = await getSession();

    const existing = await prisma.crmTask.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!existing) {
      return { success: false, error: "Tarea no encontrada" };
    }

    const newStatus =
      existing.status === "completed" ? "pending" : "completed";

    const task = await prisma.crmTask.update({
      where: { id },
      data: { status: newStatus },
    });

    revalidatePath("/crm");
    return { success: true, data: task };
  } catch (error) {
    console.error("Error al cambiar estado de tarea CRM:", error);
    return {
      success: false,
      error: "Error al cambiar el estado de la tarea",
    };
  }
}

// ─── STATS ───────────────────────────────────────────────────────

export async function getCrmStats(): Promise<ActionResult> {
  try {
    const session = await getSession();
    const companyId = session.companyId;

    const [pending, inProgress, urgent, completed] = await Promise.all([
      prisma.crmTask.count({
        where: { companyId, status: "pending" },
      }),
      prisma.crmTask.count({
        where: { companyId, status: "in_progress" },
      }),
      prisma.crmTask.count({
        where: { companyId, priority: "urgent", status: { not: "completed" } },
      }),
      prisma.crmTask.count({
        where: { companyId, status: "completed" },
      }),
    ]);

    return {
      success: true,
      data: {
        pending,
        inProgress,
        urgent,
        completed,
      },
    };
  } catch (error) {
    console.error("Error al obtener estadísticas CRM:", error);
    return {
      success: false,
      error: "Error al obtener las estadísticas de CRM",
    };
  }
}
