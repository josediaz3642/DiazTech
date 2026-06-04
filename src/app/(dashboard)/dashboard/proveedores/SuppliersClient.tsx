"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import s from "@/styles/module-page.module.css";
import { formatCurrency, formatCUIT, formatDate, formatInvoiceNumber } from "@/lib/utils";
import { createSupplier, updateSupplier, deleteSupplier } from "@/actions/suppliers";
import { getSupplierStatement } from "@/actions/account-statement";
import { getInvoiceById } from "@/actions/invoices";
import { getReceiptById } from "@/actions/receipts";

interface SuppliersClientProps {
  initialSuppliers: any[];
  initialStats: any;
}

const TAX_CATEGORIES = [
  "Responsable Inscripto",
  "Monotributista",
  "Exento",
];

const PROVINCES = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const EMPTY_SUPPLIER = {
  name: "",
  cuit: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "Buenos Aires",
  taxCategory: "Responsable Inscripto",
  notes: "",
};

export default function SuppliersClient({
  initialSuppliers,
  initialStats,
}: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState<any[]>(initialSuppliers);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterDebt, setFilterDebt] = useState(false);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  // Account statement state
  const [activeTab, setActiveTab] = useState<"details" | "statement">("details");
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [statementFilters, setStatementFilters] = useState({
    from: "",
    to: "",
    type: "",
  });

  // Document details states (nested drill-down)
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docType, setDocType] = useState<"invoice" | "receipt" | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Form
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [formData, setFormData] = useState(EMPTY_SUPPLIER);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const perPage = 10;

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    return suppliers.filter((sup) => {
      const matchSearch =
        sup.name.toLowerCase().includes(search.toLowerCase()) ||
        (sup.cuit && sup.cuit.includes(search)) ||
        (sup.email && sup.email.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && sup.isActive) ||
        (filterStatus === "inactive" && !sup.isActive);

      const matchDebt = !filterDebt || Number(sup.balance) < 0;

      return matchSearch && matchStatus && matchDebt;
    });
  }, [suppliers, search, filterStatus, filterDebt]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Fetch supplier statement
  useEffect(() => {
    if (selectedSupplier && activeTab === "statement") {
      const fetchStatement = async () => {
        setLoadingMovements(true);
        const res = await getSupplierStatement(selectedSupplier.id, statementFilters);
        setLoadingMovements(false);
        if (res.success && res.data) {
          setMovements(res.data);
        } else {
          showToast(res.error || "Error al cargar la cuenta corriente", "error");
        }
      };
      fetchStatement();
    }
  }, [selectedSupplier, activeTab, statementFilters]);

  const openCreate = () => {
    setEditingSupplier(null);
    setFormData(EMPTY_SUPPLIER);
    setShowModal(true);
  };

  const openEdit = (e: React.MouseEvent, sup: any) => {
    e.stopPropagation();
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      cuit: sup.cuit || "",
      email: sup.email || "",
      phone: sup.phone || "",
      address: sup.address || "",
      city: sup.city || "",
      province: sup.province || "Buenos Aires",
      taxCategory: sup.taxCategory || "Responsable Inscripto",
      notes: sup.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      showToast("El nombre es obligatorio", "error");
      return;
    }

    startTransition(async () => {
      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, formData);
        if (res.success && res.data) {
          showToast(`Proveedor "${formData.name}" actualizado`);
          setSuppliers((prev) => prev.map((s) => (s.id === editingSupplier.id ? res.data : s)));
          setShowModal(false);
        } else {
          showToast(res.error || "Error al actualizar", "error");
        }
      } else {
        const res = await createSupplier(formData);
        if (res.success && res.data) {
          showToast(`Proveedor "${formData.name}" creado`);
          setSuppliers((prev) => [res.data, ...prev]);
          setShowModal(false);
        } else {
          showToast(res.error || "Error al crear", "error");
        }
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, sup: any) => {
    e.stopPropagation();
    if (confirm(`¿Eliminar a "${sup.name}"?`)) {
      startTransition(async () => {
        const res = await deleteSupplier(sup.id);
        if (res.success) {
          showToast(`Proveedor "${sup.name}" eliminado`);
          setSuppliers((prev) => prev.map((s) => (s.id === sup.id ? { ...s, isActive: false } : s)));
        } else {
          showToast(res.error || "Error al eliminar", "error");
        }
      });
    }
  };

  const getBalanceClass = (bal: number) => {
    if (bal < 0) return s.balanceNegative;
    if (bal > 0) return s.balancePositive;
    return s.balanceZero;
  };

  const handleExportCSV = () => {
    if (!selectedSupplier) return;
    const headers = ["Fecha", "Comprobante", "Moneda", "Debe", "Haber", "Saldo"];
    const rows = movements.map((m) => {
      const debe = Number(m.amount) > 0 ? Number(m.amount) : 0;
      const haber = Number(m.amount) < 0 ? Math.abs(Number(m.amount)) : 0;
      return [
        new Date(m.date).toLocaleDateString("es-AR"),
        m.description,
        m.currency,
        debe,
        haber,
        Number(m.balance),
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cuenta_corriente_prov_${selectedSupplier.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Proveedores</h1>
          <p className={s.pageSubtitle}>Gestión de proveedores y cuentas corrientes a pagar 🏪</p>
        </div>
        <button className={s.btnPrimary} onClick={openCreate} id="btn-new-supplier">
          + Nuevo Proveedor
        </button>
      </div>

      {/* Stats Row */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🏪</div>
          <div className={s.statCardValue}>{stats.activeCount}</div>
          <div className={s.statCardLabel}>Proveedores Activos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>💸</div>
          <div className={`${s.statCardValue} ${s.balanceNegative}`}>
            {formatCurrency(Math.abs(Number(stats.totalDebtArs)))}
          </div>
          <div className={s.statCardLabel}>Total Deuda ARS</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>💵</div>
          <div className={`${s.statCardValue} ${Number(stats.totalDebtUsd) < 0 ? s.balanceNegative : s.balanceZero}`}>
            {Number(stats.totalDebtUsd) < 0 ? formatCurrency(Math.abs(Number(stats.totalDebtUsd)), "USD") : "—"}
          </div>
          <div className={s.statCardLabel}>Total Deuda USD</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>⚠️</div>
          <div className={s.statCardValue}>{suppliers.filter((sup) => Number(sup.balance) < 0).length}</div>
          <div className={s.statCardLabel}>Con Deuda Pendiente</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <span className={s.searchIcon}>🔍</span>
          <input
            type="text"
            className={s.searchInput}
            placeholder="Buscar por nombre, CUIT o email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <button
          className={`${s.filterBtn} ${filterStatus === "active" ? s.active : ""}`}
          onClick={() => setFilterStatus(filterStatus === "active" ? "all" : "active")}
        >
          ✅ Activos
        </button>
        <button
          className={`${s.filterBtn} ${filterDebt ? s.active : ""}`}
          onClick={() => setFilterDebt(!filterDebt)}
        >
          💸 Con deuda
        </button>
      </div>

      {/* Table */}
      <div className={s.tableWrapper}>
        {paginated.length > 0 ? (
          <>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>CUIT</th>
                  <th>Contacto</th>
                  <th>Cond. Fiscal</th>
                  <th>Deuda ARS</th>
                  <th>Deuda USD</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right", width: 140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((sup) => (
                  <tr
                    key={sup.id}
                    onClick={() => {
                      setSelectedSupplier(sup);
                      setActiveTab("details");
                      setShowDetailModal(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className={s.cellMain}>{sup.name}</div>
                      <div className={s.cellSub}>
                        {sup.city || "—"}, {sup.province}
                      </div>
                    </td>
                    <td>{sup.cuit ? formatCUIT(sup.cuit) : "—"}</td>
                    <td>
                      <div className={s.cellMain}>{sup.email || "—"}</div>
                      <div className={s.cellSub}>{sup.phone || "—"}</div>
                    </td>
                    <td>
                      <span className={`${s.badge} ${s.info}`}>{sup.taxCategory}</span>
                    </td>
                    <td>
                      <span className={getBalanceClass(Number(sup.balance))}>
                        {Number(sup.balance) !== 0 ? formatCurrency(Math.abs(Number(sup.balance))) : "—"}
                      </span>
                    </td>
                    <td>
                      {Number(sup.balanceUsd) !== 0 ? (
                        <span className={getBalanceClass(Number(sup.balanceUsd))}>
                          {formatCurrency(Math.abs(Number(sup.balanceUsd)), "USD")}
                        </span>
                      ) : (
                        <span className={s.balanceZero}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`${s.badge} ${sup.isActive ? s.active : s.inactive}`}>
                        {sup.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className={s.cellActions} style={{ justifyContent: "flex-end" }}>
                        <button
                          className={`${s.actionBtn} ${s.edit}`}
                          onClick={(e) => openEdit(e, sup)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        {sup.isActive && (
                          <button
                            className={`${s.actionBtn} ${s.delete}`}
                            onClick={(e) => handleDelete(e, sup)}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className={s.pagination}>
                <div className={s.paginationInfo}>
                  Mostrando {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
                </div>
                <div className={s.paginationButtons}>
                  <button
                    className={s.pageBtn}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      className={`${s.pageBtn} ${currentPage === i + 1 ? s.active : ""}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className={s.pageBtn}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>🏪</div>
            <h3 className={s.emptyTitle}>No se encontraron proveedores</h3>
            <p className={s.emptyDescription}>
              {search ? "Probá con otros términos" : "Empezá agregando tu primer proveedor"}
            </p>
            {!search && (
              <button className={s.btnPrimary} onClick={openCreate}>
                + Nuevo Proveedor
              </button>
            )}
          </div>
        )}
      </div>

      {/* Supplier Detail Modal with Tabs */}
      {showDetailModal && selectedSupplier && (
        <div className={s.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div className={`${s.modal} ${s.wide}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 850 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>{selectedSupplier.name}</h2>
              <button className={s.modalClose} onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            {/* Modal Tabs */}
            <div className={s.toolbar} style={{ padding: "0 24px", borderBottom: "1px solid var(--border-primary)", background: "transparent", minHeight: "auto", margin: "var(--space-2) 0" }}>
              <button 
                className={`${s.filterBtn} ${activeTab === "details" ? s.active : ""}`}
                onClick={() => setActiveTab("details")}
              >
                📁 Información General
              </button>
              <button 
                className={`${s.filterBtn} ${activeTab === "statement" ? s.active : ""}`}
                onClick={() => setActiveTab("statement")}
              >
                📊 Resumen de Cuenta
              </button>
            </div>

            <div className={s.modalBody} style={{ minHeight: 300, textAlign: "left" }}>
              {activeTab === "details" ? (
                <div className={s.formGrid}>
                  <div>
                    <span className={s.cellSub}>CUIT:</span>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedSupplier.cuit ? formatCUIT(selectedSupplier.cuit) : "—"}</div>
                  </div>
                  <div>
                    <span className={s.cellSub}>Condición Fiscal:</span>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedSupplier.taxCategory}</div>
                  </div>
                  <div>
                    <span className={s.cellSub}>Email:</span>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedSupplier.email || "—"}</div>
                  </div>
                  <div>
                    <span className={s.cellSub}>Teléfono:</span>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedSupplier.phone || "—"}</div>
                  </div>
                  <div>
                    <span className={s.cellSub}>Dirección completa:</span>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {selectedSupplier.address || "—"}, {selectedSupplier.city || ""} ({selectedSupplier.province})
                    </div>
                  </div>
                  <div>
                    <span className={s.cellSub}>Fecha alta:</span>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatDate(selectedSupplier.createdAt)}</div>
                  </div>
                  <div>
                    <span className={s.cellSub}>Saldo Pendiente (ARS):</span>
                    <div style={{ fontWeight: 700, fontSize: "var(--font-lg)" }} className={getBalanceClass(Number(selectedSupplier.balance))}>
                      {formatCurrency(Number(selectedSupplier.balance))}
                    </div>
                  </div>
                  <div>
                    <span className={s.cellSub}>Saldo Pendiente (USD):</span>
                    <div style={{ fontWeight: 700, fontSize: "var(--font-lg)" }} className={getBalanceClass(Number(selectedSupplier.balanceUsd))}>
                      {formatCurrency(Number(selectedSupplier.balanceUsd), "USD")}
                    </div>
                  </div>
                  {selectedSupplier.notes && (
                    <div style={{ gridColumn: "1 / -1", padding: 12, background: "var(--bg-primary)", borderRadius: 6, borderLeft: "3px solid var(--primary-500)", marginTop: 12 }}>
                      <span className={s.cellSub}>Notas / Observaciones:</span>
                      <p style={{ margin: "4px 0 0 0", color: "var(--text-primary)" }}>{selectedSupplier.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Account statement filters */}
                  <div className={s.toolbar} style={{ margin: "0 0 var(--space-4) 0", padding: 0 }}>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>Desde:</span>
                      <input 
                        type="date" 
                        className={s.formInput} 
                        style={{ padding: "4px 8px", width: 130, fontSize: "var(--font-xs)" }} 
                        value={statementFilters.from}
                        onChange={(e) => setStatementFilters({ ...statementFilters, from: e.target.value })}
                      />
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>Hasta:</span>
                      <input 
                        type="date" 
                        className={s.formInput} 
                        style={{ padding: "4px 8px", width: 130, fontSize: "var(--font-xs)" }} 
                        value={statementFilters.to}
                        onChange={(e) => setStatementFilters({ ...statementFilters, to: e.target.value })}
                      />
                      <select 
                        className={s.formSelect} 
                        style={{ padding: "4px 8px", width: 130, fontSize: "var(--font-xs)" }}
                        value={statementFilters.type}
                        onChange={(e) => setStatementFilters({ ...statementFilters, type: e.target.value })}
                      >
                        <option value="">Todos</option>
                        <option value="payment">Pagos</option>
                        <option value="invoice">Comprobantes</option>
                      </select>
                      <button 
                        className={s.btnSecondary} 
                        style={{ padding: "6px 12px", fontSize: "var(--font-xs)" }}
                        onClick={() => setStatementFilters({ from: "", to: "", type: "" })}
                      >
                        Limpiar Filtros
                      </button>
                    </div>
                    
                    <button 
                      className={s.btnPrimary} 
                      style={{ padding: "6px 12px", fontSize: "var(--font-xs)" }}
                      onClick={handleExportCSV}
                      disabled={movements.length === 0}
                    >
                      📥 Exportar CSV
                    </button>
                  </div>

                  {/* Movements table */}
                  {loadingMovements ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                      Cargando movimientos...
                    </div>
                  ) : movements.length > 0 ? (
                    <div style={{ maxHeight: 350, overflowY: "auto" }}>
                      <table className={s.table} style={{ fontSize: "var(--font-xs)" }}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Concepto</th>
                            <th>Moneda</th>
                            <th style={{ textAlign: "right" }}>Debe (Débito)</th>
                            <th style={{ textAlign: "right" }}>Haber (Crédito)</th>
                            <th style={{ textAlign: "right" }}>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movements.map((m) => {
                            // In suppliers CC:
                            // If m.amount > 0: Debe (we owe less / or adjustment)
                            // If m.amount < 0: Haber (we owe more, e.g. purchase invoice or check issued)
                            const debe = Number(m.amount) > 0 ? Number(m.amount) : 0;
                            const haber = Number(m.amount) < 0 ? Math.abs(Number(m.amount)) : 0;

                            return (
                              <tr
                                key={m.id}
                                onClick={async () => {
                                  if (!m.referenceId) return;
                                  setLoadingDoc(true);
                                  try {
                                    if (m.type === "invoice") {
                                      const res = await getInvoiceById(m.referenceId);
                                      if (res.success && res.data) {
                                        setSelectedDoc(res.data);
                                        setDocType("invoice");
                                      } else {
                                        showToast(res.error || "No se pudo cargar el detalle del comprobante", "error");
                                      }
                                    } else if (m.type === "receipt" || m.type === "payment") {
                                      const res = await getReceiptById(m.referenceId);
                                      if (res.success && res.data) {
                                        setSelectedDoc(res.data);
                                        setDocType("receipt");
                                      } else {
                                        showToast(res.error || "No se pudo cargar el detalle del recibo", "error");
                                      }
                                    }
                                  } catch (err) {
                                    showToast("Error al obtener el documento", "error");
                                  } finally {
                                    setLoadingDoc(false);
                                  }
                                }}
                                style={{ cursor: m.referenceId ? "pointer" : "default" }}
                                title={m.referenceId ? "Click para ver detalle del documento" : undefined}
                              >
                                <td>{formatDate(m.date)}</td>
                                <td style={{ fontWeight: 500 }}>
                                  {m.description}
                                  {m.referenceId && (
                                    <span style={{ marginLeft: 8, fontSize: "10px", color: "var(--primary-400)" }}>
                                      🔍 Ver
                                    </span>
                                  )}
                                </td>
                                <td>{m.currency}</td>
                                <td style={{ textAlign: "right", color: debe > 0 ? "var(--success-400)" : "inherit" }}>
                                  {debe > 0 ? formatCurrency(debe, m.currency) : "—"}
                                </td>
                                <td style={{ textAlign: "right", color: haber > 0 ? "var(--warning-400)" : "inherit" }}>
                                  {haber > 0 ? formatCurrency(haber, m.currency) : "—"}
                                </td>
                                <td style={{ textAlign: "right", fontWeight: 700 }} className={getBalanceClass(Number(m.balance))}>
                                  {formatCurrency(Number(m.balance), m.currency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                      No se registraron movimientos en la cuenta corriente para este proveedor.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowDetailModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={`${s.modal} ${s.wide}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
              <button className={s.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Nombre / Razón Social *</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="Ej: Alimentos del Sur S.A."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>CUIT</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="XX-XXXXXXXX-X"
                    value={formData.cuit}
                    onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Condición Fiscal</label>
                  <select
                    className={s.formSelect}
                    value={formData.taxCategory}
                    onChange={(e) => setFormData({ ...formData, taxCategory: e.target.value })}
                  >
                    {TAX_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Email</label>
                  <input
                    type="email"
                    className={s.formInput}
                    placeholder="email@proveedor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Teléfono</label>
                  <input
                    type="tel"
                    className={s.formInput}
                    placeholder="11 5510-0001"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Dirección</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="Ruta 5 Km 32"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Ciudad</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="CABA"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Provincia</label>
                  <select
                    className={s.formSelect}
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  >
                    {PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Notas / Observaciones</label>
                  <textarea
                    className={s.formTextarea}
                    placeholder="Notas o comentarios sobre el proveedor..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{ minHeight: 60 }}
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
              <button className={s.btnPrimary} onClick={handleSave} disabled={isPending}>
                {isPending ? "Guardando..." : editingSupplier ? "Guardar Cambios" : "Crear Proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nested Document Detail Modal */}
      {selectedDoc && docType && (
        <div className={s.modalOverlay} onClick={() => { setSelectedDoc(null); setDocType(null); }} style={{ zIndex: 1100 }}>
          <div className={`${s.modal} printableArea`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, padding: 0 }}>
            {/* Modal Header */}
            <div className={`${s.modalHeader} noPrint`} style={{ padding: "var(--space-4)" }}>
              <h2 className={s.modalTitle}>Detalles de Comprobante</h2>
              <button className={s.modalClose} onClick={() => { setSelectedDoc(null); setDocType(null); }}>✕</button>
            </div>
            
            <div className="afipVoucher" style={{ margin: "15px" }}>
              {docType === "invoice" ? (
                <>
                  <div className="afipHeaderBox">
                    <div className="afipCompanyTitle" style={{ display: "none" }}>DIAZTECH</div>
                    <div className="afipHeaderLeft">
                      <div className="afipCompanyTitle">{selectedDoc.supplier?.name || "Proveedor"}</div>
                      {selectedDoc.supplier?.address && <div>Domicilio: {selectedDoc.supplier.address}</div>}
                      {selectedDoc.supplier?.phone && <div>Tel: {selectedDoc.supplier.phone}</div>}
                    </div>
                    
                    <div className="afipHeaderLetterBox">
                      <span className="afipHeaderLetter">
                        {selectedDoc.type.includes("NC") ? "C" : selectedDoc.type.includes("ND") ? "D" : (selectedDoc.type.split(" ").pop() || "B")}
                      </span>
                      <span className="afipHeaderCode">cod. 001</span>
                    </div>
                    
                    <div className="afipHeaderRight">
                      <div className="afipVoucherTitle">{selectedDoc.type}</div>
                      <div>N° {formatInvoiceNumber(selectedDoc.pointOfSale, selectedDoc.number)}</div>
                      <div>Fecha: {formatDate(selectedDoc.date)}</div>
                      <div>CUIT: {selectedDoc.supplier?.cuit || "—"}</div>
                    </div>
                  </div>
                  
                  <div className="afipClientBox">
                    <div><strong>Señor(es):</strong> José Díaz S.A. (DiazTech)</div>
                    <div><strong>CUIT:</strong> 30-71458921-9</div>
                    <div><strong>Domicilio:</strong> Av. Rivadavia 1234, CABA</div>
                    <div><strong>Condición IVA:</strong> Responsable Inscripto</div>
                  </div>
                  
                  <table className="afipItemsTable">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th className="right">Cant.</th>
                        <th className="right">Precio Unit.</th>
                        <th className="right">IVA %</th>
                        <th className="right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDoc.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td>{item.product?.code || "—"}</td>
                          <td>{item.description}</td>
                          <td className="right">{Number(item.quantity)}</td>
                          <td className="right">{formatCurrency(Number(item.unitPrice), selectedDoc.currency)}</td>
                          <td className="right">{Number(item.ivaRate)}%</td>
                          <td className="right">{formatCurrency(Number(item.total), selectedDoc.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="afipFooterBox">
                    <div className="afipFooterLeft">
                      {selectedDoc.cae && (
                        <>
                          <div><strong>CAE N°:</strong> {selectedDoc.cae}</div>
                          <div><strong>Vencimiento CAE:</strong> {formatDate(selectedDoc.caeExpiration)}</div>
                        </>
                      )}
                      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "35px", height: "35px", backgroundColor: "#000" }}></div>
                        <span style={{ fontSize: "8px", color: "#666" }}>Comprobante de Compra</span>
                      </div>
                    </div>
                    <div className="afipFooterRight">
                      <div>Neto Gravado: {formatCurrency(Number(selectedDoc.subtotal), selectedDoc.currency)}</div>
                      <div>IVA Liquidado: {formatCurrency(Number(selectedDoc.ivaTotal), selectedDoc.currency)}</div>
                      <div className="afipGrandTotal">Total: {formatCurrency(Number(selectedDoc.total), selectedDoc.currency)}</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="afipHeaderBox">
                    <div className="afipHeaderLeft">
                      <div className="afipCompanyTitle">{selectedDoc.supplier?.name || "Proveedor"}</div>
                      {selectedDoc.supplier?.address && <div>Domicilio: {selectedDoc.supplier.address}</div>}
                    </div>
                    
                    <div className="afipHeaderLetterBox">
                      <span className="afipHeaderLetter">X</span>
                      <span className="afipHeaderCode">No Val. Fac.</span>
                    </div>
                    
                    <div className="afipHeaderRight">
                      <div className="afipVoucherTitle">
                        {selectedDoc.type === "collection" ? "RECIBO DE COBRO" : "ORDEN DE PAGO"}
                      </div>
                      <div>N° {String(selectedDoc.number).padStart(8, "0")}</div>
                      <div>Fecha Emisión: {formatDate(selectedDoc.date)}</div>
                      <div>CUIT: {selectedDoc.supplier?.cuit || "—"}</div>
                    </div>
                  </div>
                  
                  <div className="afipClientBox">
                    <div><strong>Pagado por:</strong> José Díaz S.A. (DiazTech)</div>
                    <div><strong>CUIT:</strong> 30-71458921-9</div>
                    <div><strong>Domicilio:</strong> Av. Rivadavia 1234, CABA</div>
                    <div><strong>Condición IVA:</strong> Responsable Inscripto</div>
                  </div>
                  
                  <div style={{ padding: "var(--space-4)" }}>
                    <p style={{ fontSize: "var(--font-sm)", marginBottom: "var(--space-2)" }}>
                      Concepto del movimiento y método de pago registrado:
                    </p>
                    <div style={{ padding: "var(--space-3)", background: "#fbfbfb", border: "1px solid #333", color: "#333" }}>
                      <div><strong>Descripción:</strong> {selectedDoc.description || "Sin descripción"}</div>
                      <div style={{ marginTop: "4px" }}>
                        <strong>Método de Pago:</strong> {selectedDoc.paymentMethod}
                      </div>
                      {selectedDoc.notes && (
                        <div style={{ marginTop: "4px" }}>
                          <strong>Notas:</strong> {selectedDoc.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="afipFooterBox" style={{ borderTop: "2px solid #333" }}>
                    <div className="afipFooterLeft">
                      <div style={{ marginTop: "30px", borderTop: "1px dashed #333", width: "150px", textAlign: "center", paddingTop: "5px" }}>
                        Firma autorizada
                      </div>
                    </div>
                    <div className="afipFooterRight">
                      <div className="afipGrandTotal" style={{ fontSize: "16px" }}>
                        Total: {formatCurrency(Number(selectedDoc.total), selectedDoc.currency)}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className={`${s.modalFooter} noPrint`} style={{ padding: "var(--space-4)" }}>
              <button className={s.btnPrimary} onClick={() => window.print()}>🖨️ Imprimir / Guardar PDF</button>
              <button className={s.btnSecondary} onClick={() => { setSelectedDoc(null); setDocType(null); }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Document details loading overlay */}
      {loadingDoc && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 1200, display: "flex",
          justifyContent: "center", alignItems: "center", color: "var(--text-primary)",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{ padding: "20px 30px", background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: 8 }}>
            Obteniendo detalles del documento...
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <div className={`${s.toast} ${s[toast.type]}`}>
          <span className={s.toastIcon}>{toast.type === "success" ? "✅" : "❌"}</span>
          <span className={s.toastMessage}>{toast.message}</span>
          <button className={s.toastClose} onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </>
  );
}
