import { useQuery } from "@tanstack/react-query";
import { fetchContractTimeline } from "../services/contract-timeline.service";

export function useContractTimeline(
  contractId: string | undefined,
  limit: number,
) {
  return useQuery({
    queryKey: ["contract", contractId, "timeline", limit],
    queryFn: () => fetchContractTimeline(contractId as string, limit),
    enabled: Boolean(contractId),
  });
}
