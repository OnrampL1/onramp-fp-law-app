import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrganizationBrainPaste,
  createOrganizationBrainUpload,
  deleteOrganizationBrainItem,
  fetchOrganizationBrainItem,
  fetchOrganizationBrainItems,
} from "@/services/organization-brain.service";
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
  });
}

export function useOrganizationBrainItem(itemId: string | null) {
  return useQuery({
    queryKey: [...organizationBrainItemsKey, "detail", itemId],
    queryFn: () => fetchOrganizationBrainItem(itemId!),
    enabled: Boolean(itemId),
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
