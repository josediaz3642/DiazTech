/**
 * Sistema de permisos granular para GestiónPro.
 * Define qué acciones puede hacer cada rol.
 */

export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "VIEWER";

export type Permission =
  // Usuarios
  | "users:view"
  | "users:invite"
  | "users:edit_role"
  | "users:deactivate"
  // Ajustes / empresa
  | "settings:view"
  | "settings:edit"
  | "settings:afip"
  // Clientes
  | "clients:view"
  | "clients:create"
  | "clients:edit"
  | "clients:delete"
  // Proveedores
  | "suppliers:view"
  | "suppliers:create"
  | "suppliers:edit"
  | "suppliers:delete"
  // Facturación
  | "invoices:view"
  | "invoices:create"
  | "invoices:cancel"
  // Presupuestos
  | "budgets:view"
  | "budgets:create"
  | "budgets:edit"
  | "budgets:delete"
  // Remitos
  | "remitos:view"
  | "remitos:create"
  | "remitos:edit"
  // Recibos
  | "receipts:view"
  | "receipts:create"
  // Stock
  | "stock:view"
  | "stock:create"
  | "stock:edit"
  | "stock:delete"
  | "stock:adjust"
  // Caja
  | "cash:view"
  | "cash:open"
  | "cash:close"
  | "cash:movements"
  // Bancos
  | "banks:view"
  | "banks:create"
  | "banks:movements"
  // Cheques
  | "checks:view"
  | "checks:create"
  | "checks:edit"
  // CRM
  | "crm:view"
  | "crm:create"
  | "crm:edit"
  | "crm:delete"
  // Super Admin
  | "superadmin:access";

// Mapa de permisos por rol (jerárquico)
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "superadmin:access",
    "users:view", "users:invite", "users:edit_role", "users:deactivate",
    "settings:view", "settings:edit", "settings:afip",
    "clients:view", "clients:create", "clients:edit", "clients:delete",
    "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete",
    "invoices:view", "invoices:create", "invoices:cancel",
    "budgets:view", "budgets:create", "budgets:edit", "budgets:delete",
    "remitos:view", "remitos:create", "remitos:edit",
    "receipts:view", "receipts:create",
    "stock:view", "stock:create", "stock:edit", "stock:delete", "stock:adjust",
    "cash:view", "cash:open", "cash:close", "cash:movements",
    "banks:view", "banks:create", "banks:movements",
    "checks:view", "checks:create", "checks:edit",
    "crm:view", "crm:create", "crm:edit", "crm:delete",
  ],

  ADMIN: [
    "users:view", "users:invite", "users:edit_role", "users:deactivate",
    "settings:view", "settings:edit", "settings:afip",
    "clients:view", "clients:create", "clients:edit", "clients:delete",
    "suppliers:view", "suppliers:create", "suppliers:edit", "suppliers:delete",
    "invoices:view", "invoices:create", "invoices:cancel",
    "budgets:view", "budgets:create", "budgets:edit", "budgets:delete",
    "remitos:view", "remitos:create", "remitos:edit",
    "receipts:view", "receipts:create",
    "stock:view", "stock:create", "stock:edit", "stock:delete", "stock:adjust",
    "cash:view", "cash:open", "cash:close", "cash:movements",
    "banks:view", "banks:create", "banks:movements",
    "checks:view", "checks:create", "checks:edit",
    "crm:view", "crm:create", "crm:edit", "crm:delete",
  ],

  MANAGER: [
    "users:view",
    "settings:view",
    "clients:view", "clients:create", "clients:edit",
    "suppliers:view", "suppliers:create", "suppliers:edit",
    "invoices:view", "invoices:create",
    "budgets:view", "budgets:create", "budgets:edit",
    "remitos:view", "remitos:create", "remitos:edit",
    "receipts:view", "receipts:create",
    "stock:view", "stock:create", "stock:edit", "stock:adjust",
    "cash:view", "cash:open", "cash:close", "cash:movements",
    "banks:view", "banks:movements",
    "checks:view", "checks:create", "checks:edit",
    "crm:view", "crm:create", "crm:edit",
  ],

  EMPLOYEE: [
    "clients:view", "clients:create", "clients:edit",
    "suppliers:view",
    "invoices:view", "invoices:create",
    "budgets:view", "budgets:create",
    "remitos:view", "remitos:create",
    "receipts:view", "receipts:create",
    "stock:view", "stock:adjust",
    "cash:view", "cash:movements",
    "banks:view",
    "checks:view",
    "crm:view", "crm:create", "crm:edit",
  ],

  VIEWER: [
    "clients:view",
    "suppliers:view",
    "invoices:view",
    "budgets:view",
    "remitos:view",
    "receipts:view",
    "stock:view",
    "cash:view",
    "banks:view",
    "checks:view",
    "crm:view",
  ],
};

/**
 * Verifica si un rol tiene un permiso determinado.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const normalizedRole = role as Role;
  const permissions = ROLE_PERMISSIONS[normalizedRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Verifica si un rol tiene TODOS los permisos listados.
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Verifica si un rol tiene AL MENOS UNO de los permisos listados.
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Retorna true si el rol puede gestionar usuarios (invitar, cambiar roles).
 */
export function canManageUsers(role: string): boolean {
  return hasPermission(role, "users:invite");
}

/**
 * Retorna true si el rol puede ver/editar ajustes de empresa.
 */
export function canManageSettings(role: string): boolean {
  return hasPermission(role, "settings:edit");
}

/**
 * Label legible para cada rol.
 */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Empleado",
  VIEWER: "Visualizador",
};

/**
 * Color de badge para cada rol.
 */
export const ROLE_BADGE_CLASS: Record<Role, string> = {
  SUPER_ADMIN: "danger",
  ADMIN: "primary",
  MANAGER: "info",
  EMPLOYEE: "active",
  VIEWER: "inactive",
};
