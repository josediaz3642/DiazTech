"use client";

import { useState, useMemo } from "react";
import s from "@/styles/module-page.module.css";
import { formatCurrency } from "@/lib/utils";

interface BankMovement {
  id: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  balance: number;
  referenceId: string;
  date: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  cbu: string;
  alias: string;
  currency: string;
  balance: number;
  isActive: boolean;
  movements: BankMovement[];
}

const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: "b1", bankName: "Banco Nación", accountType: "CC", accountNumber: "4015-0012345678",
    cbu: "0110000000401500123456", alias: "DIAZTECH.NACION", currency: "ARS", balance: 2450000, isActive: true,
    movements: [
      { id: "bm1", type: "credit", description: "Transferencia recibida — Electro Hogar S.A.", amount: 350000, balance: 2450000, referenceId: "R-001", date: "2026-05-18T10:30:00" },
      { id: "bm2", type: "debit", description: "Pago proveedor — Alimentos del Sur", amount: 180000, balance: 2100000, referenceId: "P-001", date: "2026-05-18T09:15:00" },
      { id: "bm3", type: "credit", description: "Depósito efectivo", amount: 200000, balance: 2280000, referenceId: "", date: "2026-05-17T16:00:00" },
      { id: "bm4", type: "debit", description: "Débito automático — Servicio internet", amount: 25000, balance: 2080000, referenceId: "", date: "2026-05-17T08:00:00" },
      { id: "bm5", type: "credit", description: "Transferencia recibida — Constructora Andes", amount: 500000, balance: 2105000, referenceId: "R-002", date: "2026-05-16T14:20:00" },
    ],
  },
  {
    id: "b2", bankName: "Banco Galicia", accountType: "CA", accountNumber: "7890-0098765432",
    cbu: "0070000000789000987654", alias: "DIAZTECH.GALICIA", currency: "ARS", balance: 890000, isActive: true,
    movements: [
      { id: "bm6", type: "credit", description: "Cobro MercadoPago — Suscripción", amount: 45000, balance: 890000, referenceId: "MP-001", date: "2026-05-18T08:00:00" },
      { id: "bm7", type: "debit", description: "Transferencia a proveedor — Papelera", amount: 120000, balance: 845000, referenceId: "P-002", date: "2026-05-17T11:30:00" },
    ],
  },
  {
    id: "b3", bankName: "Banco Galicia", accountType: "CA", accountNumber: "7890-USD-0054321",
    cbu: "0070000000789000054321", alias: "DIAZTECH.USD", currency: "USD", balance: 8500, isActive: true,
    movements: [
      { id: "bm8", type: "credit", description: "Cobro exportación — Cliente exterior", amount: 3500, balance: 8500, referenceId: "R-003", date: "2026-05-15T10:00:00" },
      { id: "bm9", type: "debit", description: "Pago importación — Importadora Chang", amount: 2000, balance: 5000, referenceId: "P-003", date: "2026-05-10T14:00:00" },
    ],
  },
];

const EMPTY_ACCOUNT = { bankName: "", accountType: "CA", accountNumber: "", cbu: "", alias: "", currency: "ARS", balance: 0 };

export default function BanksPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>(MOCK_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(MOCK_ACCOUNTS[0]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);
  const [movementForm, setMovementForm] = useState({ type: "credit" as "credit" | "debit", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const totalARS = accounts.filter((a) => a.currency === "ARS" && a.isActive).reduce((sum, a) => sum + a.balance, 0);
  const totalUSD = accounts.filter((a) => a.currency === "USD" && a.isActive).reduce((sum, a) => sum + a.balance, 0);
  const activeAccounts = accounts.filter((a) => a.isActive).length;

  const openCreateAccount = () => { setEditingAccount(null); setAccountForm(EMPTY_ACCOUNT); setShowAccountModal(true); };
  const openEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountForm({ bankName: acc.bankName, accountType: acc.accountType, accountNumber: acc.accountNumber, cbu: acc.cbu, alias: acc.alias, currency: acc.currency, balance: acc.balance });
    setShowAccountModal(true);
  };

  const handleSaveAccount = () => {
    if (!accountForm.bankName.trim()) { showToast("El banco es obligatorio", "error"); return; }
    if (editingAccount) {
      setAccounts((prev) => prev.map((a) => a.id === editingAccount.id ? { ...a, ...accountForm } : a));
      if (selectedAccount?.id === editingAccount.id) setSelectedAccount({ ...selectedAccount!, ...accountForm });
      showToast(`Cuenta "${accountForm.bankName}" actualizada`);
    } else {
      const newAcc: BankAccount = { ...accountForm, id: Date.now().toString(), isActive: true, movements: [] };
      setAccounts((prev) => [...prev, newAcc]);
      showToast(`Cuenta en ${accountForm.bankName} creada`);
    }
    setShowAccountModal(false);
  };

  const handleAddMovement = () => {
    if (!selectedAccount) return;
    const amount = parseFloat(movementForm.amount);
    if (!movementForm.description.trim() || isNaN(amount) || amount <= 0) { showToast("Completá todos los campos", "error"); return; }
    const newBalance = movementForm.type === "credit" ? selectedAccount.balance + amount : selectedAccount.balance - amount;
    const newMov: BankMovement = { id: Date.now().toString(), type: movementForm.type, description: movementForm.description, amount, balance: newBalance, referenceId: "", date: new Date().toISOString() };
    const updated = { ...selectedAccount, balance: newBalance, movements: [newMov, ...selectedAccount.movements] };
    setAccounts((prev) => prev.map((a) => a.id === selectedAccount.id ? updated : a));
    setSelectedAccount(updated);
    setShowMovementModal(false);
    setMovementForm({ type: "credit", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
    showToast(`${movementForm.type === "credit" ? "Crédito" : "Débito"} registrado`);
  };

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Bancos</h1>
          <p className={s.pageSubtitle}>Cuentas bancarias y movimientos</p>
        </div>
        <button className={s.btnPrimary} onClick={openCreateAccount}>+ Nueva Cuenta</button>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🏦</div>
          <div className={s.statCardValue}>{activeAccounts}</div>
          <div className={s.statCardLabel}>Cuentas Activas</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>💰</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>{formatCurrency(totalARS)}</div>
          <div className={s.statCardLabel}>Saldo Total ARS</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>💵</div>
          <div className={`${s.statCardValue} ${s.balancePositive}`}>{formatCurrency(totalUSD, "USD")}</div>
          <div className={s.statCardLabel}>Saldo Total USD</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📊</div>
          <div className={s.statCardValue}>{selectedAccount?.movements.length || 0}</div>
          <div className={s.statCardLabel}>Movimientos (selección)</div>
        </div>
      </div>

      {/* Account Cards */}
      <div className={s.tabs}>
        {accounts.map((acc) => (
          <button key={acc.id} className={`${s.tab} ${selectedAccount?.id === acc.id ? s.active : ""}`}
            onClick={() => setSelectedAccount(acc)}>
            {acc.currency === "USD" ? "💵" : "🏦"} {acc.bankName} ({acc.accountType}) {acc.currency}
          </button>
        ))}
      </div>

      {selectedAccount && (
        <>
          {/* Account Detail */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-5)", padding: "var(--space-5)", background: "var(--bg-surface)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-xl)" }}>
            <div>
              <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>Banco</div>
              <div style={{ fontWeight: 700 }}>{selectedAccount.bankName}</div>
            </div>
            <div>
              <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>CBU</div>
              <div style={{ fontWeight: 500, fontSize: "var(--font-sm)", fontFamily: "var(--font-mono)" }}>{selectedAccount.cbu || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>Alias</div>
              <div style={{ fontWeight: 600, color: "var(--primary-400)" }}>{selectedAccount.alias || "—"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)", marginBottom: "var(--space-1)" }}>Saldo</div>
              <div style={{ fontSize: "var(--font-xl)", fontWeight: 800, color: "var(--secondary-400)" }}>
                {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
              </div>
            </div>
          </div>

          <div className={s.toolbar}>
            <div className={s.pageHeaderLeft}>
              <span style={{ fontWeight: 700 }}>Movimientos</span>
            </div>
            <div className={s.toolbarRight}>
              <button className={`${s.btnGhost}`} onClick={() => openEditAccount(selectedAccount)}>✏️ Editar cuenta</button>
              <button className={s.btnPrimary} onClick={() => setShowMovementModal(true)}>+ Nuevo Movimiento</button>
            </div>
          </div>

          <div className={s.tableWrapper}>
            {selectedAccount.movements.length > 0 ? (
              <table className={s.table}>
                <thead>
                  <tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th style={{ textAlign: "right" }}>Monto</th><th style={{ textAlign: "right" }}>Saldo</th></tr>
                </thead>
                <tbody>
                  {selectedAccount.movements.map((mov) => (
                    <tr key={mov.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(mov.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} {new Date(mov.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td><span className={`${s.badge} ${mov.type === "credit" ? s.active : s.danger}`}>{mov.type === "credit" ? "📈 Crédito" : "📉 Débito"}</span></td>
                      <td className={s.cellMain}>{mov.description}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className={mov.type === "credit" ? s.balancePositive : s.balanceNegative}>
                          {mov.type === "credit" ? "+" : "-"}{formatCurrency(mov.amount, selectedAccount.currency)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(mov.balance, selectedAccount.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}>🏦</div>
                <h3 className={s.emptyTitle}>Sin movimientos</h3>
                <p className={s.emptyDescription}>Registrá el primer movimiento de esta cuenta</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className={s.modalOverlay} onClick={() => setShowAccountModal(false)}>
          <div className={`${s.modal} ${s.wide}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>{editingAccount ? "Editar Cuenta" : "Nueva Cuenta Bancaria"}</h2>
              <button className={s.modalClose} onClick={() => setShowAccountModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Banco *</label>
                  <input type="text" className={s.formInput} placeholder="Banco Nación" value={accountForm.bankName} onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })} autoFocus />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Tipo de Cuenta</label>
                  <select className={s.formSelect} value={accountForm.accountType} onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}>
                    <option value="CA">Caja de Ahorro</option>
                    <option value="CC">Cuenta Corriente</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Moneda</label>
                  <select className={s.formSelect} value={accountForm.currency} onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}>
                    <option value="ARS">🇦🇷 Pesos (ARS)</option>
                    <option value="USD">🇺🇸 Dólares (USD)</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>N° de Cuenta</label>
                  <input type="text" className={s.formInput} placeholder="4015-0012345678" value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>CBU</label>
                  <input type="text" className={s.formInput} placeholder="0110000000401500123456" value={accountForm.cbu} onChange={(e) => setAccountForm({ ...accountForm, cbu: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Alias</label>
                  <input type="text" className={s.formInput} placeholder="DIAZTECH.NACION" value={accountForm.alias} onChange={(e) => setAccountForm({ ...accountForm, alias: e.target.value })} />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowAccountModal(false)}>Cancelar</button>
              <button className={s.btnPrimary} onClick={handleSaveAccount}>{editingAccount ? "Guardar" : "Crear Cuenta"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovementModal && (
        <div className={s.modalOverlay} onClick={() => setShowMovementModal(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Nuevo Movimiento — {selectedAccount?.bankName}</h2>
              <button className={s.modalClose} onClick={() => setShowMovementModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Tipo *</label>
                  <select className={s.formSelect} value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as "credit" | "debit" })}>
                    <option value="credit">📈 Crédito (Ingreso)</option>
                    <option value="debit">📉 Débito (Egreso)</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Fecha</label>
                  <input type="date" className={s.formInput} value={movementForm.date} onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })} />
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Descripción *</label>
                  <input type="text" className={s.formInput} placeholder="Transferencia recibida de..." value={movementForm.description} onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })} />
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Monto ({selectedAccount?.currency}) *</label>
                  <input type="number" className={s.formInput} placeholder="0.00" value={movementForm.amount} onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })} />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowMovementModal(false)}>Cancelar</button>
              <button className={s.btnPrimary} onClick={handleAddMovement}>Registrar</button>
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
