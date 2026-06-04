"use client";

import { useState, useMemo, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateBudgetLink } from "@/lib/whatsapp";
import EntityCombobox, { EntityItem } from "@/components/EntityCombobox";
import { createBudget, updateBudgetStatus, getBudgetById } from "@/actions/budgets";
import { createInvoice } from "@/actions/invoices";

interface BudgetsClientProps {
  initialBudgets: any[];
  clients: EntityItem[];
  products: any[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviado",
  approved: "Aprobado",
  rejected: "Rechazado",
  invoiced: "Facturado",
};
const STATUS_BADGE: Record<string, string> = {
  draft: "inactive",
  sent: "info",
  approved: "active",
  rejected: "danger",
  invoiced: "primary",
};

const EMPTY_ITEM = {
  productId: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  ivaRate: 21,
  subtotal: 0,
  ivaAmount: 0,
  total: 0,
};

export default function BudgetsClient({
  initialBudgets,
  clients,
  products,
}: BudgetsClientProps) {
  const [budgets, setBudgets] = useState<any[]>(initialBudgets);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [newBudget, setNewBudget] = useState({
    clientId: "",
    currency: "ARS",
    validDays: 30,
    notes: "",
  });
  const [formItems, setFormItems] = useState<any[]>([{ ...EMPTY_ITEM, id: "1" }]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const perPage = 10;

  const showToast = (msg: string, type: "success" | "error" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    return budgets.filter((b) => {
      const clientName = b.client?.name || "Sin identificar";
      const matchSearch =
        clientName.toLowerCase().includes(search.toLowerCase()) ||
        b.number.toString().includes(search);
      const matchStatus = filterStatus === "all" || b.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [budgets, search, filterStatus]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Calculate statistics from database data
  const stats = useMemo(() => {
    const active = budgets.filter((b) => b.status !== "rejected");
    const totalBudgeted = active.reduce((sum, b) => sum + Number(b.total), 0);
    const approvedTotal = budgets
      .filter((b) => b.status === "approved")
      .reduce((sum, b) => sum + Number(b.total), 0);
    const pendingCount = budgets.filter((b) => b.status === "draft" || b.status === "sent").length;
    const conversionRate =
      budgets.length > 0
        ? Math.round(
            (budgets.filter((b) => b.status === "approved" || b.status === "invoiced").length /
              budgets.length) *
              100
          )
        : 0;

    return { totalBudgeted, approvedTotal, pendingCount, conversionRate };
  }, [budgets]);

  const recalcItem = (item: any) => {
    const subtotal = item.quantity * item.unitPrice;
    const ivaAmount = subtotal * (item.ivaRate / 100);
    return { ...item, subtotal, ivaAmount, total: subtotal + ivaAmount };
  };

  const updateItemField = (index: number, field: string, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = recalcItem({ ...updated[index], [field]: value });
      return updated;
    });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setFormItems((prev) => {
        const updated = [...prev];
        updated[index] = recalcItem({
          ...updated[index],
          productId: prod.id,
          description: prod.name,
          unitPrice: Number(prod.salePrice),
          ivaRate: Number(prod.ivaRate),
        });
        return updated;
      });
    } else {
      setFormItems((prev) => {
        const updated = [...prev];
        updated[index] = recalcItem({
          ...updated[index],
          productId: "",
        });
        return updated;
      });
    }
  };

  const addItemRow = () => {
    setFormItems((prev) => [...prev, { ...EMPTY_ITEM, id: Date.now().toString() }]);
  };

  const removeItemRow = (idx: number) => {
    if (formItems.length > 1) {
      setFormItems((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const budgetSubtotal = formItems.reduce((sum, i) => sum + i.subtotal, 0);
  const budgetIva = formItems.reduce((sum, i) => sum + i.ivaAmount, 0);
  const budgetTotal = formItems.reduce((sum, i) => sum + i.total, 0);

  const handleCreateBudget = () => {
    if (!newBudget.clientId) {
      showToast("Seleccioná un cliente", "error");
      return;
    }
    if (formItems.some((i) => !i.description.trim())) {
      showToast("Completá la descripción para todos los ítems", "error");
      return;
    }
    if (formItems.some((i) => i.quantity <= 0 || i.unitPrice <= 0)) {
      showToast("La cantidad y precio unitario deben ser mayores a 0", "error");
      return;
    }

    startTransition(async () => {
      const today = new Date();
      const validUntil = new Date(today.getTime() + newBudget.validDays * 24 * 60 * 60 * 1000);

      const payload = {
        clientId: newBudget.clientId,
        date: today.toISOString(),
        validUntil: validUntil.toISOString(),
        currency: newBudget.currency,
        notes: newBudget.notes,
        items: formItems.map((item) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ivaRate: item.ivaRate,
          ivaAmount: item.ivaAmount,
          subtotal: item.subtotal,
          total: item.total,
        })),
      };

      const res = await createBudget(payload);
      if (res.success && res.data) {
        showToast(`Presupuesto N°${res.data.number} creado con éxito`);
        setBudgets((prev) => [res.data, ...prev]);
        setShowCreateModal(false);
        setNewBudget({
          clientId: "",
          currency: "ARS",
          validDays: 30,
          notes: "",
        });
        setFormItems([{ ...EMPTY_ITEM, id: "1" }]);
      } else {
        showToast(res.error || "Error al crear el presupuesto", "error");
      }
    });
  };

  const handleChangeStatus = (budget: any, status: string) => {
    startTransition(async () => {
      const res = await updateBudgetStatus(budget.id, status);
      if (res.success) {
        showToast(`Presupuesto N°${budget.number} cambiado a ${STATUS_LABELS[status]}`);
        setBudgets((prev) =>
          prev.map((b) => (b.id === budget.id ? { ...b, status } : b))
        );
        // Sync selected budget in modal if open
        if (selectedBudget && selectedBudget.id === budget.id) {
          setSelectedBudget((prev: any) => ({ ...prev, status }));
        }
      } else {
        showToast(res.error || "Error al cambiar el estado", "error");
      }
    });
  };

  const handleConvertToInvoice = (budget: any) => {
    startTransition(async () => {
      const invoicePayload = {
        clientId: budget.clientId,
        type: "B", // default
        pointOfSale: 1,
        date: new Date().toISOString(),
        currency: budget.currency,
        notes: `Generado desde Presupuesto N° ${budget.number}. ${budget.notes || ""}`,
        items: budget.items.map((item: any) => ({
          productId: item.productId,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          ivaRate: Number(item.ivaRate),
          ivaAmount: Number(item.ivaAmount),
          subtotal: Number(item.subtotal),
          total: Number(item.total),
        })),
      };

      const invRes = await createInvoice(invoicePayload);
      if (invRes.success) {
        const statusRes = await updateBudgetStatus(budget.id, "invoiced");
        if (statusRes.success) {
          showToast("Presupuesto convertido a Factura con éxito ✅");
          setBudgets((prev) =>
            prev.map((b) => (b.id === budget.id ? { ...b, status: "invoiced" } : b))
          );
          setSelectedBudget(null);
        } else {
          showToast("Factura emitida, pero no se pudo marcar el presupuesto como facturado", "warning");
        }
      } else {
        showToast(invRes.error || "Error al emitir factura a partir de este presupuesto", "error");
      }
    });
  };

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true);
    const res = await getBudgetById(id);
    setLoadingDetail(false);
    if (res.success && res.data) {
      setSelectedBudget(res.data);
    } else {
      showToast(res.error || "No se pudo cargar el detalle", "error");
    }
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  const productItemsForCombobox = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      cuit: p.code,
      taxCategory: `$ ${Number(p.salePrice).toLocaleString("es-AR")}`,
    }));
  }, [products]);

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Presupuestos</h1>
          <p className={s.pageSubtitle}>Gestión de presupuestos con datos reales y catálogo de stock 📋</p>
        </div>
        <button className={s.btnPrimary} onClick={() => setShowCreateModal(true)}>
          + Nuevo Presupuesto
        </button>
      </div>

      {/* Stats row */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📋</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>
            {formatCurrency(stats.totalBudgeted)}
          </div>
          <div className={s.statCardLabel}>Total Presupuestado</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>✅</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>
            {formatCurrency(stats.approvedTotal)}
          </div>
          <div className={s.statCardLabel}>Aprobados</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>⏳</div>
          <div className={s.statCardValue}>{stats.pendingCount}</div>
          <div className={s.statCardLabel}>Pendientes</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📊</div>
          <div className={s.statCardValue}>{stats.conversionRate}%</div>
          <div className={s.statCardLabel}>Tasa de Conversión</div>
        </div>
      </div>

      {/* Toolbar filters */}
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <span className={s.searchIcon}>🔍</span>
          <input
            type="text"
            className={s.searchInput}
            placeholder="Buscar por cliente o N°..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        {Object.keys(STATUS_LABELS).map((st) => (
          <button
            key={st}
            className={`${s.filterBtn} ${filterStatus === st ? s.active : ""}`}
            onClick={() => setFilterStatus(filterStatus === st ? "all" : st)}
          >
            {STATUS_LABELS[st]}
          </button>
        ))}
      </div>

      {/* Budgets list */}
      <div className={s.tableWrapper}>
        {paginated.length > 0 ? (
          <>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Validez</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right", width: 140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b) => {
                  const clientPhone = b.client?.phone || "";
                  const clientName = b.client?.name || "Sin identificar";
                  const expired = isExpired(b.validUntil);

                  return (
                    <tr key={b.id}>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                          #{b.number}
                        </span>
                      </td>
                      <td>
                        <div className={s.cellMain}>{clientName}</div>
                        {b.notes && <div className={s.cellSub}>{b.notes}</div>}
                      </td>
                      <td>{formatDate(b.date)}</td>
                      <td>
                        <div>{formatDate(b.validUntil)}</div>
                        {(b.status === "draft" || b.status === "sent") && expired && (
                          <div style={{ color: "var(--error-400)", fontSize: "var(--font-xs)" }}>
                            ⚠️ Vencido
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>
                          {formatCurrency(Number(b.total), b.currency)}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.badge} ${s[STATUS_BADGE[b.status]]}`}>
                          {STATUS_LABELS[b.status]}
                        </span>
                      </td>
                      <td>
                        <div className={s.cellActions} style={{ justifyContent: "flex-end" }}>
                          <button
                            className={s.actionBtn}
                            onClick={() => handleViewDetail(b.id)}
                            title="Ver detalles"
                          >
                            👁️
                          </button>
                          {clientPhone && (b.status === "draft" || b.status === "sent") && (
                            <a
                              href={generateBudgetLink(clientPhone, clientName, b.number, Number(b.total))}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${s.actionBtn} ${s.whatsapp}`}
                              title="Enviar por WhatsApp"
                              onClick={() => {
                                if (b.status === "draft") handleChangeStatus(b, "sent");
                              }}
                            >
                              💬
                            </a>
                          )}
                          {b.status === "sent" && (
                            <>
                              <button
                                className={`${s.actionBtn} ${s.edit}`}
                                onClick={() => handleChangeStatus(b, "approved")}
                                title="Aprobar"
                              >
                                ✅
                              </button>
                              <button
                                className={`${s.actionBtn} ${s.delete}`}
                                onClick={() => handleChangeStatus(b, "rejected")}
                                title="Rechazar"
                              >
                                ❌
                              </button>
                            </>
                          )}
                          {b.status === "approved" && (
                            <button
                              className={`${s.actionBtn} ${s.edit}`}
                              onClick={() => handleConvertToInvoice(b)}
                              title="Convertir a Factura"
                            >
                              🧾
                            </button>
                          )}
                        </div>
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
            <div className={s.emptyIcon}>📋</div>
            <h3 className={s.emptyTitle}>No se encontraron presupuestos</h3>
            <p className={s.emptyDescription}>
              {search ? "Probá otros términos" : "Creá tu primer presupuesto"}
            </p>
          </div>
        )}
      </div>

      {/* Budget Detail Modal */}
      {selectedBudget && (
        <div className={s.modalOverlay} onClick={() => setSelectedBudget(null)}>
          <div className={`${s.modal} printableArea`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, padding: 0 }}>
            {/* Modal Header */}
            <div className={`${s.modalHeader} noPrint`} style={{ padding: "var(--space-4)" }}>
              <h2 className={s.modalTitle}>Detalles de Presupuesto</h2>
              <button className={s.modalClose} onClick={() => setSelectedBudget(null)}>✕</button>
            </div>
            
            {/* AFIP-style Budget Voucher */}
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
                  <div className="afipVoucherTitle">PRESUPUESTO</div>
                  <div>N° {String(selectedBudget.number).padStart(8, "0")}</div>
                  <div>Fecha Emisión: {formatDate(selectedBudget.date)}</div>
                  <div>CUIT: 30-71458921-9</div>
                  <div>IIBB: 30-71458921-9</div>
                  <div>Inicio Act.: 01/01/2026</div>
                </div>
              </div>
              
              <div className="afipClientBox">
                <div><strong>Señor(es):</strong> {selectedBudget.client?.name || "Sin identificar"}</div>
                <div><strong>CUIT:</strong> {selectedBudget.client?.cuit || "—"}</div>
                <div><strong>Domicilio:</strong> {selectedBudget.client?.address || "—"}</div>
                <div><strong>Condición IVA:</strong> {selectedBudget.client?.taxCategory || "Consumidor Final"}</div>
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
                  {selectedBudget.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product?.code || "—"}</td>
                      <td>{item.description}</td>
                      <td className="right">{Number(item.quantity)}</td>
                      <td className="right">{formatCurrency(Number(item.unitPrice))}</td>
                      <td className="right">{Number(item.ivaRate)}%</td>
                      <td className="right">{formatCurrency(Number(item.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="afipFooterBox">
                <div className="afipFooterLeft">
                  {selectedBudget.validUntil && (
                    <div><strong>Validez del Presupuesto:</strong> Hasta el {formatDate(selectedBudget.validUntil)}</div>
                  )}
                  {selectedBudget.notes && (
                    <div style={{ marginTop: 4 }}><strong>Notas:</strong> {selectedBudget.notes}</div>
                  )}
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "35px", height: "35px", backgroundColor: "#000" }}></div>
                    <span style={{ fontSize: "8px", color: "#666" }}>Documento Comercial sin Valor Fiscal</span>
                  </div>
                </div>
                <div className="afipFooterRight">
                  <div>Neto Gravado: {formatCurrency(Number(selectedBudget.subtotal))}</div>
                  <div>IVA Estimado: {formatCurrency(Number(selectedBudget.ivaTotal))}</div>
                  <div className="afipGrandTotal">Total: {formatCurrency(Number(selectedBudget.total), selectedBudget.currency)}</div>
                </div>
              </div>
            </div>
            
            <div className={`${s.modalFooter} noPrint`} style={{ padding: "var(--space-4)" }}>
              <div style={{ display: "flex", gap: 8, flex: 1 }}>
                {selectedBudget.status === "approved" && (
                  <button 
                    className={s.btnPrimary} 
                    onClick={() => handleConvertToInvoice(selectedBudget)}
                    disabled={isPending}
                  >
                    {isPending ? "Procesando..." : "🧾 Convertir en Factura"}
                  </button>
                )}
                {selectedBudget.status === "sent" && (
                  <>
                    <button className={s.btnPrimary} onClick={() => handleChangeStatus(selectedBudget, "approved")}>Aprobar</button>
                    <button className={s.btnSecondary} style={{ background: "var(--danger-600)" }} onClick={() => handleChangeStatus(selectedBudget, "rejected")}>Rechazar</button>
                  </>
                )}
                <button className={s.btnPrimary} onClick={() => window.print()}>🖨️ Imprimir / Guardar PDF</button>
              </div>
              <button className={s.btnSecondary} onClick={() => setSelectedBudget(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className={s.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={`${s.modal} ${s.wide}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 850 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Nuevo Presupuesto</h2>
              <button className={s.modalClose} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Cliente *</label>
                  <EntityCombobox
                    items={clients}
                    value={newBudget.clientId}
                    onChange={(id) => setNewBudget({ ...newBudget, clientId: id })}
                    placeholder="Buscar cliente por nombre o CUIT..."
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Moneda</label>
                  <select
                    className={s.formSelect}
                    value={newBudget.currency}
                    onChange={(e) => setNewBudget({ ...newBudget, currency: e.target.value })}
                  >
                    <option value="ARS">🇦🇷 ARS</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Validez (días)</label>
                  <input
                    type="number"
                    className={s.formInput}
                    min={1}
                    value={newBudget.validDays}
                    onChange={(e) => setNewBudget({ ...newBudget, validDays: Number(e.target.value) || 30 })}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginTop: "var(--space-5)", borderTop: "1px solid var(--border-primary)", paddingTop: "var(--space-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <label className={s.formLabel} style={{ fontWeight: 700 }}>Items</label>
                  <button className={s.btnGhost} onClick={addItemRow} style={{ color: "var(--primary-400)" }}>
                    + Agregar Item
                  </button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 200 }}>Seleccionar Producto (Catálogo)</th>
                        <th style={{ minWidth: 150 }}>Descripción / Concepto</th>
                        <th style={{ width: 70 }}>Cant.</th>
                        <th style={{ width: 110 }}>Precio</th>
                        <th style={{ width: 70 }}>IVA</th>
                        <th style={{ width: 110, textAlign: "right" }}>Total</th>
                        <th style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td>
                            <EntityCombobox
                              items={productItemsForCombobox}
                              value={item.productId}
                              onChange={(productId) => handleProductSelect(idx, productId)}
                              placeholder="Buscar en stock..."
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className={s.formInput}
                              placeholder="Concepto"
                              value={item.description}
                              onChange={(e) => updateItemField(idx, "description", e.target.value)}
                              style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--font-xs)" }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className={s.formInput}
                              min={1}
                              value={item.quantity || ""}
                              onChange={(e) => updateItemField(idx, "quantity", Number(e.target.value))}
                              style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--font-xs)", textAlign: "right" }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className={s.formInput}
                              min={0.01}
                              step="any"
                              value={item.unitPrice || ""}
                              onChange={(e) => updateItemField(idx, "unitPrice", Number(e.target.value))}
                              style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--font-xs)", textAlign: "right" }}
                            />
                          </td>
                          <td>
                            <select
                              className={s.formSelect}
                              value={item.ivaRate}
                              onChange={(e) => updateItemField(idx, "ivaRate", Number(e.target.value))}
                              style={{ padding: "var(--space-1)", fontSize: "var(--font-xs)" }}
                            >
                              <option value={21}>21%</option>
                              <option value={10.5}>10.5%</option>
                              <option value={27}>27%</option>
                              <option value={0}>0%</option>
                            </select>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, fontSize: "var(--font-sm)" }}>
                            {formatCurrency(item.total)}
                          </td>
                          <td>
                            {formItems.length > 1 && (
                              <button
                                className={`${s.actionBtn} ${s.delete}`}
                                onClick={() => removeItemRow(idx)}
                                style={{ width: 24, height: 24, fontSize: "var(--font-xs)" }}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-3)" }}>
                  <div style={{ width: 250, padding: "var(--space-3)", background: "rgba(15,23,42,0.5)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-sm)", marginBottom: "var(--space-1)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
                      <span>{formatCurrency(budgetSubtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-sm)", marginBottom: "var(--space-2)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>IVA:</span>
                      <span>{formatCurrency(budgetIva)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-lg)", fontWeight: 800, borderTop: "1px solid var(--border-primary)", paddingTop: "var(--space-2)" }}>
                      <span>Total:</span>
                      <span className={s.balancePositive}>{formatCurrency(budgetTotal, newBudget.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.formGroup} style={{ marginTop: "var(--space-4)" }}>
                <label className={s.formLabel}>Notas</label>
                <textarea
                  className={s.formTextarea}
                  placeholder="Observaciones o notas comerciales..."
                  value={newBudget.notes}
                  onChange={(e) => setNewBudget({ ...newBudget, notes: e.target.value })}
                  style={{ minHeight: 60 }}
                />
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button 
                className={s.btnPrimary} 
                onClick={handleCreateBudget}
                disabled={isPending}
              >
                {isPending ? "Creando..." : "Crear Presupuesto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <div className={`${s.toast} ${s[toast.type]}`}>
          <span className={s.toastIcon}>
            {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "⚠️"}
          </span>
          <span className={s.toastMessage}>{toast.message}</span>
          <button className={s.toastClose} onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </>
  );
}
