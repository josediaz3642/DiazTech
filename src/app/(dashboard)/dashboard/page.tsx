import { connection } from "next/server";
import { getDashboardMetrics, type DashboardMetricsData } from "@/actions/dashboard";
import AnimatedDashboard from "./AnimatedDashboard";

export default async function DashboardPage() {
  await connection();
  const result = await getDashboardMetrics();
  const metrics: DashboardMetricsData | null =
    result.success && result.data ? result.data : null;

  return <AnimatedDashboard metrics={metrics} />;
}
