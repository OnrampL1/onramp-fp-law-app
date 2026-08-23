import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrganizationBrainPaste,
  createOrganizationBrainUpload,
  deleteOrganizationBrainItem,
  fetchOrganizationBrainItems,
} from "@/services/organization-brain.service";
import { LIST_REFETCH_INTERVAL_MS } from "@/lib/query-config";
import type {
  CreateOrganizationBrainPastePayload,
  CreateOrganizationBrainUploadPayload,
  OrganizationBrainListParams,
} from "@/types/organization-brain";

export const organizationBrainItemsKey = ["organization-brain"] as const;

export function useOrganizationBrainItems(params: OrganizationBrainListParams) {
  return useQuery({
    queryKey: [...organizationBrainItemsKey, params],
    queryFn: () => fetchOrganizationBrainItems(params),
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}

export function useCreateOrganizationBrainPaste() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrganizationBrainPastePayload) =>
      createOrganizationBrainPaste(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationBrainItemsKey }),
  });
}

export function useCreateOrganizationBrainUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrganizationBrainUploadPayload) =>
      createOrganizationBrainUpload(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationBrainItemsKey }),
  });
}

export function useDeleteOrganizationBrainItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteOrganizationBrainItem(itemId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationBrainItemsKey }),
  });
}
