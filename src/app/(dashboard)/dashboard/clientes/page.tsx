import { getClients, getClientStats } from "@/actions/clients";
import ClientsClient from "./ClientsClient";

export const revalidate = 0; // Disable server component caching to ensure real-time data

export default async function ClientsPage() {
  const [clientsRes, statsRes] = await Promise.all([
    getClients(),
    getClientStats(),
  ]);

  const initialClients = (clientsRes.success && clientsRes.data ? clientsRes.data : []) as any[];
  const initialStats = (statsRes.success && statsRes.data ? statsRes.data : {
    total: 0,
    activeCount: 0,
    totalDebt: 0,
    debtorsCount: 0,
  }) as any;

  return (
    <ClientsClient
      initialClients={initialClients}
      initialStats={initialStats}
    />
  );
}
