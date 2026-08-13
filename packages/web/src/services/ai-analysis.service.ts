import { apiClient } from "@/lib/api-client";
import type { RiskOverviewDto, SummaryOverviewDto } from "@/types/ai-analysis";

interface ApiEnvelope<T> {
  data: T;
}

export async function fetchRiskOverview(
  contractId: string,
): Promise<RiskOverviewDto> {
  const response = await apiClient.get<ApiEnvelope<RiskOverviewDto>>(
    `/contracts/${contractId}/risk-overview`,
  );
  return response.data.data;
}

export async function fetchSummaryOverview(
  contractId: string,
): Promise<SummaryOverviewDto> {
  const response = await apiClient.get<ApiEnvelope<SummaryOverviewDto>>(
    `/contracts/${contractId}/summary-overview`,
  );
  return response.data.data;
}

export async function triggerContractAnalysis(
  contractId: string,
): Promise<void> {
  await apiClient.post(`/contracts/${contractId}/analyses`);
}
