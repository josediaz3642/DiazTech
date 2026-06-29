import { connection } from "next/server";
import { getSuppliers, getSupplierStats } from "@/actions/suppliers";
import SuppliersClient from "./SuppliersClient";

export default async function SuppliersPage() {
  await connection();
  const [suppliersRes, statsRes] = await Promise.all([
    getSuppliers(),
    getSupplierStats(),
  ]);

  const initialSuppliers = (suppliersRes.success && suppliersRes.data ? suppliersRes.data : []) as any[];
  const initialStats = (statsRes.success && statsRes.data ? statsRes.data : {
    total: 0,
    activeCount: 0,
    totalDebtArs: 0,
    totalDebtUsd: 0,
  }) as any;

  return (
    <SuppliersClient
      initialSuppliers={initialSuppliers}
      initialStats={initialStats}
    />
  );
}
