"use client";

import { useState, useMemo, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import { formatDate } from "@/lib/utils";
import { generateDeliveryLink } from "@/lib/whatsapp";
import EntityCombobox, { EntityItem } from "@/components/EntityCombobox";
import { createRemito, updateRemitoStatus, getRemitoById } from "@/actions/remitos";

interface RemitosClientProps {
  initialRemitos: any[];
  clients: EntityItem[];
  products: any[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  delivered: "Entregado",
  cancelled: "Cancelado",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "warning",
  delivered: "active",
  cancelled: "inactive",
};

const UNITS = ["unidad", "kg", "litro", "metro", "caja", "pack", "rollo", "bolsa", "pallet"];

const EMPTY_ITEM = {
  productId: "",
  description: "",
  quantity: 1,
  unit: "unidad",
};

export default function RemitosClient({
  initialRemitos,
  clients,
  products,
}: RemitosClientProps) {
  const [remitos, setRemitos] = useState<any[]>(initialRemitos);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRemito, setSelectedRemito] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form state
  const [newRemito, setNewRemito] = useState({
    clientId: "",
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
    return remitos.filter((r) => {
      const clientName = r.client?.name || "Sin identificar";
      const matchSearch =
        clientName.toLowerCase().includes(search.toLowerCase()) ||
        r.number.toString().includes(search);
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [remitos, search, filterStatus]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Calculate statistics from database data
  const stats = useMemo(() => {
    const total = remitos.length;
    const pending = remitos.filter((r) => r.status === "pending").length;
    const delivered = remitos.filter((r) => r.status === "delivered").length;
    const totalUnitsDispatched = remitos
      .filter((r) => r.status === "delivered")
      .reduce(
        (sum, r) =>
          sum +
          r.items.reduce((itemSum: number, item: any) => itemSum + Number(item.quantity), 0),
        0
      );

    return { total, pending, delivered, totalUnitsDispatched };
  }, [remitos]);

  const updateItemField = (index: number, field: string, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setFormItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          productId: prod.id,
          description: prod.name,
          unit: prod.unit || "unidad",
        };
        return updated;
      });
    } else {
      setFormItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          productId: "",
        };
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

  const handleCreateRemito = () => {
    if (!newRemito.clientId) {
      showToast("Seleccioná un cliente", "error");
      return;
    }
    if (formItems.some((i) => !i.description.trim())) {
      showToast("Completá la descripción de todos los ítems", "error");
      return;
    }
    if (formItems.some((i) => i.quantity <= 0)) {
      showToast("La cantidad debe ser mayor a 0 en todos los ítems", "error");
      return;
    }

    startTransition(async () => {
      const payload = {
        clientId: newRemito.clientId,
        date: new Date().toISOString(),
        notes: newRemito.notes,
        items: formItems.map((item) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
        })),
      };

      const res = await createRemito(payload);
      if (res.success && res.data) {
        showToast(`Remito N°${res.data.number} creado con éxito`);
        setRemitos((prev) => [res.data, ...prev]);
        setShowCreateModal(false);
        setNewRemito({ clientId: "", notes: "" });
        setFormItems([{ ...EMPTY_ITEM, id: "1" }]);
      } else {
        showToast(res.error || "Error al crear el remito", "error");
      }
    });
  };

  const handleChangeStatus = (remito: any, status: string) => {
    startTransition(async () => {
      const res = await updateRemitoStatus(remito.id, status);
      if (res.success) {
        showToast(`Remito N°${remito.number} cambiado a ${STATUS_LABELS[status]}`);
        setRemitos((prev) =>
          prev.map((r) => (r.id === remito.id ? { ...r, status } : r))
        );
        if (selectedRemito && selectedRemito.id === remito.id) {
          setSelectedRemito((prev: any) => ({ ...prev, status }));
        }
      } else {
        showToast(res.error || "Error al cambiar el estado", "error");
      }
    });
  };

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true);
    const res = await getRemitoById(id);
    setLoadingDetail(false);
    if (res.success && res.data) {
      setSelectedRemito(res.data);
    } else {
      showToast(res.error || "No se pudo cargar el detalle", "error");
    }
  };

  const productItemsForCombobox = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      cuit: p.code,
      taxCategory: p.unit,
    }));
  }, [products]);

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Remitos</h1>
          <p className={s.pageSubtitle}>Comprobantes de entrega vinculados al stock de depósitos 🚚</p>
        </div>
        <button className={s.btnPrimary} onClick={() => setShowCreateModal(true)}>
          + Nuevo Remito
        </button>
      </div>

      {/* Stats row */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🚚</div>
          <div className={s.statCardValue}>{stats.total}</div>
          <div className={s.statCardLabel}>Total Remitos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>⏳</div>
          <div className={`${s.statCardValue} ${stats.pending > 0 ? s.balanceNegative : ""}`}>
            {stats.pending}
          </div>
          <div className={s.statCardLabel}>Pendientes Entrega</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>✅</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>{stats.delivered}</div>
          <div className={s.statCardLabel}>Entregados</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📦</div>
          <div className={s.statCardValue}>{stats.totalUnitsDispatched.toLocaleString("es-AR")}</div>
          <div className={s.statCardLabel}>Unidades Entregadas</div>
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

      {/* Remitos list */}
      <div className={s.tableWrapper}>
        {paginated.length > 0 ? (
          <>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Items</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right", width: 140 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => {
                  const clientPhone = r.client?.phone || "";
                  const clientName = r.client?.name || "Sin identificar";

                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                          R-{String(r.number).padStart(4, "0")}
                        </span>
                      </td>
                      <td>
                        <div className={s.cellMain}>{clientName}</div>
                        {r.notes && <div className={s.cellSub}>{r.notes}</div>}
                      </td>
                      <td>{formatDate(r.date)}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {r.items.slice(0, 2).map((item: any) => (
                            <div key={item.id} style={{ fontSize: "var(--font-xs)" }}>
                              <span style={{ fontWeight: 600 }}>{Number(item.quantity)}</span>
                              <span style={{ color: "var(--text-tertiary)" }}> {item.unit} </span>
                              <span>{item.description}</span>
                            </div>
                          ))}
                          {r.items.length > 2 && (
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                              +{r.items.length - 2} más
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`${s.badge} ${s[STATUS_BADGE[r.status]]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td>
                        <div className={s.cellActions} style={{ justifyContent: "flex-end" }}>
                          <button
                            className={s.actionBtn}
                            onClick={() => handleViewDetail(r.id)}
                            title="Ver detalles"
                          >
                            👁️
                          </button>
                          {r.status === "pending" && (
                            <>
                              <button
                                className={`${s.actionBtn} ${s.edit}`}
                                onClick={() => handleChangeStatus(r, "delivered")}
                                title="Entregado"
                              >
                                ✅
                              </button>
                              {clientPhone && (
                                <a
                                  href={generateDeliveryLink(clientPhone, clientName, r.number)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`${s.actionBtn} ${s.whatsapp}`}
                                  title="Notificar por WhatsApp"
                                >
                                  💬
                                </a>
                              )}
                              <button
                                className={`${s.actionBtn} ${s.delete}`}
                                onClick={() => handleChangeStatus(r, "cancelled")}
                                title="Cancelar"
                              >
                                ❌
                              </button>
                            </>
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
            <div className={s.emptyIcon}>🚚</div>
            <h3 className={s.emptyTitle}>No se encontraron remitos</h3>
            <p className={s.emptyDescription}>
              {search ? "Probá otros términos" : "Creá tu primer remito"}
            </p>
          </div>
        )}
      </div>

      {/* Remito Detail Modal */}
      {selectedRemito && (
        <div className={s.modalOverlay} onClick={() => setSelectedRemito(null)}>
          <div className={`${s.modal} printableArea`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, padding: 0 }}>
            {/* Modal Header */}
            <div className={`${s.modalHeader} noPrint`} style={{ padding: "var(--space-4)" }}>
              <h2 className={s.modalTitle}>Detalles de Remito</h2>
              <button className={s.modalClose} onClick={() => setSelectedRemito(null)}>✕</button>
            </div>
            
            {/* AFIP-style Remito Voucher */}
            <div className="afipVoucher" style={{ margin: "15px" }}>
              <div className="afipHeaderBox">
                <div className="afipHeaderLeft">
                  <div className="afipCompanyTitle">DIAZTECH</div>
                  <div style={{ fontWeight: 700 }}>José Díaz S.A.</div>
                  <div>Av. Rivadavia 1234, CABA</div>
                  <div>Condición IVA: Responsable Inscripto</div>
                </div>
                
                <div className="afipHeaderLetterBox">
                  <span className="afipHeaderLetter">R</span>
                  <span className="afipHeaderCode">cod. 091</span>
                </div>
                
                <div className="afipHeaderRight">
                  <div className="afipVoucherTitle">REMITO</div>
                  <div>N° {String(selectedRemito.number).padStart(8, "0")}</div>
                  <div>Fecha Despacho: {formatDate(selectedRemito.date)}</div>
                  <div>CUIT: 30-71458921-9</div>
                  <div>IIBB: 30-71458921-9</div>
                  <div>Inicio Act.: 01/01/2026</div>
                </div>
              </div>
              
              <div className="afipClientBox">
                <div><strong>Destinatario:</strong> {selectedRemito.client?.name || "Sin identificar"}</div>
                <div><strong>CUIT:</strong> {selectedRemito.client?.cuit || "—"}</div>
                <div><strong>Domicilio Entrega:</strong> {selectedRemito.client?.address || "—"}</div>
                <div><strong>Condición IVA:</strong> {selectedRemito.client?.taxCategory || "Consumidor Final"}</div>
              </div>
              
              <table className="afipItemsTable">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th className="right" style={{ width: 100 }}>Cant. Despachada</th>
                    <th style={{ width: 100 }}>Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRemito.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product?.code || "—"}</td>
                      <td>{item.description}</td>
                      <td className="right" style={{ fontWeight: 600 }}>{Number(item.quantity)}</td>
                      <td>{item.unit || "U."}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="afipFooterBox">
                <div className="afipFooterLeft">
                  {selectedRemito.notes && (
                    <div><strong>Notas de entrega:</strong> {selectedRemito.notes}</div>
                  )}
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "35px", height: "35px", backgroundColor: "#000" }}></div>
                    <span style={{ fontSize: "8px", color: "#666" }}>Documento de Traslado de Mercadería</span>
                  </div>
                </div>
                <div className="afipFooterRight">
                  <div style={{ marginTop: "40px", borderTop: "1px dashed #333", width: "150px", textAlign: "center", paddingTop: "5px" }}>
                    Firma Conformidad
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`${s.modalFooter} noPrint`} style={{ padding: "var(--space-4)" }}>
              <div style={{ display: "flex", gap: 8, flex: 1 }}>
                {selectedRemito.status === "pending" && (
                  <>
                    <button className={s.btnPrimary} onClick={() => handleChangeStatus(selectedRemito, "delivered")}>Entregado</button>
                    <button className={s.btnSecondary} style={{ background: "var(--danger-600)" }} onClick={() => handleChangeStatus(selectedRemito, "cancelled")}>Cancelar Remito</button>
                  </>
                )}
                <button className={s.btnPrimary} onClick={() => window.print()}>🖨️ Imprimir / Guardar PDF</button>
              </div>
              <button className={s.btnSecondary} onClick={() => setSelectedRemito(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Remito Modal */}
      {showCreateModal && (
        <div className={s.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={`${s.modal} ${s.wide}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Nuevo Remito</h2>
              <button className={s.modalClose} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Cliente *</label>
                  <EntityCombobox
                    items={clients}
                    value={newRemito.clientId}
                    onChange={(id) => setNewRemito({ ...newRemito, clientId: id })}
                    placeholder="Buscar cliente por nombre o CUIT..."
                  />
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginTop: "var(--space-5)", borderTop: "1px solid var(--border-primary)", paddingTop: "var(--space-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <label className={s.formLabel} style={{ fontWeight: 700 }}>Items a Entregar</label>
                  <button className={s.btnGhost} onClick={addItemRow} style={{ color: "var(--primary-400)" }}>
                    + Agregar Item
                  </button>
                </div>
                {formItems.map((item, idx) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: "grid", 
                      gridTemplateColumns: "1.5fr 1.5fr 80px 100px 36px", 
                      gap: "var(--space-2)", 
                      marginBottom: "var(--space-2)", 
                      alignItems: "center" 
                    }}
                  >
                    <EntityCombobox
                      items={productItemsForCombobox}
                      value={item.productId}
                      onChange={(productId) => handleProductSelect(idx, productId)}
                      placeholder="Buscar producto..."
                    />
                    <input 
                      type="text" 
                      className={s.formInput} 
                      placeholder="Descripción del concepto" 
                      value={item.description}
                      onChange={(e) => updateItemField(idx, "description", e.target.value)} 
                    />
                    <input 
                      type="number" 
                      className={s.formInput} 
                      placeholder="Cant." 
                      min={1}
                      value={item.quantity || ""}
                      onChange={(e) => updateItemField(idx, "quantity", Number(e.target.value))}
                      style={{ textAlign: "right" }} 
                    />
                    <select 
                      className={s.formSelect} 
                      value={item.unit}
                      onChange={(e) => updateItemField(idx, "unit", e.target.value)}
                    >
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    {formItems.length > 1 && (
                      <button 
                        className={`${s.actionBtn} ${s.delete}`} 
                        onClick={() => removeItemRow(idx)} 
                        style={{ width: 28, height: 28 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className={s.formGroup} style={{ marginTop: "var(--space-4)" }}>
                <label className={s.formLabel}>Notas / Instrucciones de entrega</label>
                <textarea
                  className={s.formTextarea}
                  placeholder="Ej: Entregar en depósito secundario en horario comercial..."
                  value={newRemito.notes}
                  onChange={(e) => setNewRemito({ ...newRemito, notes: e.target.value })}
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
                onClick={handleCreateRemito}
                disabled={isPending}
              >
                {isPending ? "Creando..." : "Crear Remito"}
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
