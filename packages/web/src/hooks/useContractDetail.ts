import {
  fetchContractContent,
  fetchContractDetail,
  setContractLegalState,
  updateContractMetadata,
} from "../services/contract-detail.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateContractMetadataPayload,
  SetContractLegalStatePayload,
} from "../types/contracts";

// While processing is still in flight, poll so a user sitting on Contract
// Details sees AI-extracted metadata land without a manual reload — this is
// the gap the Batch Upload-form-removal audit flagged (no polling existed
// anywhere in the app). Stops automatically once processingStatus reaches a
// terminal value; refetchIntervalInBackground defaults to false, so this
// also pauses while the tab isn't focused.
export const PENDING_PROCESSING_STATUSES = new Set([
  "PENDING_EXTRACTION",
  "EXTRACTION_COMPLETED",
  "AI_PENDING",
]);
const PROCESSING_POLL_INTERVAL_MS = 4_000;

export function useContractDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: () => fetchContractDetail(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.processingStatus;
      return status && PENDING_PROCESSING_STATUSES.has(status)
        ? PROCESSING_POLL_INTERVAL_MS
        : false;
    },
  });
}

export function useContractContent(id: string | undefined) {
  return useQuery({
    queryKey: ["contract", id, "content"],
    queryFn: () => fetchContractContent(id as string),
    enabled: Boolean(id),
  });
}

export function useUpdateContractMetadata(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateContractMetadataPayload) =>
      updateContractMetadata(id as string, payload),
    onSuccess: (contract) => {
      queryClient.setQueryData(["contract", id], contract);
    },
  });
}

export function useSetContractLegalState(id: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SetContractLegalStatePayload) =>
      setContractLegalState(id as string, payload),
    onSuccess: (contract) => {
      queryClient.setQueryData(["contract", id], contract);
    },
  });
}
