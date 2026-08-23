import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchInsightCategoryContracts,
  fetchInsightsSummary,
} from "@/services/insights.service";
import { LIST_REFETCH_INTERVAL_MS } from "@/lib/query-config";
import type { RiskCategory } from "@/types/insights";

export function useInsightsSummary() {
  return useQuery({
    queryKey: ["insights-summary"],
    queryFn: fetchInsightsSummary,
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}

export function useInsightCategoryContracts(
  category: RiskCategory,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: ["insights", category, "contracts", page, pageSize],
    queryFn: () => fetchInsightCategoryContracts(category, page, pageSize),
    placeholderData: keepPreviousData,
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}
