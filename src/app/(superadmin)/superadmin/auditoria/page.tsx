"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "../superadmin.module.css";
import s from "@/styles/module-page.module.css";
import { getAuditLogs } from "@/actions/superadmin";

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: unknown;
  ipAddress: string | null;
  createdAt: Date;
  user: { id: string; name: string; email: string };
  company: { id: string; name: string; fantasyName: string | null } | null;
}

const ACTION_BADGE: Record<string, string> = {
  CREATE: s.active,
  UPDATE: s.info,
  DELETE: s.danger,
  LOGIN: s.primary,
  LOGOUT: s.inactive,
};

const ACTION_ICON: Record<string, string> = {
  CREATE: "➕",
  UPDATE: "✏️",
  DELETE: "🗑️",
  LOGIN: "🔑",
  LOGOUT: "🚪",
};

const PAGE_SIZE = 20;

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAuditLogs({
      action: filterAction !== "all" ? filterAction : undefined,
      entity: filterEntity || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }).then((result) => {
      if (result.success && result.data) {
        const d = result.data as { logs: AuditLogEntry[]; total: number };
        setLogs(d.logs);
        setTotal(d.total);
      }
      setLoading(false);
    });
  }, [filterAction, filterEntity, page]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [filterAction, filterEntity]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatChanges = (changes: unknown): string => {
    if (!changes) return "—";
    try {
      return JSON.stringify(changes, null, 2);
    } catch {
      return String(changes);
    }
  };

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
            Log de Auditoría
          </h1>
          <p className={s.pageSubtitle}>
            Registro de todas las acciones del sistema — {loading ? "..." : total.toLocaleString("es-AR")} eventos
          </p>
        </div>
        <button className={s.btnSecondary} onClick={load}>
          🔄 Actualizar
        </button>
      </div>

      {/* Alert */}
      <div className={styles.alertBanner}>
        <span className={styles.alertBannerIcon}>📋</span>
        <div>
          El log de auditoría registra todas las acciones importantes: creaciones, modificaciones, eliminaciones y accesos al sistema. Los registros son inmutables.
        </div>
      </div>

      {/* Filters */}
      <div className={s.toolbar}>
        <select
          className={s.filterBtn}
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todas las acciones</option>
          <option value="CREATE">➕ CREATE</option>
          <option value="UPDATE">✏️ UPDATE</option>
          <option value="DELETE">🗑️ DELETE</option>
          <option value="LOGIN">🔑 LOGIN</option>
          <option value="LOGOUT">🚪 LOGOUT</option>
        </select>
        <input
          type="text"
          className={s.searchInput}
          placeholder="Filtrar por entidad (Client, Invoice...)"
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          style={{ maxWidth: 280 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--text-tertiary)" }}>
          Cargando registros de auditoría...
        </div>
      ) : (
        <div className={s.tableWrapper}>
          <table className={styles.saTable}>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Usuario</th>
                <th>Empresa</th>
                <th>IP</th>
                <th style={{ textAlign: "right" }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "var(--space-8)" }}>
                    No hay registros de auditoría
                    {filterAction !== "all" && ` para la acción "${filterAction}"`}
                    {filterEntity && ` en la entidad "${filterEntity}"`}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr key={log.id}>
                      <td style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        <div>{new Date(log.createdAt).toLocaleDateString("es-AR")}</div>
                        <div style={{ color: "var(--text-tertiary)" }}>
                          {new Date(log.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </td>
                      <td>
                        <span className={`${s.badge} ${ACTION_BADGE[log.action] ?? s.inactive}`}>
                          {ACTION_ICON[log.action] ?? "•"} {log.action}
                        </span>
                      </td>
                      <td>
                        <div className={s.cellMain}>{log.entity}</div>
                        <div className={s.cellSub} style={{ fontFamily: "monospace" }}>
                          {log.entityId.slice(0, 8)}...
                        </div>
                      </td>
                      <td>
                        <div className={s.cellMain}>{log.user.name}</div>
                        <div className={s.cellSub}>{log.user.email}</div>
                      </td>
                      <td style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
                        {log.company
                          ? log.company.fantasyName ?? log.company.name
                          : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                      </td>
                      <td style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                        {log.ipAddress ?? "—"}
                      </td>
                      <td>
                        <div className={s.cellActions}>
                          {!!log.changes && (
                            <button
                              className={s.actionBtn}
                              title="Ver cambios"
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            >
                              {expandedLog === log.id ? "▲" : "▼"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedLog === log.id && log.changes && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div
                            style={{
                              background: "rgba(124, 58, 237, 0.06)",
                              borderTop: "1px solid rgba(139, 92, 246, 0.15)",
                              borderBottom: "1px solid rgba(139, 92, 246, 0.15)",
                              padding: "var(--space-4) var(--space-6)",
                            }}
                          >
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-2)", fontWeight: 700 }}>
                              CAMBIOS REGISTRADOS:
                            </div>
                            <pre
                              style={{
                                fontFamily: "monospace",
                                fontSize: "var(--font-xs)",
                                color: "var(--text-secondary)",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                                maxHeight: 200,
                                overflowY: "auto",
                                margin: 0,
                              }}
                            >
                              {formatChanges(log.changes)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={s.pagination}>
              <div className={s.paginationInfo}>
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total.toLocaleString("es-AR")} registros
              </div>
              <div className={s.paginationButtons}>
                <button
                  className={s.pageBtn}
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  ←
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return (
                    <button
                      key={p}
                      className={`${s.pageBtn} ${p === page ? s.active : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p + 1}
                    </button>
                  );
                })}
                <button
                  className={s.pageBtn}
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
