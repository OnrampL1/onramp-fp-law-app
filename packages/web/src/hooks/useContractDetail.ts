import {
  fetchContractContent,
  fetchContractDetail,
  updateContractMetadata,
} from "../services/contract-detail.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateContractMetadataPayload } from "../types/contracts";

export function useContractDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: () => fetchContractDetail(id as string),
    enabled: Boolean(id),
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
