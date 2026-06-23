"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getProductsForSelect, createInvoice } from "@/actions/invoices";

interface Product {
  id: string;
  code: string;
  name: string;
  salePrice: number;
  ivaRate: number;
  unit: string;
}

interface CartItem {
  product: Product;
  qty: number;
  unitPrice: number;
  ivaAmount: number;
  subtotal: number;
  total: number;
}

interface POSModeProps {
  open: boolean;
  onClose: () => void;
}

function calcItem(product: Product, qty: number): CartItem {
  const subtotal = product.salePrice * qty;
  const ivaAmount = subtotal * (product.ivaRate / 100);
  return {
    product,
    qty,
    unitPrice: product.salePrice,
    ivaAmount,
    subtotal,
    total: subtotal + ivaAmount,
  };
}

export default function POSMode({ open, onClose }: POSModeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load products when opened
  useEffect(() => {
    if (!open) return;
    getProductsForSelect().then((res) => {
      if (res.success && res.data) setProducts(res.data as Product[]);
    });
    setTimeout(() => searchRef.current?.focus(), 150);
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch("");
      setCart([]);
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  const filtered = products.filter(
    (p) =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = calcItem(product, updated[idx].qty + 1);
        return updated;
      }
      return [...prev, calcItem(product, 1)];
    });
    setSearch("");
    searchRef.current?.focus();
  }, []);

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((c) =>
          c.product.id === productId ? calcItem(c.product, qty) : c
        )
      );
    }
  };

  const totalCart = cart.reduce((s, c) => s + c.total, 0);
  const totalIva = cart.reduce((s, c) => s + c.ivaAmount, 0);
  const totalSubtotal = cart.reduce((s, c) => s + c.subtotal, 0);

  const handleInvoice = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    setError(null);
    const res = await createInvoice({
      type: "B",
      pointOfSale: 1,
      date: new Date().toISOString(),
      items: cart.map((c) => ({
        productId: c.product.id,
        description: c.product.name,
        quantity: c.qty,
        unitPrice: c.unitPrice,
        ivaRate: c.product.ivaRate,
        ivaAmount: c.ivaAmount,
        subtotal: c.subtotal,
        total: c.total,
      })),
    });
    setSaving(false);
    if (res.success) {
      setSuccess(true);
      setCart([]);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error ?? "Error al facturar");
    }
  };

  const fmt = (n: number) =>
    `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        backgroundColor: "rgba(31,32,47,0.96)",
        backdropFilter: "blur(8px)",
        display: "flex", flexDirection: "column",
        animation: "fadeIn 0.2s ease-out",
      }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-4) var(--space-6)",
        background: "linear-gradient(135deg, var(--primary-600), var(--secondary-700))",
        borderBottom: "2px solid rgba(255,255,255,0.1)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{ fontSize: "1.5rem" }}>⚡</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: "var(--font-lg)", color: "white" }}>Modo Vendedor Rápido</div>
            <div style={{ fontSize: "var(--font-xs)", color: "rgba(255,255,255,0.7)" }}>POS · Factura B · Punto de Venta 0001</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{
            padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-full)",
            background: "rgba(255,255,255,0.15)", fontSize: "var(--font-xs)", fontWeight: 700, color: "white",
          }}>
            ESC para cerrar
          </span>
          <button onClick={onClose} style={{ color: "white", fontSize: "1.3rem", cursor: "pointer" }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left — Search + Products */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          padding: "var(--space-6)", gap: "var(--space-4)", overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-3)",
            padding: "var(--space-4)",
            background: "rgba(255,255,255,0.06)",
            border: "2px solid rgba(255,255,255,0.15)",
            borderRadius: "var(--radius-xl)",
          }}>
            <span style={{ fontSize: "1.3rem" }}>🔍</span>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código de producto..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: "var(--font-lg)", fontWeight: 600, color: "white",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", cursor: "pointer" }}>✕</button>
            )}
          </div>

          {/* Product results */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "var(--space-3)", overflowY: "auto", flex: 1,
          }}>
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  padding: "var(--space-4)",
                  background: "rgba(255,255,255,0.06)",
                  border: "2px solid rgba(255,255,255,0.12)",
                  borderRadius: "var(--radius-xl)",
                  textAlign: "left", cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  display: "flex", flexDirection: "column", gap: "var(--space-2)",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(224,122,95,0.15)";
                  el.style.borderColor = "var(--primary-500)";
                  el.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(255,255,255,0.06)";
                  el.style.borderColor = "rgba(255,255,255,0.12)";
                  el.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "var(--font-xs)", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontFamily: "monospace" }}>
                  {p.code}
                </div>
                <div style={{ fontWeight: 800, fontSize: "var(--font-sm)", color: "white", lineHeight: 1.3 }}>
                  {p.name}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 900, fontSize: "var(--font-lg)", color: "var(--primary-400)" }}>
                    {fmt(p.salePrice)}
                  </span>
                  <span style={{ fontSize: "var(--font-xs)", color: "rgba(255,255,255,0.4)" }}>
                    IVA {p.ivaRate}%
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && search && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "var(--space-8)", color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)" }}>🔍</div>
                <div style={{ fontWeight: 600 }}>Sin resultados para "{search}"</div>
              </div>
            )}
            {filtered.length === 0 && !search && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "var(--space-8)", color: "rgba(255,255,255,0.4)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-2)" }}>⚡</div>
                <div style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>Empezá a escribir para buscar</div>
                <div style={{ fontSize: "var(--font-sm)", marginTop: "var(--space-1)" }}>Nombre o código de producto</div>
              </div>
            )}
          </div>
        </div>

        {/* Right — Cart */}
        <div style={{
          width: 360, flexShrink: 0,
          background: "rgba(255,255,255,0.04)",
          borderLeft: "2px solid rgba(255,255,255,0.1)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "var(--space-4)", borderBottom: "1px solid rgba(255,255,255,0.1)",
            fontWeight: 900, fontSize: "var(--font-base)", color: "white",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>🛒 Carrito ({cart.reduce((s, c) => s + c.qty, 0)} items)</span>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} style={{ fontSize: "var(--font-xs)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                Limpiar
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {cart.length === 0 && (
              <div style={{ textAlign: "center", padding: "var(--space-8)", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)" }}>🛒</div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 600 }}>Carrito vacío</div>
              </div>
            )}
            {cart.map((item) => (
              <div key={item.product.id} style={{
                padding: "var(--space-3)",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", flexDirection: "column", gap: "var(--space-2)",
              }}>
                <div style={{ fontWeight: 800, fontSize: "var(--font-xs)", color: "white", lineHeight: 1.3 }}>
                  {item.product.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <button
                      onClick={() => updateQty(item.product.id, item.qty - 1)}
                      style={{
                        width: 28, height: 28, borderRadius: "var(--radius-md)",
                        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                        color: "white", fontSize: "1rem", cursor: "pointer", fontWeight: 900,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >−</button>
                    <span style={{ fontWeight: 900, color: "white", minWidth: 24, textAlign: "center", fontSize: "var(--font-sm)" }}>
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.product.id, item.qty + 1)}
                      style={{
                        width: 28, height: 28, borderRadius: "var(--radius-md)",
                        background: "rgba(224,122,95,0.3)", border: "1px solid var(--primary-500)",
                        color: "white", fontSize: "1rem", cursor: "pointer", fontWeight: 900,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >+</button>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900, color: "var(--primary-400)", fontSize: "var(--font-sm)" }}>
                      {fmt(item.total)}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>
                      {fmt(item.unitPrice)} c/u
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals + Invoice Button */}
          <div style={{
            padding: "var(--space-4)", borderTop: "2px solid rgba(255,255,255,0.1)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
          }}>
            {cart.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-xs)", color: "rgba(255,255,255,0.6)" }}>
                  <span>Subtotal</span><span>{fmt(totalSubtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-xs)", color: "rgba(255,255,255,0.6)" }}>
                  <span>IVA</span><span>{fmt(totalIva)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, color: "white", fontSize: "var(--font-xl)", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "var(--space-2)" }}>
                  <span>TOTAL</span><span style={{ color: "var(--primary-400)" }}>{fmt(totalCart)}</span>
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: "var(--space-2)", background: "rgba(217,56,58,0.15)", border: "1px solid #D9383A", borderRadius: "var(--radius-md)", fontSize: "var(--font-xs)", color: "#D9383A", fontWeight: 700 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: "var(--space-2)", background: "rgba(108,162,138,0.15)", border: "1px solid #6CA28A", borderRadius: "var(--radius-md)", fontSize: "var(--font-xs)", color: "#6CA28A", fontWeight: 700, textAlign: "center" }}>
                ✅ ¡Factura generada con éxito!
              </div>
            )}

            <button
              onClick={handleInvoice}
              disabled={cart.length === 0 || saving}
              style={{
                padding: "var(--space-4)",
                background: cart.length === 0
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, var(--primary-500), var(--secondary-600))",
                border: "2px solid " + (cart.length === 0 ? "rgba(255,255,255,0.1)" : "var(--primary-400)"),
                borderRadius: "var(--radius-xl)",
                color: cart.length === 0 ? "rgba(255,255,255,0.3)" : "white",
                fontWeight: 900, fontSize: "var(--font-base)", cursor: cart.length === 0 ? "not-allowed" : "pointer",
                transition: "all var(--transition-base)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
              }}
            >
              {saving ? "⚙️ Facturando..." : "🧾 Facturar Ahora"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
