import { getSalesReport } from "@/actions/reports";
import SalesPageClient from "./SalesPageClient";

export const revalidate = 0; // Disable server component caching to ensure real-time data

export default async function VentasPage() {
  const result = await getSalesReport("month");
  const data = result.success && result.data
    ? result.data
    : {
        totalSales: 0,
        totalInvoices: 0,
        avgTicket: 0,
        byDay: [],
        topClients: [],
        byType: [],
        previousPeriodTotal: 0,
      };

  return <SalesPageClient initialData={data} initialPeriod="month" />;
}
