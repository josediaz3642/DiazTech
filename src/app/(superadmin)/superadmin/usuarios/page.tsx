"use client";

import { useEffect, useState } from "react";
import styles from "../superadmin.module.css";
import s from "@/styles/module-page.module.css";
import { getAllUsers } from "@/actions/superadmin";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isGlobalAdmin: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  companies: { companyId: string; companyName: string; role: string }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("all");

  useEffect(() => {
    getAllUsers().then((result) => {
      if (result.success && result.data) {
        setUsers(result.data as UserRow[]);
      }
      setLoading(false);
    });
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchAdmin =
      filterAdmin === "all" ||
      (filterAdmin === "super" && u.isGlobalAdmin) ||
      (filterAdmin === "regular" && !u.isGlobalAdmin);
    return matchSearch && matchAdmin;
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1
            className={s.pageTitle}
            style={{
              background: "linear-gradient(135deg, #c4b5fd, #a5b4fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Usuarios Globales
          </h1>
          <p className={s.pageSubtitle}>
            Todos los usuarios del sistema — {loading ? "..." : users.length} registrados
          </p>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>👤</div>
          <div className={s.statCardValue}>{loading ? "—" : users.length}</div>
          <div className={s.statCardLabel}>Usuarios Totales</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>👑</div>
          <div className={s.statCardValue} style={{ color: "#c4b5fd" }}>
            {loading ? "—" : users.filter((u) => u.isGlobalAdmin).length}
          </div>
          <div className={s.statCardLabel}>Super Admins</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>✅</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>
            {loading ? "—" : users.filter((u) => u.emailVerified).length}
          </div>
          <div className={s.statCardLabel}>Email Verificado</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🏢</div>
          <div className={s.statCardValue}>
            {loading ? "—" : users.filter((u) => u.companies.length > 1).length}
          </div>
          <div className={s.statCardLabel}>En múltiples empresas</div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <span className={s.searchIcon}>🔍</span>
          <input
            type="text"
            className={s.searchInput}
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={s.filterBtn}
          value={filterAdmin}
          onChange={(e) => setFilterAdmin(e.target.value)}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todos los roles</option>
          <option value="super">👑 Super Admin</option>
          <option value="regular">👤 Usuario normal</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--text-tertiary)" }}>
          Cargando usuarios...
        </div>
      ) : (
        <div className={s.tableWrapper}>
          <table className={styles.saTable}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Email Verificado</th>
                <th>Empresas</th>
                <th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "var(--space-8)" }}>
                    No hay resultados
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "var(--radius-full)",
                            background: user.isGlobalAdmin
                              ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                              : "linear-gradient(135deg, var(--primary-600), var(--primary-400))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "var(--font-sm)",
                            flexShrink: 0,
                            boxShadow: user.isGlobalAdmin ? "0 2px 8px rgba(124,58,237,0.4)" : "none",
                          }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <span className={s.cellMain}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)" }}>
                      {user.email}
                    </td>
                    <td>
                      {user.isGlobalAdmin ? (
                        <span className={`${s.badge} ${s.primary}`} style={{ borderColor: "rgba(139,92,246,0.3)" }}>
                          👑 Super Admin
                        </span>
                      ) : (
                        <span className={`${s.badge} ${s.inactive}`}>
                          👤 Usuario
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`${s.badge} ${user.emailVerified ? s.active : s.warning}`}>
                        {user.emailVerified ? "✅ Verificado" : "⏳ Pendiente"}
                      </span>
                    </td>
                    <td>
                      {user.companies.length === 0 ? (
                        <span style={{ color: "var(--text-tertiary)", fontSize: "var(--font-xs)" }}>Sin empresa</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {user.companies.slice(0, 2).map((c) => (
                            <div key={c.companyId} style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
                              {c.companyName}
                              <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>({c.role})</span>
                            </div>
                          ))}
                          {user.companies.length > 2 && (
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                              +{user.companies.length - 2} más
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ color: "var(--text-tertiary)", fontSize: "var(--font-xs)" }}>
                      {new Date(user.createdAt).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
