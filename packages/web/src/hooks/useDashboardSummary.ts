import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/services/dashboard.service";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
  });
}
