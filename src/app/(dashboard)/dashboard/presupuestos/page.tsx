import { connection } from "next/server";
import { getBudgets } from "@/actions/budgets";
import { getClientsForSelect, getProductsForSelect } from "@/actions/invoices";
import BudgetsClient from "./BudgetsClient";

export default async function BudgetsPage() {
  await connection();
  const [budgetsRes, clientsRes, productsRes] = await Promise.all([
    getBudgets(),
    getClientsForSelect(),
    getProductsForSelect(),
  ]);

  const initialBudgets = (budgetsRes.success && budgetsRes.data ? budgetsRes.data : []) as any[];
  const clients = (clientsRes.success && clientsRes.data ? clientsRes.data : []) as any[];
  const products = (productsRes.success && productsRes.data ? productsRes.data : []) as any[];

  return (
    <BudgetsClient
      initialBudgets={initialBudgets}
      clients={clients}
      products={products}
    />
  );
}
