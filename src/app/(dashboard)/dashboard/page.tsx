import { getDashboardMetrics, type DashboardMetricsData } from "@/actions/dashboard";
import Link from "next/link";
import styles from "../dashboard.module.css";
import AnimatedDashboard from "./AnimatedDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await getDashboardMetrics();
  const metrics: DashboardMetricsData | null =
    result.success && result.data ? result.data : null;

  return <AnimatedDashboard metrics={metrics} />;
}
