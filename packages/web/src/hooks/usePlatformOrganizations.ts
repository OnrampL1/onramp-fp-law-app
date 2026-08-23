import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignPlatformOrganizationOwner,
  createPlatformOrganization,
  listPlatformOrganizations,
  updatePlatformOrganizationStatus,
} from "../services/platform-organization.service";
import { LIST_REFETCH_INTERVAL_MS } from "../lib/query-config";
import type {
  AssignPlatformOrganizationOwnerPayload,
  CreatePlatformOrganizationPayload,
  ListPlatformOrganizationsParams,
  UpdatePlatformOrganizationStatusPayload,
} from "../types/platform-organization";

export function usePlatformOrganizations(
  params: ListPlatformOrganizationsParams,
) {
  return useQuery({
    queryKey: ["platform-organizations", params],
    queryFn: () => listPlatformOrganizations(params),
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}

export function useCreatePlatformOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlatformOrganizationPayload) =>
      createPlatformOrganization(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
    },
  });
}

export function useAssignPlatformOrganizationOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      payload,
    }: {
      organizationId: string;
      payload: AssignPlatformOrganizationOwnerPayload;
    }) => assignPlatformOrganizationOwner(organizationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
    },
  });
}

export function useUpdatePlatformOrganizationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      payload,
    }: {
      organizationId: string;
      payload: UpdatePlatformOrganizationStatusPayload;
    }) => updatePlatformOrganizationStatus(organizationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
    },
  });
}
