import { getReceipts } from "@/actions/receipts";
import { getClientsForSelect } from "@/actions/invoices";
import { getSuppliers } from "@/actions/suppliers";
import ReceiptsClient from "./ReceiptsClient";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const [receiptsRes, clientsRes, suppliersRes] = await Promise.all([
    getReceipts(),
    getClientsForSelect(),
    getSuppliers(),
  ]);

  const initialReceipts = (receiptsRes.success && receiptsRes.data ? receiptsRes.data : []) as any[];
  const clients = (clientsRes.success && clientsRes.data ? clientsRes.data : []) as any[];
  const suppliers = (suppliersRes.success && suppliersRes.data ? suppliersRes.data : []) as any[];

  return (
    <ReceiptsClient
      initialReceipts={initialReceipts}
      clients={clients}
      suppliers={suppliers}
    />
  );
}
