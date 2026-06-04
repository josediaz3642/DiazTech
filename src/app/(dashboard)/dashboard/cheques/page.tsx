"use client";

import { useState, useMemo } from "react";
import s from "@/styles/module-page.module.css";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Check {
  id: string;
  type: "received" | "issued";
  bankName: string;
  number: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: string;
  payer: string;
  payee: string;
  notes: string;
}

const STATUSES = ["pending", "deposited", "cashed", "bounced", "cancelled", "endorsed"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", deposited: "Depositado", cashed: "Cobrado",
  bounced: "Rechazado", cancelled: "Anulado", endorsed: "Endosado",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "warning", deposited: "info", cashed: "active",
  bounced: "danger", cancelled: "inactive", endorsed: "primary",
};

const MOCK_CHECKS: Check[] = [
  { id: "ch1", type: "received", bankName: "Banco Nación", number: "00124567", amount: 250000, currency: "ARS", issueDate: "2026-05-10", dueDate: "2026-06-10", status: "pending", payer: "Electro Hogar S.A.", payee: "DiazTech", notes: "" },
  { id: "ch2", type: "received", bankName: "Banco Galicia", number: "00987654", amount: 180000, currency: "ARS", issueDate: "2026-05-05", dueDate: "2026-05-20", status: "pending", payer: "Constructora Andes", payee: "DiazTech", notes: "Pago parcial factura" },
  { id: "ch3", type: "received", bankName: "Banco Macro", number: "00555888", amount: 5000, currency: "USD", issueDate: "2026-04-28", dueDate: "2026-05-28", status: "pending", payer: "Importadora Chang", payee: "DiazTech", notes: "" },
  { id: "ch4", type: "received", bankName: "Banco Provincia", number: "00333222", amount: 95000, currency: "ARS", issueDate: "2026-04-15", dueDate: "2026-05-15", status: "deposited", payer: "Ferretería Don Pedro", payee: "DiazTech", notes: "" },
  { id: "ch5", type: "received", bankName: "HSBC", number: "00111999", amount: 320000, currency: "ARS", issueDate: "2026-03-20", dueDate: "2026-04-20", status: "cashed", payer: "Supermercado El Sol", payee: "DiazTech", notes: "" },
  { id: "ch6", type: "received", bankName: "Banco Credicoop", number: "00777444", amount: 45000, currency: "ARS", issueDate: "2026-04-01", dueDate: "2026-05-01", status: "bounced", payer: "Panadería La Estrella", payee: "DiazTech", notes: "Fondos insuficientes" },
  { id: "ch7", type: "issued", bankName: "Banco Nación", number: "00001234", amount: 450000, currency: "ARS", issueDate: "2026-05-12", dueDate: "2026-06-12", status: "pending", payer: "DiazTech", payee: "Alimentos del Sur S.A.", notes: "" },
  { id: "ch8", type: "issued", bankName: "Banco Nación", number: "00001235", amount: 120000, currency: "ARS", issueDate: "2026-05-08", dueDate: "2026-05-22", status: "cashed", payer: "DiazTech", payee: "Papelera Argentina", notes: "" },
];

const EMPTY_CHECK: Omit<Check, "id"> = {
  type: "received", bankName: "", number: "", amount: 0, currency: "ARS",
  issueDate: new Date().toISOString().split("T")[0], dueDate: "", status: "pending",
  payer: "", payee: "", notes: "",
};

export default function ChecksPage() {
  const [checks, setChecks] = useState<Check[]>(MOCK_CHECKS);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "received" | "issued">("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Check | null>(null);
  const [formData, setFormData] = useState(EMPTY_CHECK);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return checks.filter((ch) => {
      const matchSearch = ch.payer.toLowerCase().includes(search.toLowerCase()) ||
        ch.payee.toLowerCase().includes(search.toLowerCase()) ||
        ch.number.includes(search) || ch.bankName.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || ch.type === filterType;
      const matchStatus = filterStatus === "all" || ch.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [checks, search, filterType, filterStatus]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const pendingReceived = checks.filter((ch) => ch.type === "received" && ch.status === "pending");
  const pendingReceivedTotal = pendingReceived.reduce((sum, ch) => sum + (ch.currency === "ARS" ? ch.amount : 0), 0);
  const pendingIssuedTotal = checks.filter((ch) => ch.type === "issued" && ch.status === "pending").reduce((sum, ch) => sum + ch.amount, 0);
  const bouncedCount = checks.filter((ch) => ch.status === "bounced").length;

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringCount = pendingReceived.filter((ch) => {
    const due = new Date(ch.dueDate);
    return due <= nextWeek && due >= today;
  }).length;

  const openCreate = () => { setEditing(null); setFormData(EMPTY_CHECK); setShowModal(true); };
  const openEdit = (ch: Check) => {
    setEditing(ch);
    setFormData({ type: ch.type, bankName: ch.bankName, number: ch.number, amount: ch.amount, currency: ch.currency, issueDate: ch.issueDate, dueDate: ch.dueDate, status: ch.status, payer: ch.payer, payee: ch.payee, notes: ch.notes });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.bankName.trim() || !formData.number.trim()) { showToast("Banco y número son obligatorios", "error"); return; }
    if (editing) {
      setChecks((prev) => prev.map((ch) => ch.id === editing.id ? { ...ch, ...formData } : ch));
      showToast("Cheque actualizado");
    } else {
      setChecks((prev) => [{ ...formData, id: Date.now().toString() }, ...prev]);
      showToast("Cheque registrado");
    }
    setShowModal(false);
  };

  const handleChangeStatus = (check: Check, newStatus: string) => {
    setChecks((prev) => prev.map((ch) => ch.id === check.id ? { ...ch, status: newStatus } : ch));
    showToast(`Cheque ${check.number} → ${STATUS_LABELS[newStatus]}`);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Cheques</h1>
          <p className={s.pageSubtitle}>Cartera de cheques recibidos y emitidos</p>
        </div>
        <button className={s.btnPrimary} onClick={openCreate}>+ Nuevo Cheque</button>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📥</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>{formatCurrency(pendingReceivedTotal)}</div>
          <div className={s.statCardLabel}>A Cobrar (pendientes)</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📤</div>
          <div className={`${s.statCardValue} ${s.balanceNegative}`}>{formatCurrency(pendingIssuedTotal)}</div>
          <div className={s.statCardLabel}>A Pagar (emitidos)</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>⏰</div>
          <div className={`${s.statCardValue} ${expiringCount > 0 ? s.balanceNegative : ""}`}>{expiringCount}</div>
          <div className={s.statCardLabel}>Vencen esta semana</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>❌</div>
          <div className={`${s.statCardValue} ${bouncedCount > 0 ? s.balanceNegative : ""}`}>{bouncedCount}</div>
          <div className={s.statCardLabel}>Rechazados</div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <span className={s.searchIcon}>🔍</span>
          <input type="text" className={s.searchInput} placeholder="Buscar por número, banco, librador..."
            value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
        <button className={`${s.filterBtn} ${filterType === "received" ? s.active : ""}`} onClick={() => setFilterType(filterType === "received" ? "all" : "received")}>📥 Recibidos</button>
        <button className={`${s.filterBtn} ${filterType === "issued" ? s.active : ""}`} onClick={() => setFilterType(filterType === "issued" ? "all" : "issued")}>📤 Emitidos</button>
        <select className={s.filterBtn} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          style={{ background: "var(--input-bg)", cursor: "pointer" }}>
          <option value="all">Todos los estados</option>
          {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
        </select>
      </div>

      <div className={s.tableWrapper}>
        {paginated.length > 0 ? (
          <>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>N° Cheque</th>
                  <th>Banco</th>
                  <th>Librador / Beneficiario</th>
                  <th>Emisión</th>
                  <th>Vencimiento</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((ch) => {
                  const days = getDaysUntilDue(ch.dueDate);
                  return (
                    <tr key={ch.id}>
                      <td><span className={`${s.badge} ${ch.type === "received" ? s.active : s.primary}`}>{ch.type === "received" ? "📥 Recibido" : "📤 Emitido"}</span></td>
                      <td><span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{ch.number}</span></td>
                      <td>{ch.bankName}</td>
                      <td>
                        <div className={s.cellMain}>{ch.type === "received" ? ch.payer : ch.payee}</div>
                        {ch.notes && <div className={s.cellSub}>{ch.notes}</div>}
                      </td>
                      <td>{formatDate(ch.issueDate)}</td>
                      <td>
                        <div>{formatDate(ch.dueDate)}</div>
                        {ch.status === "pending" && (
                          <div className={s.cellSub} style={{ color: days <= 3 ? "var(--error-400)" : days <= 7 ? "var(--warning-400)" : "var(--text-tertiary)" }}>
                            {days < 0 ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? "Vence hoy" : `En ${days} días`}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>
                          {formatCurrency(ch.amount, ch.currency)}
                        </span>
                      </td>
                      <td><span className={`${s.badge} ${s[STATUS_BADGE[ch.status]] || s.info}`}>{STATUS_LABELS[ch.status]}</span></td>
                      <td>
                        <div className={s.cellActions}>
                          {ch.status === "pending" && (
                            <>
                              {ch.type === "received" && (
                                <button className={`${s.actionBtn} ${s.edit}`} onClick={() => handleChangeStatus(ch, "deposited")} title="Depositar">🏦</button>
                              )}
                              <button className={`${s.actionBtn} ${s.edit}`} onClick={() => handleChangeStatus(ch, "cashed")} title="Cobrado/Pagado">✅</button>
                            </>
                          )}
                          <button className={`${s.actionBtn} ${s.edit}`} onClick={() => openEdit(ch)} title="Editar">✏️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className={s.pagination}>
                <div className={s.paginationInfo}>Mostrando {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}</div>
                <div className={s.paginationButtons}>
                  <button className={s.pageBtn} onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}>←</button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} className={`${s.pageBtn} ${currentPage === i + 1 ? s.active : ""}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                  ))}
                  <button className={s.pageBtn} onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages}>→</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>📝</div>
            <h3 className={s.emptyTitle}>No se encontraron cheques</h3>
            <p className={s.emptyDescription}>{search ? "Probá otros términos" : "Registrá tu primer cheque"}</p>
            {!search && <button className={s.btnPrimary} onClick={openCreate}>+ Nuevo Cheque</button>}
          </div>
        )}
      </div>

      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={`${s.modal} ${s.wide}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>{editing ? "Editar Cheque" : "Nuevo Cheque"}</h2>
              <button className={s.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Tipo *</label>
                  <select className={s.formSelect} value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as "received" | "issued" })}>
                    <option value="received">📥 Recibido</option>
                    <option value="issued">📤 Emitido</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Moneda</label>
                  <select className={s.formSelect} value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                    <option value="ARS">🇦🇷 ARS</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Banco *</label>
                  <input type="text" className={s.formInput} placeholder="Banco Nación" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>N° de Cheque *</label>
                  <input type="text" className={s.formInput} placeholder="00124567" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Monto *</label>
                  <input type="number" className={s.formInput} placeholder="0.00" value={formData.amount || ""} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Estado</label>
                  <select className={s.formSelect} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Fecha Emisión</label>
                  <input type="date" className={s.formInput} value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Fecha Vencimiento *</label>
                  <input type="date" className={s.formInput} value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>{formData.type === "received" ? "Librador (quién emite)" : "Beneficiario"}</label>
                  <input type="text" className={s.formInput} placeholder="Nombre de empresa o persona" value={formData.type === "received" ? formData.payer : formData.payee}
                    onChange={(e) => setFormData({ ...formData, [formData.type === "received" ? "payer" : "payee"]: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Notas</label>
                  <input type="text" className={s.formInput} placeholder="Observaciones" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
              <button className={s.btnPrimary} onClick={handleSave}>{editing ? "Guardar" : "Registrar Cheque"}</button>
            </div>
          </div>
        </div>
      )}

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
