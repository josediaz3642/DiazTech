import { getProducts, getWarehouses, getCategories, getProductStats } from "@/actions/products";
import StockClient from "./StockClient";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [productsRes, warehousesRes, categoriesRes, statsRes] = await Promise.all([
    getProducts(),
    getWarehouses(),
    getCategories(),
    getProductStats(),
  ]);

  const initialProducts = (productsRes.success && productsRes.data ? productsRes.data : []) as any[];
  const warehouses = (warehousesRes.success && warehousesRes.data ? warehousesRes.data : []) as any[];
  const categories = (categoriesRes.success && categoriesRes.data ? categoriesRes.data : []) as any[];
  
  const initialStats = (statsRes.success && statsRes.data
    ? statsRes.data
    : { totalProducts: 0, totalUnits: 0, totalValue: 0, lowStockCount: 0 }) as any;

  return (
    <StockClient
      initialProducts={initialProducts}
      warehouses={warehouses}
      categories={categories}
      initialStats={initialStats}
    />
  );
}
