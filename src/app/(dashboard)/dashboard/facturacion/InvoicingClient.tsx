"use client";

import { useState, useMemo, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import { formatCurrency, formatDate, formatInvoiceNumber } from "@/lib/utils";
import EntityCombobox, { EntityItem } from "@/components/EntityCombobox";
import { createInvoice, getInvoiceById } from "@/actions/invoices";

interface InvoicingClientProps {
  initialInvoices: any[];
  clients: EntityItem[];
  products: any[];
}

const INVOICE_TYPES = [
  { value: "A", label: "Factura A", color: "primary" },
  { value: "B", label: "Factura B", color: "active" },
  { value: "C", label: "Factura C", color: "info" },
  { value: "NCA", label: "Nota Crédito A", color: "warning" },
  { value: "NCB", label: "Nota Crédito B", color: "warning" },
  { value: "NCC", label: "Nota Crédito C", color: "warning" },
  { value: "NDA", label: "Nota Débito A", color: "danger" },
  { value: "NDB", label: "Nota Débito B", color: "danger" },
  { value: "NDC", label: "Nota Débito C", color: "danger" },
];

const TYPE_BADGE: Record<string, string> = {
  A: "primary", B: "active", C: "info",
  NCA: "warning", NCB: "warning", NCC: "warning",
  NDA: "danger", NDB: "danger", NDC: "danger",
};

const STATUS_LABELS: Record<string, string> = { 
  pending: "Pendiente", 
  authorized: "Autorizada", 
  cancelled: "Anulada" 
};
const STATUS_BADGE: Record<string, string> = { 
  pending: "warning", 
  authorized: "active", 
  cancelled: "inactive" 
};

const EMPTY_ITEM = { 
  productId: "", 
  description: "", 
  quantity: 1, 
  unitPrice: 0, 
  ivaRate: 21, 
  subtotal: 0, 
  ivaAmount: 0, 
  total: 0 
};

export default function InvoicingClient({
  initialInvoices,
  clients,
  products,
}: InvoicingClientProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states
  const [newInvoice, setNewInvoice] = useState({
    type: "B",
    clientId: "",
    isConsumidorFinal: false,
    currency: "ARS",
    pointOfSale: 1,
    notes: "",
  });
  const [formItems, setFormItems] = useState<any[]>([{ ...EMPTY_ITEM, id: "1" }]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const perPage = 10;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const clientName = inv.client?.name || "Consumidor Final";
      const clientCuit = inv.client?.cuit || "";
      const invNum = formatInvoiceNumber(inv.pointOfSale, inv.number);
      const caeStr = inv.cae || "";

      const matchSearch =
        clientName.toLowerCase().includes(search.toLowerCase()) ||
        clientCuit.includes(search) ||
        invNum.includes(search) ||
        caeStr.includes(search);
      const matchType = filterType === "all" || inv.type === filterType;
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [invoices, search, filterType, filterStatus]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Calculate month stats based on DB data
  const stats = useMemo(() => {
    const authorized = invoices.filter((i) => i.status === "authorized");
    const monthTotal = authorized
      .filter((i) => !i.type.startsWith("NC") && !i.type.startsWith("ND"))
      .reduce((sum, i) => sum + Number(i.total), 0);
    const monthNC = authorized
      .filter((i) => i.type.startsWith("NC"))
      .reduce((sum, i) => sum + Number(i.total), 0);
    const pendingCount = invoices.filter((i) => i.status === "pending").length;
    const authorizedCount = authorized.length;

    return { monthTotal, monthNC, pendingCount, authorizedCount };
  }, [invoices]);

  // Recalculate totals for a single item row
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

  const removeItemRow = (index: number) => {
    if (formItems.length > 1) {
      setFormItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const invoiceSubtotal = formItems.reduce((sum, i) => sum + i.subtotal, 0);
  const invoiceIva = formItems.reduce((sum, i) => sum + i.ivaAmount, 0);
  const invoiceTotal = formItems.reduce((sum, i) => sum + i.total, 0);

  // Form submit
  const handleCreateInvoice = () => {
    if (!newInvoice.isConsumidorFinal && !newInvoice.clientId) {
      showToast("Seleccioná un cliente o marcá como Consumidor Final", "error");
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
      const payload = {
        clientId: newInvoice.isConsumidorFinal ? null : newInvoice.clientId,
        type: newInvoice.type,
        pointOfSale: Number(newInvoice.pointOfSale) || 1,
        date: new Date().toISOString(),
        currency: newInvoice.currency,
        notes: newInvoice.notes,
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

      const res = await createInvoice(payload);
      if (res.success && res.data) {
        showToast(`Factura ${newInvoice.type} creada con éxito (CAE simulado)`);
        setInvoices((prev) => [res.data, ...prev]);
        setShowCreateModal(false);
        // Reset form
        setNewInvoice({
          type: "B",
          clientId: "",
          isConsumidorFinal: false,
          currency: "ARS",
          pointOfSale: 1,
          notes: "",
        });
        setFormItems([{ ...EMPTY_ITEM, id: "1" }]);
      } else {
        showToast(res.error || "Error al crear la factura", "error");
      }
    });
  };

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true);
    const res = await getInvoiceById(id);
    setLoadingDetail(false);
    if (res.success && res.data) {
      setSelectedInvoice(res.data);
    } else {
      showToast(res.error || "No se pudo cargar el detalle", "error");
    }
  };

  // Format products items to be used in EntityCombobox
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
          <h1 className={s.pageTitle}>Facturación</h1>
          <p className={s.pageSubtitle}>Facturación electrónica AFIP — Homologación real de datos 🧬</p>
        </div>
        <button className={s.btnPrimary} onClick={() => setShowCreateModal(true)}>
          + Nueva Factura
        </button>
      </div>

      {/* Stats row */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🧾</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>
            {formatCurrency(stats.monthTotal)}
          </div>
          <div className={s.statCardLabel}>Facturado del Mes</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📄</div>
          <div className={`${s.statCardValue} ${s.balanceNegative}`}>
            {formatCurrency(stats.monthNC)}
          </div>
          <div className={s.statCardLabel}>Notas de Crédito</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>✅</div>
          <div className={s.statCardValue}>{stats.authorizedCount}</div>
          <div className={s.statCardLabel}>Autorizadas</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>⏳</div>
          <div className={`${s.statCardValue} ${stats.pendingCount > 0 ? s.balanceNegative : ""}`}>
            {stats.pendingCount}
          </div>
          <div className={s.statCardLabel}>Pendientes CAE</div>
        </div>
      </div>

      {/* Toolbar filters */}
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <span className={s.searchIcon}>🔍</span>
          <input
            type="text"
            className={s.searchInput}
            placeholder="Buscar por cliente, N° comprobante o CAE..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <select
          className={s.filterBtn}
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1);
          }}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todos los tipos</option>
          {INVOICE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className={s.filterBtn}
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}
        >
          <option value="all">Todos los estados</option>
          <option value="authorized">Autorizadas</option>
          <option value="pending">Pendientes</option>
          <option value="cancelled">Anuladas</option>
        </select>
      </div>

      {/* Invoices list */}
      <div className={s.tableWrapper}>
        {paginated.length > 0 ? (
          <>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>CAE</th>
                  <th style={{ textAlign: "right" }}>Neto</th>
                  <th style={{ textAlign: "right" }}>IVA</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th>Estado</th>
                  <th style={{ width: 80 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <span className={`${s.badge} ${s[TYPE_BADGE[inv.type] || "info"]}`}>
                        {inv.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {formatInvoiceNumber(inv.pointOfSale, inv.number)}
                      </span>
                    </td>
                    <td>
                      <div className={s.cellMain}>{inv.client?.name || "Consumidor Final"}</div>
                      <div className={s.cellSub}>{inv.client?.cuit || "Consumidor Final"}</div>
                    </td>
                    <td>{formatDate(inv.date)}</td>
                    <td>
                      {inv.cae ? (
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)" }}>{inv.cae}</div>
                          <div className={s.cellSub}>Vto: {formatDate(inv.caeExpiration)}</div>
                        </div>
                      ) : (
                        <span className={s.balanceZero}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>{Number(inv.subtotal) > 0 ? formatCurrency(Number(inv.subtotal)) : "—"}</td>
                    <td style={{ textAlign: "right" }}>{Number(inv.ivaTotal) > 0 ? formatCurrency(Number(inv.ivaTotal)) : "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>
                        {formatCurrency(Number(inv.total), inv.currency)}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.badge} ${s[STATUS_BADGE[inv.status]]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        className={s.actionBtn}
                        onClick={() => handleViewDetail(inv.id)}
                        title="Ver detalles"
                      >
                        👁️
                      </button>
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
            <div className={s.emptyIcon}>🧾</div>
            <h3 className={s.emptyTitle}>No se encontraron facturas</h3>
            <p className={s.emptyDescription}>
              {search ? "Probá otros términos" : "Emití tu primera factura"}
            </p>
            {!search && (
              <button className={s.btnPrimary} onClick={() => setShowCreateModal(true)}>
                + Nueva Factura
              </button>
            )}
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className={s.modalOverlay} onClick={() => setSelectedInvoice(null)}>
          <div className={`${s.modal} printableArea`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, padding: 0 }}>
            {/* Modal Header */}
            <div className={`${s.modalHeader} noPrint`} style={{ padding: "var(--space-4)" }}>
              <h2 className={s.modalTitle}>Detalles de Comprobante</h2>
              <button className={s.modalClose} onClick={() => setSelectedInvoice(null)}>✕</button>
            </div>
            
            {/* AFIP Voucher */}
            <div className="afipVoucher" style={{ margin: "15px" }}>
              <div className="afipHeaderBox">
                <div className="afipHeaderLeft">
                  <div className="afipCompanyTitle">DIAZTECH</div>
                  <div style={{ fontWeight: 700 }}>José Díaz S.A.</div>
                  <div>Av. Rivadavia 1234, CABA</div>
                  <div>Condición IVA: Responsable Inscripto</div>
                </div>
                
                <div className="afipHeaderLetterBox">
                  <span className="afipHeaderLetter">
                    {selectedInvoice.type.includes("NC") ? "C" : selectedInvoice.type.includes("ND") ? "D" : (selectedInvoice.type.split(" ").pop() || "B")}
                  </span>
                  <span className="afipHeaderCode">cod. 001</span>
                </div>
                
                <div className="afipHeaderRight">
                  <div className="afipVoucherTitle">{selectedInvoice.type}</div>
                  <div>N° {formatInvoiceNumber(selectedInvoice.pointOfSale, selectedInvoice.number)}</div>
                  <div>Fecha: {formatDate(selectedInvoice.date)}</div>
                  <div>CUIT: 30-71458921-9</div>
                  <div>IIBB: 30-71458921-9</div>
                  <div>Inicio Act.: 01/01/2026</div>
                </div>
              </div>
              
              <div className="afipClientBox">
                <div><strong>Señor(es):</strong> {selectedInvoice.client?.name || "Consumidor Final"}</div>
                <div><strong>CUIT:</strong> {selectedInvoice.client?.cuit || "—"}</div>
                <div><strong>Domicilio:</strong> {selectedInvoice.client?.address || "—"}</div>
                <div><strong>Condición IVA:</strong> {selectedInvoice.client?.taxCategory || "Consumidor Final"}</div>
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
                  {selectedInvoice.items?.map((item: any) => (
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
                  {selectedInvoice.cae && (
                    <>
                      <div><strong>CAE N°:</strong> {selectedInvoice.cae}</div>
                      <div><strong>Vencimiento CAE:</strong> {formatDate(selectedInvoice.caeExpiration)}</div>
                    </>
                  )}
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "35px", height: "35px", backgroundColor: "#000" }}></div>
                    <span style={{ fontSize: "8px", color: "#666" }}>Comprobante Autorizado por AFIP</span>
                  </div>
                </div>
                <div className="afipFooterRight">
                  <div>Neto Gravado: {formatCurrency(Number(selectedInvoice.subtotal))}</div>
                  <div>IVA Liquidado: {formatCurrency(Number(selectedInvoice.ivaTotal))}</div>
                  <div className="afipGrandTotal">Total: {formatCurrency(Number(selectedInvoice.total), selectedInvoice.currency)}</div>
                </div>
              </div>
            </div>
            
            <div className={`${s.modalFooter} noPrint`} style={{ padding: "var(--space-4)" }}>
              <button className={s.btnPrimary} onClick={() => window.print()}>🖨️ Imprimir / Guardar PDF</button>
              <button className={s.btnSecondary} onClick={() => setSelectedInvoice(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className={s.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={`${s.modal} ${s.wide}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 850 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Nueva Factura 🧪 Homologación</h2>
              <button className={s.modalClose} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Tipo de Comprobante *</label>
                  <select
                    className={s.formSelect}
                    value={newInvoice.type}
                    onChange={(e) => setNewInvoice({ ...newInvoice, type: e.target.value })}
                  >
                    {INVOICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Punto de Venta</label>
                  <input
                    type="number"
                    className={s.formInput}
                    min={1}
                    value={newInvoice.pointOfSale}
                    onChange={(e) => setNewInvoice({ ...newInvoice, pointOfSale: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Moneda</label>
                  <select
                    className={s.formSelect}
                    value={newInvoice.currency}
                    onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}
                  >
                    <option value="ARS">🇦🇷 Pesos (ARS)</option>
                    <option value="USD">🇺🇸 Dólares (USD)</option>
                  </select>
                </div>
                
                <div className={s.formGroup}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className={s.formLabel}>Cliente *</label>
                    <label style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={newInvoice.isConsumidorFinal}
                        onChange={(e) => {
                          setNewInvoice({ 
                            ...newInvoice, 
                            isConsumidorFinal: e.target.checked,
                            clientId: e.target.checked ? "" : newInvoice.clientId
                          });
                        }}
                      />
                      Consumidor Final
                    </label>
                  </div>
                  <EntityCombobox
                    items={clients}
                    value={newInvoice.isConsumidorFinal ? "consumidor-final" : newInvoice.clientId}
                    onChange={(id) => {
                      if (id === "consumidor-final") {
                        setNewInvoice({ ...newInvoice, clientId: "", isConsumidorFinal: true });
                      } else {
                        setNewInvoice({ ...newInvoice, clientId: id, isConsumidorFinal: false });
                      }
                    }}
                    placeholder="Buscar cliente por nombre o CUIT..."
                    allowConsumidorFinal={newInvoice.type === "C" || newInvoice.type === "B"}
                    disabled={newInvoice.isConsumidorFinal}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginTop: "var(--space-6)", borderTop: "1px solid var(--border-primary)", paddingTop: "var(--space-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <label className={s.formLabel} style={{ fontSize: "var(--font-base)", fontWeight: 700 }}>
                    Items del Comprobante
                  </label>
                  <button className={`${s.btnGhost}`} onClick={addItemRow} style={{ color: "var(--primary-400)" }}>
                    + Agregar Item
                  </button>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className={s.table} style={{ marginBottom: "var(--space-4)" }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 200 }}>Seleccionar Producto (Catálogo)</th>
                        <th style={{ minWidth: 150 }}>Descripción / Concepto</th>
                        <th style={{ width: 80 }}>Cant.</th>
                        <th style={{ width: 120 }}>Precio Unit.</th>
                        <th style={{ width: 80 }}>IVA %</th>
                        <th style={{ width: 110, textAlign: "right" }}>Subtotal</th>
                        <th style={{ width: 100, textAlign: "right" }}>IVA</th>
                        <th style={{ width: 120, textAlign: "right" }}>Total</th>
                        <th style={{ width: 40 }}></th>
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
                              placeholder="Buscar en stock/servicios..."
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className={s.formInput}
                              placeholder="Descripción del ítem"
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
                              style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--font-xs)" }}
                            >
                              <option value={21}>21%</option>
                              <option value={10.5}>10.5%</option>
                              <option value={27}>27%</option>
                              <option value={0}>0%</option>
                            </select>
                          </td>
                          <td style={{ textAlign: "right", fontSize: "var(--font-xs)" }}>
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td style={{ textAlign: "right", fontSize: "var(--font-xs)" }}>
                            {formatCurrency(item.ivaAmount)}
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
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ width: 280, display: "flex", flexDirection: "column", gap: "var(--space-2)", background: "rgba(15,23,42,0.5)", padding: "var(--space-4)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-sm)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
                      <span>{formatCurrency(invoiceSubtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-sm)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>IVA:</span>
                      <span>{formatCurrency(invoiceIva)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-lg)", fontWeight: 800, paddingTop: "var(--space-2)", borderTop: "1px solid var(--border-primary)" }}>
                      <span>Total:</span>
                      <span className={s.balancePositive}>{formatCurrency(invoiceTotal, newInvoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.formGroup} style={{ marginTop: "var(--space-4)" }}>
                <label className={s.formLabel}>Observaciones</label>
                <textarea
                  className={s.formTextarea}
                  placeholder="Notas internas en el comprobante..."
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  style={{ minHeight: 60 }}
                />
              </div>

              <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "var(--radius-lg)", fontSize: "var(--font-sm)", color: "var(--warning-400)", textAlign: "left" }}>
                🧪 <strong>Modo Homologación:</strong> El comprobante y el CAE se generarán vinculados a la base de datos local y simulados con AFIP.
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button 
                className={s.btnPrimary} 
                onClick={handleCreateInvoice}
                disabled={isPending}
              >
                {isPending ? "Emitiendo..." : "🧾 Emitir Factura"}
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
