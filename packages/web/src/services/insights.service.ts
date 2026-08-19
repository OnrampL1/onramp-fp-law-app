import { apiClient } from "@/lib/api-client";
import type {
  InsightCategoryContracts,
  InsightsSummary,
  RiskCategory,
} from "@/types/insights";

interface ApiEnvelope<T> {
  data: T;
}

export async function fetchInsightsSummary(): Promise<InsightsSummary> {
  const response =
    await apiClient.get<ApiEnvelope<InsightsSummary>>("/insights/summary");
  return response.data.data;
}

export async function fetchInsightCategoryContracts(
  category: RiskCategory,
): Promise<InsightCategoryContracts> {
  const response = await apiClient.get<ApiEnvelope<InsightCategoryContracts>>(
    `/insights/${category}/contracts`,
  );
  return response.data.data;
}
