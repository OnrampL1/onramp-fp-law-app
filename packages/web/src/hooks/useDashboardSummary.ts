import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/services/dashboard.service";
import { LIST_REFETCH_INTERVAL_MS } from "@/lib/query-config";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}
