import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContractDetailResponse } from "../types/contracts";
import {
  fetchRiskOverview,
  fetchSummaryOverview,
  triggerContractAnalysis,
} from "../services/ai-analysis.service";

// Both overview endpoints 404 until a COMPLETED analysis of that specific
// type exists — attempting the fetch is only worthwhile once the contract
// has actually reached an AI processing status. Earlier statuses
// (PENDING_EXTRACTION/EXTRACTION_COMPLETED/EXTRACTION_FAILED) mean AI
// analysis was never queued, so there is nothing to fetch yet.

function analysisMayExist(
  processingStatus: ContractDetailResponse["processingStatus"] | undefined,
): boolean {
  return (
    processingStatus === "AI_PENDING" ||
    processingStatus === "AI_COMPLETED" ||
    processingStatus === "AI_FAILED"
  );
}

export function useRiskOverview(
  contractId: string | undefined,
  processingStatus: ContractDetailResponse["processingStatus"] | undefined,
) {
  return useQuery({
    queryKey: ["contract", contractId, "risk-overview", processingStatus],
    queryFn: () => fetchRiskOverview(contractId as string),
    enabled: Boolean(contractId) && analysisMayExist(processingStatus),
    retry: false,
  });
}
export function useSummaryOverview(
  contractId: string | undefined,
  processingStatus: ContractDetailResponse["processingStatus"] | undefined,
) {
  return useQuery({
    queryKey: ["contract", contractId, "summary-overview", processingStatus],
    queryFn: () => fetchSummaryOverview(contractId as string),
    enabled: Boolean(contractId) && analysisMayExist(processingStatus),
    retry: false,
  });
}

export function useTriggerContractAnalysis(contractId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => triggerContractAnalysis(contractId as string),
    onSuccess: () => {
      // exact: true — invalidateQueries prefix-matches by default, which
      // would also (redundantly) invalidate ["contract", contractId,
      // "content"], racing whatever's currently reading it. Same fix as
      // useUpdateContractContent's onSuccess.
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId],
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "risk-overview"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "summary-overview"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contract", contractId, "timeline"],
      });
    },
  });
}
