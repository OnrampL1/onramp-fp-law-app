import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWitnessLink,
  getWitnessLinkStats,
  listWitnessLinks,
  resendWitnessLink,
  revokeWitnessLink,
} from "@/services/witness-link.service";
import type { CreateWitnessLinkPayload, WitnessLinkListParams } from "@/types/witness";

const witnessLinksBaseKey = ["witness-links"] as const;
const witnessStatsKey = ["witness-link-stats"] as const;

export function useWitnessLinks(params: WitnessLinkListParams) {
  return useQuery({
    queryKey: [...witnessLinksBaseKey, params],
    queryFn: () => listWitnessLinks(params),
    placeholderData: keepPreviousData,
  });
}

export function useWitnessLinkStats() {
  return useQuery({
    queryKey: witnessStatsKey,
    queryFn: () => getWitnessLinkStats(),
  });
}

export function useCreateWitnessLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWitnessLinkPayload) => createWitnessLink(payload),
    // Partial key match invalidates every listWitnessLinks query regardless
    // of its params (page/contractId filter), same pattern as useContractsList.
    // Stats change too (a new link shifts active/pending/total counts).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: witnessLinksBaseKey });
      queryClient.invalidateQueries({ queryKey: witnessStatsKey });
    },
  });
}

export function useRevokeWitnessLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (witnessInvitationId: string) => revokeWitnessLink(witnessInvitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: witnessLinksBaseKey });
      queryClient.invalidateQueries({ queryKey: witnessStatsKey });
    },
  });
}

export function useResendWitnessLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (witnessInvitationId: string) => resendWitnessLink(witnessInvitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: witnessLinksBaseKey });
      queryClient.invalidateQueries({ queryKey: witnessStatsKey });
    },
  });
}
