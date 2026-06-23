"use client";

import { useState, useEffect, useMemo } from "react";
import s from "@/styles/module-page.module.css";
import { formatCurrency, formatDate, formatDateTime, formatInvoiceNumber } from "@/lib/utils";
import {
  getActiveCashRegister,
  getCashRegisters,
  openCashRegister,
  closeCashRegister,
  addCashMovement,
} from "@/actions/cash";
import { getInvoiceById } from "@/actions/invoices";
import { getReceiptById } from "@/actions/receipts";
import Link from "next/link";

interface CashMovement {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  referenceId: string | null;
  date: string;
}

interface CashRegister {
  id: string;
  date: string;
  openAmount: number;
  closeAmount: number | null;
  status: "open" | "closed";
  movements: CashMovement[];
  openedBy: string;
  closedBy: string | null;
}

const CATEGORIES_INCOME = ["Venta", "Cobro", "Depósito", "Otro ingreso"];
const CATEGORIES_EXPENSE = ["Compra", "Pago proveedor", "Retiro", "Gasto", "Otro egreso"];

const TODAY = new Date().toISOString().split("T")[0];

export default function CashRegisterPage() {
  const [register, setRegister] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [pastRegisters, setPastRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [openAmount, setOpenAmount] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [movementForm, setMovementForm] = useState({ type: "income" as "income" | "expense", category: "Venta", description: "", amount: "" });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Linked Document Details states
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCajaData = async () => {
    setLoading(true);
    try {
      const activeRes = await getActiveCashRegister();
      if (activeRes.success && activeRes.data) {
        const activeData = activeRes.data as any;
        setRegister(activeData);
        setMovements(activeData.movements || []);
      } else {
        setRegister(null);
        setMovements([]);
      }

      const listRes = await getCashRegisters();
      if (listRes.success && listRes.data) {
        const listData = listRes.data as any;
        const past = listData.filter((r: any) => r.status === "closed");
        setPastRegisters(past);
      }
    } catch (err) {
      console.error("Error loading cash data:", err);
      showToast("Error al cargar datos de caja", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCajaData();
  }, []);

  const totalIncome = useMemo(() => {
    return movements.filter((m) => m.type === "income").reduce((sum, m) => sum + Number(m.amount), 0);
  }, [movements]);

  const totalExpense = useMemo(() => {
    return movements.filter((m) => m.type === "expense").reduce((sum, m) => sum + Number(m.amount), 0);
  }, [movements]);

  const currentBalance = useMemo(() => {
    return (Number(register?.openAmount) || 0) + totalIncome - totalExpense;
  }, [register, totalIncome, totalExpense]);

  const filtered = useMemo(() => {
    if (filterType === "all") return movements;
    return movements.filter((m) => m.type === filterType);
  }, [movements, filterType]);

  const handleOpenCash = async () => {
    const amount = parseFloat(openAmount);
    if (isNaN(amount) || amount < 0) {
      showToast("Ingresá un monto válido", "error");
      return;
    }
    try {
      const res = await openCashRegister(amount);
      if (res.success) {
        showToast(`Caja abierta con ${formatCurrency(amount)}`);
        setShowOpenModal(false);
        setOpenAmount("");
        await loadCajaData();
      } else {
        showToast(res.error || "Error al abrir la caja", "error");
      }
    } catch (err) {
      showToast("Error al abrir la caja", "error");
    }
  };

  const handleCloseCash = async () => {
    if (!register) return;
    if (
      confirm(
        `¿Cerrar la caja del día?\n\nApertura: ${formatCurrency(Number(register.openAmount))}\nIngresos: ${formatCurrency(totalIncome)}\nEgresos: ${formatCurrency(totalExpense)}\nCierre: ${formatCurrency(currentBalance)}`
      )
    ) {
      try {
        const res = await closeCashRegister(register.id);
        if (res.success) {
          showToast(`Caja cerrada. Balance final: ${formatCurrency(currentBalance)}`);
          await loadCajaData();
        } else {
          showToast(res.error || "Error al cerrar la caja", "error");
        }
      } catch (err) {
        showToast("Error al cerrar la caja", "error");
      }
    }
  };

  const handleAddMovement = async () => {
    const amount = parseFloat(movementForm.amount);
    if (!movementForm.description.trim()) {
      showToast("Ingresá una descripción", "error");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showToast("Ingresá un monto válido", "error");
      return;
    }

    try {
      const res = await addCashMovement({
        type: movementForm.type,
        category: movementForm.category,
        description: movementForm.description,
        amount,
      });

      if (res.success) {
        showToast(`${movementForm.type === "income" ? "Ingreso" : "Egreso"} registrado: ${formatCurrency(amount)}`);
        setShowMovementModal(false);
        setMovementForm({ type: "income", category: "Venta", description: "", amount: "" });
        await loadCajaData();
      } else {
        showToast(res.error || "Error al registrar movimiento", "error");
      }
    } catch (err) {
      showToast("Error al registrar movimiento", "error");
    }
  };

  // Fetch document details dynamically when click on row description or links
  const handleViewDocument = async (mov: any) => {
    if (!mov.referenceId) return;
    setLoadingDoc(true);
    try {
      // Try fetching as Invoice first (Invoices/NC/ND)
      const invRes = await getInvoiceById(mov.referenceId);
      if (invRes.success && invRes.data) {
        setSelectedInvoice(invRes.data);
      } else {
        // Fallback to Receipt
        const recRes = await getReceiptById(mov.referenceId);
        if (recRes.success && recRes.data) {
          setSelectedReceipt(recRes.data);
        } else {
          showToast("No se encontró el documento en el servidor", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Error al obtener los detalles del comprobante", "error");
    } finally {
      setLoadingDoc(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}>
        <div className={s.spinner}>Cargando estado de caja...</div>
      </div>
    );
  }

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Caja</h1>
          <p className={s.pageSubtitle}>
            {register?.status === "open"
              ? `Caja abierta — ${new Date(register.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}`
              : "Caja cerrada"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          {register?.status === "open" ? (
            <>
              <button className={s.btnPrimary} onClick={() => setShowMovementModal(true)}>
                + Nuevo Movimiento
              </button>
              <button className={s.btnDanger} onClick={handleCloseCash}>
                🔒 Cerrar Caja
              </button>
            </>
          ) : (
            <button className={s.btnPrimary} onClick={() => setShowOpenModal(true)}>
              🔓 Abrir Caja
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🔓</div>
          <div className={s.statCardValue}>{formatCurrency(Number(register?.openAmount || 0))}</div>
          <div className={s.statCardLabel}>Apertura</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📈</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>{formatCurrency(totalIncome)}</div>
          <div className={s.statCardLabel}>Ingresos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📉</div>
          <div className={`${s.statCardValue} ${s.balanceNegative}`}>{formatCurrency(totalExpense)}</div>
          <div className={s.statCardLabel}>Egresos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>💰</div>
          <div className={`${s.statCardValue} ${currentBalance >= 0 ? s.balancePositive : s.balanceNegative}`}>
            {formatCurrency(currentBalance)}
          </div>
          <div className={s.statCardLabel}>Balance Actual</div>
        </div>
      </div>

      {register?.status === "open" && (
        <>
          <div className={s.toolbar}>
            <button
              className={`${s.filterBtn} ${filterType === "all" ? s.active : ""}`}
              onClick={() => setFilterType("all")}
            >
              📋 Todos
            </button>
            <button
              className={`${s.filterBtn} ${filterType === "income" ? s.active : ""}`}
              onClick={() => setFilterType("income")}
            >
              📈 Ingresos
            </button>
            <button
              className={`${s.filterBtn} ${filterType === "expense" ? s.active : ""}`}
              onClick={() => setFilterType("expense")}
            >
              📉 Egresos
            </button>
            <div className={s.toolbarRight}>
              <span style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)" }}>
                {filtered.length} movimientos
              </span>
            </div>
          </div>

          <div className={s.tableWrapper}>
            {filtered.length > 0 ? (
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((mov) => (
                    <tr key={mov.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {new Date(mov.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td>
                        <span className={`${s.badge} ${mov.type === "income" ? s.active : s.danger}`}>
                          {mov.type === "income" ? "📈 Ingreso" : "📉 Egreso"}
                        </span>
                      </td>
                      <td>
                        <span className={`${s.badge} ${s.info}`}>{mov.category}</span>
                      </td>
                      <td>
                        <div className={s.cellMain}>
                          {mov.referenceId ? (
                            <button
                              onClick={() => handleViewDocument(mov)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                textDecoration: "underline",
                                color: "var(--text-secondary)",
                                textAlign: "left",
                                fontWeight: 600,
                              }}
                              title="Ver comprobante asociado"
                            >
                              🔍 {mov.description}
                            </button>
                          ) : (
                            mov.description
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          className={mov.type === "income" ? s.balancePositive : s.balanceNegative}
                          style={{ fontSize: "var(--font-base)", fontWeight: 700 }}
                        >
                          {mov.type === "income" ? "+" : "-"}{formatCurrency(Number(mov.amount))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}>💵</div>
                <h3 className={s.emptyTitle}>Sin movimientos</h3>
                <p className={s.emptyDescription}>Registrá el primer movimiento del día</p>
                <button className={s.btnPrimary} onClick={() => setShowMovementModal(true)}>
                  + Nuevo Movimiento
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Past Registers */}
      {register?.status === "closed" && (
        <div className={s.tableWrapper} style={{ marginTop: "var(--space-4)" }}>
          <h2 style={{ fontSize: "var(--font-lg)", fontWeight: 800, marginBottom: "var(--space-4)" }}>
            Historial de Cierres de Caja
          </h2>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Estado</th>
                <th>Operador</th>
              </tr>
            </thead>
            <tbody>
              {[register, ...pastRegisters].map((reg) => (
                <tr key={reg.id}>
                  <td className={s.cellMain}>
                    {new Date(reg.date).toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td>{formatCurrency(Number(reg.openAmount))}</td>
                  <td
                    className={
                      Number(reg.closeAmount) >= Number(reg.openAmount) ? s.balancePositive : s.balanceNegative
                    }
                  >
                    {reg.closeAmount ? formatCurrency(Number(reg.closeAmount)) : "—"}
                  </td>
                  <td>
                    <span className={`${s.badge} ${reg.status === "open" ? s.warning : s.active}`}>
                      {reg.status === "open" ? "Abierta" : "Cerrada"}
                    </span>
                  </td>
                  <td>{reg.openedBy || "Sistema"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Loading Overlay spinner */}
      {loadingDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>Cargando comprobante...</div>
        </div>
      )}

      {/* Open Cash Modal */}
      {showOpenModal && (
        <div className={s.modalOverlay} onClick={() => setShowOpenModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>🔓 Abrir Caja</h2>
              <button className={s.modalClose} onClick={() => setShowOpenModal(false)}>
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Monto de Apertura *</label>
                <input
                  type="number"
                  className={s.formInput}
                  placeholder="50000"
                  value={openAmount}
                  onChange={(e) => setOpenAmount(e.target.value)}
                  autoFocus
                />
                <span
                  style={{
                    fontSize: "var(--font-xs)",
                    color: "var(--text-tertiary)",
                    marginTop: "var(--space-1)",
                  }}
                >
                  Efectivo disponible al inicio del día
                </span>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowOpenModal(false)}>
                Cancelar
              </button>
              <button className={s.btnPrimary} onClick={handleOpenCash}>
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Movement Modal */}
      {showMovementModal && (
        <div className={s.modalOverlay} onClick={() => setShowMovementModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Nuevo Movimiento</h2>
              <button className={s.modalClose} onClick={() => setShowMovementModal(false)}>
                ✕
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Tipo *</label>
                  <select
                    className={s.formSelect}
                    value={movementForm.type}
                    onChange={(e) => {
                      const type = e.target.value as "income" | "expense";
                      setMovementForm({ ...movementForm, type, category: type === "income" ? "Venta" : "Compra" });
                    }}
                  >
                    <option value="income">📈 Ingreso</option>
                    <option value="expense">📉 Egreso</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Categoría</label>
                  <select
                    className={s.formSelect}
                    value={movementForm.category}
                    onChange={(e) => setMovementForm({ ...movementForm, category: e.target.value })}
                  >
                    {(movementForm.type === "income" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Descripción *</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="Detalle del movimiento"
                    value={movementForm.description}
                    onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                  />
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Monto *</label>
                  <input
                    type="number"
                    className={s.formInput}
                    placeholder="0.00"
                    value={movementForm.amount}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowMovementModal(false)}>
                Cancelar
              </button>
              <button className={s.btnPrimary} onClick={handleAddMovement}>
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AFIP Invoice Detail Modal */}
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
                      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "35px", height: "35px", backgroundColor: "#000" }}></div>
                        <span style={{ fontSize: "8px", color: "#666" }}>Comprobante Autorizado por AFIP</span>
                      </div>
                    </>
                  )}
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

      {/* AFIP Receipt Detail Modal */}
      {selectedReceipt && (
        <div className={s.modalOverlay} onClick={() => setSelectedReceipt(null)}>
          <div className={`${s.modal} printableArea`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, padding: 0 }}>
            {/* Modal Header */}
            <div className={`${s.modalHeader} noPrint`} style={{ padding: "var(--space-4)" }}>
              <h2 className={s.modalTitle}>Detalles de Recibo</h2>
              <button className={s.modalClose} onClick={() => setSelectedReceipt(null)}>✕</button>
            </div>
            
            {/* Receipt Body */}
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
                  <div>N° {selectedReceipt.number}</div>
                  <div>Fecha: {formatDate(selectedReceipt.date)}</div>
                  <div>CUIT: 30-71458921-9</div>
                  <div>IIBB: 30-71458921-9</div>
                  <div>Inicio Act.: 01/01/2026</div>
                </div>
              </div>
              
              <div className="afipClientBox">
                <div>
                  <strong>{selectedReceipt.type === "collection" ? "Recibimos de:" : "Pagamos a:"}</strong>{" "}
                  {selectedReceipt.client?.name || selectedReceipt.supplier?.name || "—"}
                </div>
                <div>
                  <strong>CUIT:</strong>{" "}
                  {selectedReceipt.client?.cuit || selectedReceipt.supplier?.cuit || "—"}
                </div>
                <div>
                  <strong>Domicilio:</strong>{" "}
                  {selectedReceipt.client?.address || selectedReceipt.supplier?.address || "—"}
                </div>
                <div>
                  <strong>Categoría IVA:</strong>{" "}
                  {selectedReceipt.client?.taxCategory || selectedReceipt.supplier?.taxCategory || "—"}
                </div>
              </div>
              
              <div style={{ padding: "var(--space-4)" }}>
                <p style={{ fontSize: "var(--font-sm)", marginBottom: "var(--space-2)" }}>
                  Concepto del movimiento y método de pago registrado:
                </p>
                <div style={{ padding: "var(--space-3)", background: "#fcfcfc", border: "1px solid #333" }}>
                  <div><strong>Método de Pago:</strong> {selectedReceipt.paymentMethod}</div>
                  {selectedReceipt.reference && <div><strong>Referencia / Cheque:</strong> {selectedReceipt.reference}</div>}
                  {selectedReceipt.notes && <div><strong>Notas:</strong> {selectedReceipt.notes}</div>}
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
                    Total: {formatCurrency(Number(selectedReceipt.total))}
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

      {toast && (
        <div className={`${s.toast} ${s[toast.type]}`}>
          <span className={s.toastIcon}>{toast.type === "success" ? "✅" : "❌"}</span>
          <span className={s.toastMessage}>{toast.message}</span>
          <button className={s.toastClose} onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
