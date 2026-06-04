"use client";

import { useState, useEffect, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import {
  getCompanyUsers,
  inviteUser,
  updateUserRole,
  removeUser,
  type InviteUserInput,
} from "@/actions/users";
import {
  ROLE_LABELS,
  ROLE_BADGE_CLASS,
  canManageUsers,
} from "@/lib/permissions";
import { useSession } from "next-auth/react";

type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "VIEWER";
type AssignableRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "VIEWER";


interface CompanyUser {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: Role;
  isActive: boolean;
  permissions: string[];
  joinedAt: Date;
  userCreatedAt: Date;
}

const EMPTY_INVITE: InviteUserInput = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "EMPLOYEE",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteUserInput>(EMPTY_INVITE);
  const [editingRole, setEditingRole] = useState<{
    membershipId: string;
    currentRole: Role;
  } | null>(null);
  const [newRole, setNewRole] = useState<AssignableRole>("EMPLOYEE");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Determine current user's role for permission checks
  // We use the session to guard actions, but real enforcement is on the server
  const sessionRole = (session?.user as { role?: string })?.role ?? "VIEWER";
  const canManage = canManageUsers(sessionRole);

  // ── Load users ────────────────────────────────────────────────────
  const loadUsers = () => {
    setLoading(true);
    getCompanyUsers().then((result) => {
      if (result.success && result.data) {
        setUsers(result.data as CompanyUser[]);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ── Invite user ───────────────────────────────────────────────────
  const handleInvite = () => {
    if (!inviteForm.name.trim()) {
      showToast("El nombre es obligatorio", "error");
      return;
    }
    if (!inviteForm.email.trim() || !inviteForm.email.includes("@")) {
      showToast("Email inválido", "error");
      return;
    }
    if (!inviteForm.password || inviteForm.password.length < 8) {
      showToast("La contraseña debe tener al menos 8 caracteres", "error");
      return;
    }

    startTransition(async () => {
      const result = await inviteUser(inviteForm);
      if (result.success) {
        showToast("Usuario invitado correctamente ✅");
        setShowInviteModal(false);
        setInviteForm(EMPTY_INVITE);
        loadUsers();
      } else {
        showToast(result.error ?? "Error al invitar usuario", "error");
      }
    });
  };

  // ── Update role ───────────────────────────────────────────────────
  const handleUpdateRole = () => {
    if (!editingRole) return;
    startTransition(async () => {
      const result = await updateUserRole(editingRole.membershipId, newRole);
      if (result.success) {
        showToast("Rol actualizado ✅");
        setEditingRole(null);
        loadUsers();
      } else {
        showToast(result.error ?? "Error al actualizar rol", "error");
      }
    });
  };

  // ── Remove user ───────────────────────────────────────────────────
  const handleRemove = (membershipId: string) => {
    startTransition(async () => {
      const result = await removeUser(membershipId);
      if (result.success) {
        showToast("Usuario desactivado");
        setConfirmRemove(null);
        loadUsers();
      } else {
        showToast(result.error ?? "Error al desactivar usuario", "error");
      }
    });
  };

  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Usuarios</h1>
          <p className={s.pageSubtitle}>
            Gestión de usuarios y permisos de acceso
          </p>
        </div>
        {canManage && (
          <button
            className={s.btnPrimary}
            onClick={() => setShowInviteModal(true)}
          >
            + Invitar Usuario
          </button>
        )}
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>👥</div>
          <div className={s.statCardValue}>
            {loading ? "—" : activeUsers.length}
          </div>
          <div className={s.statCardLabel}>Usuarios Activos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🔑</div>
          <div className={s.statCardValue}>{Object.keys(ROLE_LABELS).length - 1}</div>
          <div className={s.statCardLabel}>Roles Disponibles</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🟢</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>
            {loading ? "—" : activeUsers.length}
          </div>
          <div className={s.statCardLabel}>Habilitados</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🔒</div>
          <div className={s.statCardValue}>
            {loading ? "—" : inactiveUsers.length}
          </div>
          <div className={s.statCardLabel}>Desactivados</div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-10)",
            color: "var(--text-tertiary)",
          }}
        >
          Cargando usuarios...
        </div>
      ) : (
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Miembro desde</th>
                {canManage && (
                  <th style={{ textAlign: "right" }}>Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 6 : 5}
                    style={{ textAlign: "center", color: "var(--text-tertiary)" }}
                  >
                    No hay usuarios en la empresa
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.membershipId}
                    style={{ opacity: user.isActive ? 1 : 0.55 }}
                  >
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "var(--radius-full)",
                            background:
                              "linear-gradient(135deg, var(--primary-600), var(--primary-400))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "var(--font-sm)",
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div className={s.cellMain}>{user.name}</div>
                          {user.phone && (
                            <div
                              style={{
                                fontSize: "var(--font-xs)",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {user.email}
                    </td>
                    <td>
                      <span
                        className={`${s.badge} ${s[ROLE_BADGE_CLASS[user.role] ?? "inactive"]}`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${s.badge} ${user.isActive ? s.active : s.inactive}`}
                      >
                        {user.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "var(--text-tertiary)",
                        fontSize: "var(--font-sm)",
                      }}
                    >
                      {new Date(user.joinedAt).toLocaleDateString("es-AR")}
                    </td>
                    {canManage && (
                      <td>
                        <div className={s.cellActions}>
                          <button
                            className={`${s.actionBtn} ${s.edit}`}
                            title="Cambiar rol"
                            onClick={() => {
                              setEditingRole({
                                membershipId: user.membershipId,
                                currentRole: user.role,
                              });
                              setNewRole(user.role as AssignableRole);
                            }}
                          >
                            🔑
                          </button>
                          {user.isActive && (
                            <button
                              className={`${s.actionBtn} ${s.delete}`}
                              title="Desactivar"
                              onClick={() => setConfirmRemove(user.membershipId)}
                            >
                              🔒
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Roles reference */}
      <h2
        style={{
          fontSize: "var(--font-lg)",
          fontWeight: 700,
          marginTop: "var(--space-8)",
          marginBottom: "var(--space-4)",
        }}
      >
        Roles y Permisos
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {(
          Object.entries(ROLE_LABELS).filter(
            ([role]) => role !== "SUPER_ADMIN"
          ) as [Role, string][]
        ).map(([role, label]) => (
          <div
            key={role}
            className={s.statCard}
            style={{ padding: "var(--space-5)" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-3)",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>
                {label}
              </span>
              <span className={`${s.badge} ${s[ROLE_BADGE_CLASS[role]]}`}>
                {role}
              </span>
            </div>
            <div
              style={{
                fontSize: "var(--font-xs)",
                color: "var(--text-tertiary)",
              }}
            >
              {users.filter((u) => u.role === role && u.isActive).length} usuario
              {users.filter((u) => u.role === role && u.isActive).length !== 1
                ? "s"
                : ""}{" "}
              activo
              {users.filter((u) => u.role === role && u.isActive).length !== 1
                ? "s"
                : ""}
            </div>
          </div>
        ))}
      </div>

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <div
          className={s.modalOverlay}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className={s.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Invitar Usuario</h2>
              <button
                className={s.modalClose}
                onClick={() => setShowInviteModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Nombre completo *</label>
                  <input
                    type="text"
                    className={s.formInput}
                    value={inviteForm.name}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, name: e.target.value })
                    }
                    placeholder="Juan Pérez"
                    autoFocus
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Email *</label>
                  <input
                    type="email"
                    className={s.formInput}
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, email: e.target.value })
                    }
                    placeholder="juan@empresa.com"
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Contraseña inicial *</label>
                  <input
                    type="password"
                    className={s.formInput}
                    value={inviteForm.password}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, password: e.target.value })
                    }
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Teléfono</label>
                  <input
                    type="tel"
                    className={s.formInput}
                    value={inviteForm.phone ?? ""}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, phone: e.target.value })
                    }
                    placeholder="Opcional"
                  />
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Rol</label>
                  <select
                    className={s.formSelect}
                    value={inviteForm.role ?? "EMPLOYEE"}
                    onChange={(e) =>
                      setInviteForm({
                        ...inviteForm,
                        role: e.target.value as InviteUserInput["role"],
                      })
                    }
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="MANAGER">Gerente</option>
                    <option value="EMPLOYEE">Empleado</option>
                    <option value="VIEWER">Visualizador</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginTop: "var(--space-3)",
                  padding: "var(--space-3)",
                  background: "rgba(99,102,241,0.07)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-xs)",
                  color: "var(--text-tertiary)",
                }}
              >
                💡 El usuario podrá cambiar su contraseña desde su perfil.
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setShowInviteModal(false)}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                className={s.btnPrimary}
                onClick={handleInvite}
                disabled={isPending}
              >
                {isPending ? "Invitando..." : "✉️ Invitar Usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Role Modal ── */}
      {editingRole && (
        <div
          className={s.modalOverlay}
          onClick={() => setEditingRole(null)}
        >
          <div
            className={s.modal}
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Cambiar Rol</h2>
              <button
                className={s.modalClose}
                onClick={() => setEditingRole(null)}
              >
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <p
                style={{
                  color: "var(--text-secondary)",
                  marginBottom: "var(--space-4)",
                  fontSize: "var(--font-sm)",
                }}
              >
                Seleccioná el nuevo rol para este usuario:
              </p>
              <select
                className={s.formSelect}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AssignableRole)}
              >
                <option value="ADMIN">Administrador</option>
                <option value="MANAGER">Gerente</option>
                <option value="EMPLOYEE">Empleado</option>
                <option value="VIEWER">Visualizador</option>
              </select>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setEditingRole(null)}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                className={s.btnPrimary}
                onClick={handleUpdateRole}
                disabled={isPending}
              >
                {isPending ? "Guardando..." : "Cambiar Rol"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Remove Modal ── */}
      {confirmRemove && (
        <div
          className={s.modalOverlay}
          onClick={() => setConfirmRemove(null)}
        >
          <div
            className={s.modal}
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Desactivar Usuario</h2>
              <button
                className={s.modalClose}
                onClick={() => setConfirmRemove(null)}
              >
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <p style={{ color: "var(--text-secondary)" }}>
                ¿Estás seguro que querés desactivar este usuario? El usuario no
                podrá iniciar sesión hasta que sea reactivado por un
                administrador.
              </p>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setConfirmRemove(null)}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                className={s.btnDanger}
                onClick={() => handleRemove(confirmRemove)}
                disabled={isPending}
              >
                {isPending ? "Desactivando..." : "🔒 Desactivar"}
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
