import { getInvoices, getClientsForSelect, getProductsForSelect } from "@/actions/invoices";
import InvoicingClient from "./InvoicingClient";

export const revalidate = 0; // Disable server component caching to ensure real-time data

export default async function InvoicingPage() {
  const [invoicesRes, clientsRes, productsRes] = await Promise.all([
    getInvoices(),
    getClientsForSelect(),
    getProductsForSelect(),
  ]);

  const initialInvoices = (invoicesRes.success && invoicesRes.data ? invoicesRes.data : []) as any[];
  const clients = (clientsRes.success && clientsRes.data ? clientsRes.data : []) as any[];
  const products = (productsRes.success && productsRes.data ? productsRes.data : []) as any[];

  return (
    <InvoicingClient
      initialInvoices={initialInvoices}
      clients={clients}
      products={products}
    />
  );
}
