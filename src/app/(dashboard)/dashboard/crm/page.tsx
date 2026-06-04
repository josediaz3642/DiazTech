"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import { formatDate } from "@/lib/utils";
import {
  getCrmTasks,
  createCrmTask,
  updateCrmTask,
  deleteCrmTask,
  toggleCrmTaskComplete,
  type CrmTaskFormData,
} from "@/actions/crm";

interface CrmTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  assignedTo: string | null;
  clientId: string | null;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};
const PRIORITY_BADGE: Record<string, string> = {
  low: "inactive",
  medium: "info",
  high: "warning",
  urgent: "danger",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En Progreso",
  completed: "Completada",
  cancelled: "Cancelada",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  in_progress: "info",
  completed: "active",
  cancelled: "inactive",
};

const EMPTY_FORM: CrmTaskFormData = {
  title: "",
  description: "",
  priority: "medium",
  status: "pending",
  dueDate: null,
  assignedTo: null,
  clientId: null,
};

export default function CrmPage() {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CrmTask | null>(null);
  const [formData, setFormData] = useState<CrmTaskFormData>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load tasks ────────────────────────────────────────────────────
  useEffect(() => {
    getCrmTasks().then((result) => {
      if (result.success && result.data) {
        setTasks(result.data as CrmTask[]);
      }
      setLoading(false);
    });
  }, []);

  // ── Filters ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.assignedTo ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      const matchPriority =
        filterPriority === "all" || t.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tasks, search, filterStatus, filterPriority]);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const urgentCount = tasks.filter(
    (t) =>
      (t.priority === "urgent" || t.priority === "high") &&
      t.status !== "completed" &&
      t.status !== "cancelled"
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  // ── Handlers ──────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (task: CrmTask) => {
    setEditing(task);
    setFormData({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority as CrmTaskFormData["priority"],
      status: task.status as CrmTaskFormData["status"],
      dueDate: task.dueDate ?? null,
      assignedTo: task.assignedTo ?? null,
      clientId: task.clientId ?? null,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      showToast("El título es obligatorio", "error");
      return;
    }
    startTransition(async () => {
      const payload: CrmTaskFormData = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      };

      let result;
      if (editing) {
        result = await updateCrmTask(editing.id, payload);
      } else {
        result = await createCrmTask(payload);
      }

      if (result.success) {
        // Refresh list
        const refreshed = await getCrmTasks();
        if (refreshed.success && refreshed.data) {
          setTasks(refreshed.data as CrmTask[]);
        }
        showToast(editing ? "Tarea actualizada ✅" : "Tarea creada ✅");
        setShowModal(false);
      } else {
        showToast(result.error ?? "Error al guardar la tarea", "error");
      }
    });
  };

  const handleToggleComplete = (task: CrmTask) => {
    startTransition(async () => {
      const result = await toggleCrmTaskComplete(task.id);
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status:
                    t.status === "completed" ? "pending" : "completed",
                }
              : t
          )
        );
        showToast(
          task.status === "completed" ? "Tarea reabierta" : "✅ Tarea completada"
        );
      } else {
        showToast(result.error ?? "Error al cambiar estado", "error");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCrmTask(id);
      if (result.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        showToast("Tarea eliminada");
      } else {
        showToast(result.error ?? "Error al eliminar", "error");
      }
      setConfirmDelete(null);
    });
  };

  const today = new Date();
  const getDaysLeft = (dueDate: string | null) => {
    if (!dueDate) return null;
    return Math.ceil(
      (new Date(dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>CRM</h1>
          <p className={s.pageSubtitle}>Tareas, seguimientos y gestión comercial</p>
        </div>
        <button className={s.btnPrimary} onClick={openCreate}>
          + Nueva Tarea
        </button>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📋</div>
          <div className={s.statCardValue}>{loading ? "—" : pendingCount}</div>
          <div className={s.statCardLabel}>Pendientes</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🔄</div>
          <div className={s.statCardValue}>{loading ? "—" : inProgressCount}</div>
          <div className={s.statCardLabel}>En Progreso</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🔥</div>
          <div
            className={`${s.statCardValue} ${urgentCount > 0 ? s.balanceNegative : ""}`}
          >
            {loading ? "—" : urgentCount}
          </div>
          <div className={s.statCardLabel}>Alta Prioridad</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>✅</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>
            {loading ? "—" : completedCount}
          </div>
          <div className={s.statCardLabel}>Completadas</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <span className={s.searchIcon}>🔍</span>
          <input
            type="text"
            className={s.searchInput}
            placeholder="Buscar tarea o responsable..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={s.filterBtn}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className={s.filterBtn}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todas las prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--text-tertiary)" }}>
          Cargando tareas...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {filtered.map((task) => {
            const daysLeft = getDaysLeft(task.dueDate);
            return (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-4)",
                  padding: "var(--space-4)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "var(--radius-lg)",
                  transition: "all 0.15s ease",
                  opacity: task.status === "completed" || task.status === "cancelled" ? 0.6 : 1,
                }}
              >
                {/* Toggle button */}
                <button
                  onClick={() => handleToggleComplete(task)}
                  disabled={isPending}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "var(--radius-full)",
                    border: `2px solid ${task.status === "completed" ? "var(--secondary-500)" : "var(--border-primary)"}`,
                    background: task.status === "completed" ? "var(--secondary-500)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "var(--font-xs)",
                    color: "white",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  {task.status === "completed" ? "✓" : ""}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      textDecoration:
                        task.status === "completed" ? "line-through" : "none",
                      marginBottom: 2,
                    }}
                  >
                    {task.title}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-xs)",
                      color: "var(--text-tertiary)",
                      display: "flex",
                      gap: "var(--space-3)",
                      flexWrap: "wrap",
                    }}
                  >
                    {task.assignedTo && <span>👤 {task.assignedTo}</span>}
                    {task.dueDate && (
                      <span
                        style={{
                          color:
                            daysLeft !== null && daysLeft < 0
                              ? "var(--error-400)"
                              : daysLeft !== null && daysLeft <= 2
                              ? "var(--warning-400)"
                              : "var(--text-tertiary)",
                        }}
                      >
                        📅 {formatDate(task.dueDate)}{" "}
                        {daysLeft !== null && daysLeft < 0
                          ? "(vencida)"
                          : daysLeft === 0
                          ? "(hoy)"
                          : daysLeft !== null && daysLeft <= 3
                          ? `(en ${daysLeft}d)`
                          : ""}
                      </span>
                    )}
                    {task.description && (
                      <span
                        style={{
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        💬 {task.description}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`${s.badge} ${s[PRIORITY_BADGE[task.priority]]}`}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
                <span className={`${s.badge} ${s[STATUS_BADGE[task.status]]}`}>
                  {STATUS_LABELS[task.status]}
                </span>

                <div className={s.cellActions}>
                  <button
                    className={`${s.actionBtn} ${s.edit}`}
                    onClick={() => openEdit(task)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    className={`${s.actionBtn} ${s.delete}`}
                    onClick={() => setConfirmDelete(task.id)}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && !loading && (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>🎯</div>
              <h3 className={s.emptyTitle}>Sin tareas</h3>
              <p className={s.emptyDescription}>
                {search ? "Probá otros términos de búsqueda" : "Creá tu primera tarea de seguimiento"}
              </p>
              <button className={s.btnPrimary} onClick={openCreate}>
                + Nueva Tarea
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {editing ? "Editar Tarea" : "Nueva Tarea"}
              </h2>
              <button
                className={s.modalClose}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Título *</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="Seguimiento presupuesto..."
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    autoFocus
                  />
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Descripción</label>
                  <textarea
                    className={s.formTextarea}
                    placeholder="Detalle de la tarea..."
                    value={formData.description ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Prioridad</label>
                  <select
                    className={s.formSelect}
                    value={formData.priority ?? "medium"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as CrmTaskFormData["priority"],
                      })
                    }
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Estado</label>
                  <select
                    className={s.formSelect}
                    value={formData.status ?? "pending"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as CrmTaskFormData["status"],
                      })
                    }
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Fecha límite</label>
                  <input
                    type="date"
                    className={s.formInput}
                    value={
                      formData.dueDate
                        ? typeof formData.dueDate === "string"
                          ? formData.dueDate.split("T")[0]
                          : new Date(formData.dueDate)
                              .toISOString()
                              .split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dueDate: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Asignado a</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="Nombre del responsable"
                    value={formData.assignedTo ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedTo: e.target.value || null,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setShowModal(false)}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                className={s.btnPrimary}
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending
                  ? "Guardando..."
                  : editing
                  ? "Guardar Cambios"
                  : "Crear Tarea"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className={s.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div
            className={s.modal}
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Eliminar Tarea</h2>
              <button
                className={s.modalClose}
                onClick={() => setConfirmDelete(null)}
              >
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <p style={{ color: "var(--text-secondary)" }}>
                ¿Estás seguro que querés eliminar esta tarea? Esta acción no se
                puede deshacer.
              </p>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setConfirmDelete(null)}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                className={s.btnDanger}
                onClick={() => handleDelete(confirmDelete)}
                disabled={isPending}
              >
                {isPending ? "Eliminando..." : "🗑️ Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${s.toast} ${s[toast.type]}`}>
          <span className={s.toastIcon}>
            {toast.type === "success" ? "✅" : "❌"}
          </span>
          <span className={s.toastMessage}>{toast.message}</span>
          <button className={s.toastClose} onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
