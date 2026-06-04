"use client";

import { useState, useMemo, useTransition } from "react";
import s from "@/styles/module-page.module.css";
import { formatCurrency } from "@/lib/utils";
import { createProduct, updateProduct, deleteProduct, getProductStats } from "@/actions/products";

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface StockClientProps {
  initialProducts: any[];
  warehouses: Warehouse[];
  categories: Category[];
  initialStats: any;
}

const UNITS = ["unidad", "kg", "litro", "metro", "caja", "pack", "rollo", "bolsa", "pallet"];

const EMPTY_PRODUCT = {
  code: "",
  name: "",
  description: "",
  categoryId: "" as string | null,
  unit: "unidad",
  costPrice: 0,
  salePrice: 0,
  costPriceUsd: 0,
  salePriceUsd: 0,
  ivaRate: 21,
  minStock: 0,
  stock: {} as Record<string, number>, // warehouseId -> quantity
};

export default function StockClient({
  initialProducts,
  warehouses,
  categories,
  initialStats,
}: StockClientProps) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "warehouses">("products");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  
  const [formData, setFormData] = useState(EMPTY_PRODUCT);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const perPage = 10;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getTotalStock = (product: any) => {
    if (!product.stockLevels) return 0;
    return product.stockLevels.reduce((sum: number, sl: any) => sum + Number(sl.quantity), 0);
  };

  const isLowStock = (product: any) => {
    const total = getTotalStock(product);
    return Number(product.minStock) > 0 && total <= Number(product.minStock);
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = filterCategory === "all" || p.categoryId === filterCategory;
      const matchLow = !filterLowStock || isLowStock(p);
      return matchSearch && matchCategory && matchLow;
    });
  }, [products, search, filterCategory, filterLowStock]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openCreate = () => {
    setEditing(null);
    const initialStock: Record<string, number> = {};
    warehouses.forEach((w) => {
      initialStock[w.id] = 0;
    });
    setFormData({
      ...EMPTY_PRODUCT,
      categoryId: categories[0]?.id || null,
      stock: initialStock,
    });
    setShowModal(true);
  };

  const openEdit = (product: any) => {
    setEditing(product);
    const stockDict: Record<string, number> = {};
    warehouses.forEach((w) => {
      stockDict[w.id] = 0;
    });
    product.stockLevels?.forEach((sl: any) => {
      stockDict[sl.warehouseId] = Number(sl.quantity);
    });

    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId || null,
      unit: product.unit || "unidad",
      costPrice: Number(product.costPrice) || 0,
      salePrice: Number(product.salePrice) || 0,
      costPriceUsd: Number(product.costPriceUsd) || 0,
      salePriceUsd: Number(product.salePriceUsd) || 0,
      ivaRate: Number(product.ivaRate) || 21,
      minStock: Number(product.minStock) || 0,
      stock: stockDict,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast("Código y nombre son obligatorios", "error");
      return;
    }

    startTransition(async () => {
      const stockLevelsPayload = warehouses.map((w) => ({
        warehouseId: w.id,
        quantity: Number(formData.stock[w.id]) || 0,
      }));

      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        categoryId: formData.categoryId || null,
        unit: formData.unit,
        costPrice: Number(formData.costPrice) || 0,
        salePrice: Number(formData.salePrice) || 0,
        costPriceUsd: Number(formData.costPriceUsd) || 0,
        salePriceUsd: Number(formData.salePriceUsd) || 0,
        ivaRate: Number(formData.ivaRate) || 21,
        minStock: Number(formData.minStock) || 0,
      };

      if (editing) {
        const res = await updateProduct(editing.id, payload, stockLevelsPayload);
        if (res.success && res.data) {
          showToast(`Producto "${formData.name}" actualizado`);
          setProducts((prev) => prev.map((p) => (p.id === editing.id ? res.data : p)));
          setShowModal(false);
          // Refresh stats
          const statsRes = await getProductStats();
          if (statsRes.success) setStats(statsRes.data);
        } else {
          showToast(res.error || "Error al actualizar producto", "error");
        }
      } else {
        const res = await createProduct(payload, stockLevelsPayload);
        if (res.success && res.data) {
          showToast(`Producto "${formData.name}" creado`);
          setProducts((prev) => [res.data, ...prev]);
          setShowModal(false);
          // Refresh stats
          const statsRes = await getProductStats();
          if (statsRes.success) setStats(statsRes.data);
        } else {
          showToast(res.error || "Error al crear producto", "error");
        }
      }
    });
  };

  const handleDelete = (product: any) => {
    if (confirm(`¿Eliminar "${product.name}"?`)) {
      startTransition(async () => {
        const res = await deleteProduct(product.id);
        if (res.success) {
          showToast(`Producto "${product.name}" eliminado`);
          setProducts((prev) => prev.filter((p) => p.id !== product.id));
          // Refresh stats
          const statsRes = await getProductStats();
          if (statsRes.success) setStats(statsRes.data);
        } else {
          showToast(res.error || "Error al eliminar producto", "error");
        }
      });
    }
  };

  const getStockBadge = (product: any) => {
    const total = getTotalStock(product);
    if (total === 0) return <span className={`${s.badge} ${s.danger}`}>Sin stock</span>;
    if (isLowStock(product)) return <span className={`${s.badge} ${s.warning}`}>Stock bajo</span>;
    return <span className={`${s.badge} ${s.active}`}>En stock</span>;
  };

  const getMargin = (cost: number, sale: number) => {
    if (cost === 0) return 0;
    return (((sale - cost) / cost) * 100).toFixed(1);
  };

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Stock & Productos</h1>
          <p className={s.pageSubtitle}>Inventario multi-depósito y gestión de productos en tiempo real 📦</p>
        </div>
        <button className={s.btnPrimary} onClick={openCreate} id="btn-new-product">
          + Nuevo Producto
        </button>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>📦</div>
          <div className={s.statCardValue}>{stats.totalProducts}</div>
          <div className={s.statCardLabel}>Productos Activos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>🏷️</div>
          <div className={s.statCardValue}>{Number(stats.totalUnits).toLocaleString("es-AR")}</div>
          <div className={s.statCardLabel}>Unidades Totales</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>💰</div>
          <div className={s.statCardValue}>{formatCurrency(Number(stats.totalValue))}</div>
          <div className={s.statCardLabel}>Valor del Stock</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardIcon}>⚠️</div>
          <div className={`${s.statCardValue} ${stats.lowStockCount > 0 ? s.balanceNegative : ""}`}>
            {stats.lowStockCount}
          </div>
          <div className={s.statCardLabel}>Stock Bajo / Agotado</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={s.tabs}>
        <button className={`${s.tab} ${activeTab === "products" ? s.active : ""}`} onClick={() => setActiveTab("products")}>
          📦 Productos
        </button>
        <button className={`${s.tab} ${activeTab === "warehouses" ? s.active : ""}`} onClick={() => setActiveTab("warehouses")}>
          🏭 Depósitos ({warehouses.length})
        </button>
      </div>

      {activeTab === "products" && (
        <>
          <div className={s.toolbar}>
            <div className={s.searchBox}>
              <span className={s.searchIcon}>🔍</span>
              <input
                type="text"
                className={s.searchInput}
                placeholder="Buscar por código, nombre o descripción..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <select
              className={s.filterBtn}
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              style={{ background: "var(--input-bg)", cursor: "pointer" }}
            >
              <option value="all">📁 Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              className={`${s.filterBtn} ${filterLowStock ? s.active : ""}`}
              onClick={() => {
                setFilterLowStock(!filterLowStock);
                setCurrentPage(1);
              }}
            >
              ⚠️ Stock bajo
            </button>
          </div>

          <div className={s.tableWrapper}>
            {paginated.length > 0 ? (
              <>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Costo</th>
                      <th>Venta</th>
                      <th>Margen</th>
                      {warehouses.map((w) => (
                        <th key={w.id}>{w.name.replace("Depósito ", "")}</th>
                      ))}
                      <th>Total</th>
                      <th>Estado</th>
                      <th style={{ textAlign: "right", width: 100 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <span className={`${s.badge} ${s.primary}`}>{product.code}</span>
                        </td>
                        <td>
                          <div className={s.cellMain}>{product.name}</div>
                          <div className={s.cellSub}>{product.unit}</div>
                        </td>
                        <td>
                          <span className={`${s.badge} ${s.info}`}>{product.category?.name || "Sin categoría"}</span>
                        </td>
                        <td>{formatCurrency(Number(product.costPrice))}</td>
                        <td>{formatCurrency(Number(product.salePrice))}</td>
                        <td>
                          <span className={s.balancePositive}>
                            {getMargin(Number(product.costPrice), Number(product.salePrice))}%
                          </span>
                        </td>
                        {warehouses.map((w) => {
                          const qty = product.stockLevels?.find((sl: any) => sl.warehouseId === w.id)?.quantity ?? 0;
                          return (
                            <td key={w.id}>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color:
                                    Number(qty) === 0
                                      ? "var(--text-tertiary)"
                                      : Number(qty) <= Number(product.minStock)
                                      ? "var(--warning-400)"
                                      : "var(--text-primary)",
                                }}
                              >
                                {Number(qty)}
                              </span>
                            </td>
                          );
                        })}
                        <td>
                          <span style={{ fontWeight: 700, fontSize: "var(--font-base)" }}>
                            {getTotalStock(product)}
                          </span>
                        </td>
                        <td>{getStockBadge(product)}</td>
                        <td>
                          <div className={s.cellActions} style={{ justifyContent: "flex-end" }}>
                            <button className={`${s.actionBtn} ${s.edit}`} onClick={() => openEdit(product)} title="Editar">
                              ✏️
                            </button>
                            <button className={`${s.actionBtn} ${s.delete}`} onClick={() => handleDelete(product)} title="Eliminar">
                              🗑️
                            </button>
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
                      <button className={s.pageBtn} onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}>
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
                      <button className={s.pageBtn} onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages}>
                        →
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}>📦</div>
                <h3 className={s.emptyTitle}>No se encontraron productos</h3>
                <p className={s.emptyDescription}>{search ? "Probá con otros términos" : "Empezá agregando tu primer producto"}</p>
                {!search && (
                  <button className={s.btnPrimary} onClick={openCreate}>
                    + Nuevo Producto
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "warehouses" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
          {warehouses.map((warehouse) => {
            const productsInWarehouse = products.filter((p) => {
              const qty = p.stockLevels?.find((sl: any) => sl.warehouseId === warehouse.id)?.quantity ?? 0;
              return Number(qty) > 0;
            });
            const totalUnitsInW = products.reduce((sum, p) => {
              const qty = p.stockLevels?.find((sl: any) => sl.warehouseId === warehouse.id)?.quantity ?? 0;
              return sum + Number(qty);
            }, 0);
            const valueInW = products.reduce((sum, p) => {
              const qty = p.stockLevels?.find((sl: any) => sl.warehouseId === warehouse.id)?.quantity ?? 0;
              return sum + Number(qty) * Number(p.costPrice);
            }, 0);
            
            return (
              <div key={warehouse.id} className={s.statCard} style={{ padding: "var(--space-6)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                  <div>
                    <div style={{ fontSize: "var(--font-lg)", fontWeight: 700, marginBottom: "var(--space-1)" }}>
                      🏭 {warehouse.name}
                    </div>
                    <div style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>{warehouse.address || "Sin dirección"}</div>
                  </div>
                  {warehouse.isDefault && <span className={`${s.badge} ${s.primary}`}>Principal</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)", borderTop: "1px solid var(--border-primary)", paddingTop: "var(--space-4)" }}>
                  <div>
                    <div style={{ fontSize: "var(--font-xl)", fontWeight: 800 }}>{productsInWarehouse.length}</div>
                    <div style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>Productos</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--font-xl)", fontWeight: 800 }}>{totalUnitsInW.toLocaleString("es-AR")}</div>
                    <div style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>Unidades</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--font-base)", fontWeight: 700, color: "var(--secondary-400)" }}>{formatCurrency(valueInW)}</div>
                    <div style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>Valor</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Create/Edit Product */}
      {showModal && (
        <div className={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={`${s.modal} ${s.wide}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>{editing ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button className={s.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Código *</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="ALI-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Categoría</label>
                  <select
                    className={s.formSelect}
                    value={formData.categoryId || ""}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || null })}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Nombre *</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="Harina 000 x 50kg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className={`${s.formGroup} ${s.formGroupFull}`}>
                  <label className={s.formLabel}>Descripción</label>
                  <input
                    type="text"
                    className={s.formInput}
                    placeholder="Descripción detallada del producto"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Unidad</label>
                  <select
                    className={s.formSelect}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Tasa IVA (%)</label>
                  <select
                    className={s.formSelect}
                    value={formData.ivaRate}
                    onChange={(e) => setFormData({ ...formData, ivaRate: Number(e.target.value) })}
                  >
                    <option value={21}>21%</option>
                    <option value={10.5}>10.5%</option>
                    <option value={27}>27%</option>
                    <option value={0}>Exento</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Precio Costo ARS</label>
                  <input
                    type="number"
                    className={s.formInput}
                    placeholder="0.00"
                    value={formData.costPrice || ""}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Precio Venta ARS</label>
                  <input
                    type="number"
                    className={s.formInput}
                    placeholder="0.00"
                    value={formData.salePrice || ""}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Precio Costo USD</label>
                  <input
                    type="number"
                    className={s.formInput}
                    placeholder="0.00"
                    value={formData.costPriceUsd || ""}
                    onChange={(e) => setFormData({ ...formData, costPriceUsd: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Precio Venta USD</label>
                  <input
                    type="number"
                    className={s.formInput}
                    placeholder="0.00"
                    value={formData.salePriceUsd || ""}
                    onChange={(e) => setFormData({ ...formData, salePriceUsd: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Stock Mínimo</label>
                  <input
                    type="number"
                    className={s.formInput}
                    placeholder="0"
                    value={formData.minStock || ""}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) || 0 })}
                  />
                </div>

                {/* Stock per Warehouse */}
                <div
                  className={`${s.formGroup} ${s.formGroupFull}`}
                  style={{ borderTop: "1px solid var(--border-primary)", paddingTop: "var(--space-4)", marginTop: "var(--space-2)" }}
                >
                  <label className={s.formLabel}>Stock por Depósito</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                    {warehouses.map((w) => (
                      <div key={w.id}>
                        <label
                          style={{
                            fontSize: "var(--font-xs)",
                            color: "var(--text-tertiary)",
                            display: "block",
                            marginBottom: "var(--space-1)",
                          }}
                        >
                          {w.name}
                        </label>
                        <input
                          type="number"
                          className={s.formInput}
                          placeholder="0"
                          value={formData.stock[w.id] ?? ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              stock: { ...formData.stock, [w.id]: Number(e.target.value) || 0 },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button className={s.btnSecondary} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className={s.btnPrimary} onClick={handleSave} disabled={isPending}>
                {isPending ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Producto"}
              </button>
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
