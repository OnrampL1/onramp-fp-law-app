import { useQuery } from "@tanstack/react-query";
import {
  fetchInsightCategoryContracts,
  fetchInsightsSummary,
} from "@/services/insights.service";
import type { RiskCategory } from "@/types/insights";

export function useInsightsSummary() {
  return useQuery({
    queryKey: ["insights-summary"],
    queryFn: fetchInsightsSummary,
  });
}

export function useInsightCategoryContracts(category: RiskCategory) {
  return useQuery({
    queryKey: ["insights", category, "contracts"],
    queryFn: () => fetchInsightCategoryContracts(category),
  });
}
