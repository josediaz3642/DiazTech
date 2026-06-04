"use client";

import { useState, useMemo, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import { formatCurrency, formatDate } from "@/lib/utils";
import EntityCombobox, { EntityItem } from "@/components/EntityCombobox";
import { createReceipt, getReceiptById } from "@/actions/receipts";

interface ReceiptsClientProps {
  initialReceipts: any[];
  clients: EntityItem[];
  suppliers: EntityItem[];
}

const PAYMENT_METHODS = [
  { value: "cash", label: "💵 Efectivo" },
  { value: "transfer", label: "🏦 Transferencia" },
  { value: "check", label: "📝 Cheque" },
  { value: "mercadopago", label: "💳 MercadoPago" },
  { value: "other", label: "📋 Otro" },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "💵 Efectivo",
  transfer: "🏦 Transferencia",
  check: "📝 Cheque",
  mercadopago: "💳 MercadoPago",
  other: "📋 Otro",
};

export default function ReceiptsClient({
  initialReceipts,
  clients,
  suppliers,
}: ReceiptsClientProps) {
  const [receipts, setReceipts] = useState<any[]>(initialReceipts);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "collection" | "payment">("all");
  const [filterMethod, setFilterMethod] = useState("all");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: "collection" as "collection" | "payment",
    clientId: "",
    supplierId: "",
    total: 0,
    currency: "ARS",
    paymentMethod: "cash",
    description: "",
    notes: "",
  });
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const perPage = 10;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      const name = r.type === "collection" ? (r.client?.name || "") : (r.supplier?.name || "");
      const matchSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(search.toLowerCase())) ||
        r.number.toString().includes(search);
      const matchType = filterType === "all" || r.type === filterType;
      const matchMethod = filterMethod === "all" || r.paymentMethod === filterMethod;
      return matchSearch && matchType && matchMethod;
    });
  }, [receipts, search, filterType, filterMethod]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Stats from DB data
  const stats = useMemo(() => {
    const collections = receipts.filter((r) => r.type === "collection" && r.currency === "ARS");
    const payments = receipts.filter((r) => r.type === "payment" && r.currency === "ARS");

    const monthCollections = collections.reduce((sum, r) => sum + Number(r.total), 0);
    const monthPayments = payments.reduce((sum, r) => sum + Number(r.total), 0);
    const totalReceipts = receipts.length;

    // Calculate most used payment method
    const methodCounts: Record<string, number> = {};
    receipts.forEach((r) => {
      methodCounts[r.paymentMethod] = (methodCounts[r.paymentMethod] || 0) + 1;
    });

    let bestMethod = "—";
    let maxCount = 0;
    Object.entries(methodCounts).forEach(([method, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestMethod = METHOD_LABELS[method] || method;
      }
    });

    return { monthCollections, monthPayments, totalReceipts, bestMethod };
  }, [receipts]);

  const openCreate = (type: "collection" | "payment") => {
    setFormData({
      type,
      clientId: "",
      supplierId: "",
      total: 0,
      currency: "ARS",
      paymentMethod: "cash",
      description: "",
      notes: "",
    });
    setShowCreateModal(true);
  };

  const handleCreateReceipt = () => {
    if (formData.type === "collection" && !formData.clientId) {
      showToast("Seleccioná un cliente", "error");
      return;
    }
    if (formData.type === "payment" && !formData.supplierId) {
      showToast("Seleccioná un proveedor", "error");
      return;
    }
    if (formData.total <= 0) {
      showToast("Ingresá un monto mayor a 0", "error");
      return;
    }

    startTransition(async () => {
      const payload = {
        type: formData.type,
        clientId: formData.type === "collection" ? formData.clientId : undefined,
        supplierId: formData.type === "payment" ? formData.supplierId : undefined,
        date: new Date().toISOString(),
        total: formData.total,
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
        description: formData.description,
        notes: formData.notes,
      };

      const res = await createReceipt(payload);
      if (res.success && res.data) {
        showToast(`Recibo N°${res.data.number} registrado con éxito`);
        setReceipts((prev) => [res.data, ...prev]);
        setShowCreateModal(false);
      } else {
        showToast(res.error || "Error al registrar el recibo", "error");
      }
    });
  };

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true);
    const res = await getReceiptById(id);
    setLoadingDetail(false);
    if (res.success && res.data) {
      setSelectedReceipt(res.data);
    } else {
      showToast(res.error || "No se pudo cargar el detalle", "error");
    }
  };

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Recibos</h1>
          <p className={s.pageSubtitle}>Comprobantes reales de cobros y pagos financieros 🧾</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button className={s.btnSecondary} onClick={() => openCreate("payment")}>
            + Registrar Pago
          </button>
          <button className={s.btnPrimary} onClick={() => openCreate("collection")}>
            + Registrar Cobro
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📈</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>
            {formatCurrency(stats.monthCollections)}
          </div>
          <div className={s.statCardLabel}>Cobros del Mes</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📉</div>
          <div className={`${s.statCardValue} ${s.balanceNegative}`}>
            {formatCurrency(stats.monthPayments)}
          </div>
          <div className={s.statCardLabel}>Pagos del Mes</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📋</div>
          <div className={s.statCardValue}>{stats.totalReceipts}</div>
          <div className={s.statCardLabel}>Total Recibos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🏆</div>
          <div className={s.statCardValue} style={{ fontSize: "var(--font-md)", fontWeight: 800 }}>
            {stats.bestMethod.split(" ")[1] || stats.bestMethod}
          </div>
          <div className={s.statCardLabel}>Medio Más Usado</div>
        </div>
      </div>

      {/* Toolbar filters */}
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <span className={s.searchIcon}>🔍</span>
          <input
            type="text"
            className={s.searchInput}
            placeholder="Buscar por cliente, proveedor, N° o concepto..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <button
          className={`${s.filterBtn} ${filterType === "collection" ? s.active : ""}`}
          onClick={() => setFilterType(filterType === "collection" ? "all" : "collection")}
        >
          📈 Cobros
        </button>
        <button
          className={`${s.filterBtn} ${filterType === "payment" ? s.active : ""}`}
          onClick={() => setFilterType(filterType === "payment" ? "all" : "payment")}
        >
          📉 Pagos
        </button>
        <select
          className={s.filterBtn}
          value={filterMethod}
          onChange={(e) => {
            setFilterMethod(e.target.value);
            setCurrentPage(1);
          }}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todos los medios</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Receipts list */}
      <div className={s.tableWrapper}>
        {paginated.length > 0 ? (
          <>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Tipo</th>
                  <th>Cliente / Proveedor</th>
                  <th>Fecha</th>
                  <th>Medio de Pago</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th style={{ textAlign: "right", width: 80 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => {
                  const name = r.type === "collection" ? (r.client?.name || "Consumidor Final") : (r.supplier?.name || "Proveedor");
                  const notes = r.notes;

                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                          {String(r.number).padStart(4, "0")}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.badge} ${r.type === "collection" ? s.active : s.danger}`}>
                          {r.type === "collection" ? "📈 Cobro" : "📉 Pago"}
                        </span>
                      </td>
                      <td>
                        <div className={s.cellMain}>{name}</div>
                        {notes && <div className={s.cellSub}>{notes}</div>}
                      </td>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <span className={`${s.badge} ${s.info}`}>
                          {METHOD_LABELS[r.paymentMethod] || r.paymentMethod}
                        </span>
                      </td>
                      <td>
                        <div
                          className={s.cellMain}
                          style={{
                            maxWidth: 250,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.description}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          className={r.type === "collection" ? s.balancePositive : s.balanceNegative}
                          style={{ fontSize: "var(--font-base)", fontWeight: 700 }}
                        >
                          {r.type === "collection" ? "+" : "-"}
                          {formatCurrency(Number(r.total), r.currency)}
                        </span>
                      </td>
                      <td>
                        <button
                          className={s.actionBtn}
                          onClick={() => handleViewDetail(r.id)}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
            <div className={s.emptyIcon}>🧾</div>
            <h3 className={s.emptyTitle}>No se encontraron recibos</h3>
            <p className={s.emptyDescription}>
              {search ? "Probá con otros términos" : "Registrá tu primer cobro o pago"}
            </p>
          </div>
        )}
      </div>

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className={s.modalOverlay} onClick={() => setSelectedReceipt(null)}>
          <div className={`${s.modal} printableArea`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, padding: 0 }}>
            {/* Modal Header */}
            <div className={`${s.modalHeader} noPrint`} style={{ padding: "var(--space-4)" }}>
              <h2 className={s.modalTitle}>Detalles de Recibo</h2>
              <button className={s.modalClose} onClick={() => setSelectedReceipt(null)}>✕</button>
            </div>
            
            {/* AFIP-style Receipt Voucher */}
            <div className="afipVoucher" style={{ margin: "15px" }}>
              <div className="afipHeaderBox">
                <div className="afipHeaderLeft">
                  <div className="afipCompanyTitle">DIAZTECH</div>
                  <div style={{ fontWeight: 700 }}>José Díaz S.A.</div>
                  <div>Av. Rivadavia 1234, CABA</div>
                  <div>Condición IVA: Responsable Inscripto</div>
                </div>
                
                <div className="afipHeaderLetterBox">
                  <span className="afipHeaderLetter">X</span>
                  <span className="afipHeaderCode">No Val. Fac.</span>
                </div>
                
                <div className="afipHeaderRight">
                  <div className="afipVoucherTitle">
                    {selectedReceipt.type === "collection" ? "RECIBO DE COBRO" : "ORDEN DE PAGO"}
                  </div>
                  <div>N° {String(selectedReceipt.number).padStart(8, "0")}</div>
                  <div>Fecha Emisión: {formatDate(selectedReceipt.date)}</div>
                  <div>CUIT: 30-71458921-9</div>
                  <div>IIBB: 30-71458921-9</div>
                  <div>Inicio Act.: 01/01/2026</div>
                </div>
              </div>
              
              <div className="afipClientBox">
                <div>
                  <strong>{selectedReceipt.type === "collection" ? "Recibimos de:" : "Pagamos a:"}</strong>{" "}
                  {selectedReceipt.type === "collection"
                    ? (selectedReceipt.client?.name || "Consumidor Final")
                    : (selectedReceipt.supplier?.name || "Proveedor")}
                </div>
                <div>
                  <strong>CUIT:</strong>{" "}
                  {selectedReceipt.type === "collection"
                    ? (selectedReceipt.client?.cuit || "—")
                    : (selectedReceipt.supplier?.cuit || "—")}
                </div>
                <div>
                  <strong>Domicilio:</strong>{" "}
                  {selectedReceipt.type === "collection"
                    ? (selectedReceipt.client?.address || "—")
                    : (selectedReceipt.supplier?.address || "—")}
                </div>
                <div>
                  <strong>Condición IVA:</strong>{" "}
                  {selectedReceipt.type === "collection"
                    ? (selectedReceipt.client?.taxCategory || "Consumidor Final")
                    : (selectedReceipt.supplier?.taxCategory || "Responsable Inscripto")}
                </div>
              </div>
              
              <div style={{ padding: "var(--space-4)" }}>
                <p style={{ fontSize: "var(--font-sm)", marginBottom: "var(--space-2)" }}>
                  Concepto del movimiento y método de pago registrado:
                </p>
                <div style={{ padding: "var(--space-3)", background: "#fbfbfb", border: "1px solid #333", color: "#333" }}>
                  <div><strong>Descripción:</strong> {selectedReceipt.description || "Sin descripción"}</div>
                  <div style={{ marginTop: "4px" }}>
                    <strong>Método de Pago:</strong> {METHOD_LABELS[selectedReceipt.paymentMethod] || selectedReceipt.paymentMethod}
                  </div>
                  {selectedReceipt.reference && (
                    <div style={{ marginTop: "4px" }}>
                      <strong>Referencia / Cheque:</strong> {selectedReceipt.reference}
                    </div>
                  )}
                  {selectedReceipt.notes && (
                    <div style={{ marginTop: "4px" }}>
                      <strong>Notas:</strong> {selectedReceipt.notes}
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
                    Total: {formatCurrency(Number(selectedReceipt.total), selectedReceipt.currency)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`${s.modalFooter} noPrint`} style={{ padding: "var(--space-4)" }}>
              <button className={s.btnPrimary} onClick={() => window.print()}>🖨️ Imprimir / Guardar PDF</button>
              <button className={s.btnSecondary} onClick={() => setSelectedReceipt(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Receipt Modal */}
      {showCreateModal && (
        <div className={s.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {formData.type === "collection" ? "Registrar Nuevo Cobro" : "Registrar Nuevo Pago"}
              </h2>
              <button className={s.modalClose} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup} style={{ gridColumn: "1 / -1" }}>
                  <label className={s.formLabel}>
                    {formData.type === "collection" ? "Seleccionar Cliente *" : "Seleccionar Proveedor *"}
                  </label>
                  {formData.type === "collection" ? (
                    <EntityCombobox
                      items={clients}
                      value={formData.clientId}
                      onChange={(id) => setFormData({ ...formData, clientId: id })}
                      placeholder="Buscar cliente..."
                    />
                  ) : (
                    <EntityCombobox
                      items={suppliers}
                      value={formData.supplierId}
                      onChange={(id) => setFormData({ ...formData, supplierId: id })}
                      placeholder="Buscar proveedor..."
                    />
                  )}
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Medio de Pago</label>
                  <select
                    className={s.formSelect}
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Moneda</label>
                  <select
                    className={s.formSelect}
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="ARS">🇦🇷 ARS</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
                </div>
                <div className={s.formGroup} style={{ gridColumn: "1 / -1" }}>
                  <label className={s.formLabel}>Monto *</label>
                  <input
                    type="number"
                    className={s.formInput}
                    min={0.01}
                    step="any"
                    placeholder="0.00"
                    value={formData.total || ""}
                    onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className={s.formGroup} style={{ gridColumn: "1 / -1" }}>
                  <label className={s.formLabel}>Descripción / Concepto *</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="Ej: Pago de factura, anticipo, etc."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className={s.formGroup} style={{ gridColumn: "1 / -1" }}>
                  <label className={s.formLabel}>Notas / Comentario</label>
                  <textarea
                    className={s.formTextarea}
                    placeholder="Comentarios o aclaraciones adicionales..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{ minHeight: 60 }}
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button 
                className={s.btnPrimary} 
                onClick={handleCreateReceipt}
                disabled={isPending}
              >
                {isPending ? "Registrando..." : formData.type === "collection" ? "Registrar Cobro" : "Registrar Pago"}
              </button>
            </div>
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
