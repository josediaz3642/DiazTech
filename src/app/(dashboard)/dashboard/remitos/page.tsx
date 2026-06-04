import { getRemitos } from "@/actions/remitos";
import { getClientsForSelect, getProductsForSelect } from "@/actions/invoices";
import RemitosClient from "./RemitosClient";

export const revalidate = 0; // Disable server component caching to ensure real-time data

export default async function RemitosPage() {
  const [remitosRes, clientsRes, productsRes] = await Promise.all([
    getRemitos(),
    getClientsForSelect(),
    getProductsForSelect(),
  ]);

  const initialRemitos = (remitosRes.success && remitosRes.data ? remitosRes.data : []) as any[];
  const clients = (clientsRes.success && clientsRes.data ? clientsRes.data : []) as any[];
  const products = (productsRes.success && productsRes.data ? productsRes.data : []) as any[];

  return (
    <RemitosClient
      initialRemitos={initialRemitos}
      clients={clients}
      products={products}
    />
  );
}
