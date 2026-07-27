import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  type UpdateOrganizationSettingsPayload,
} from "@/services/settings.service";

export const organizationSettingsKey = ["settings", "organization"] as const;

export function useOrganizationSettings() {
  return useQuery({
    queryKey: organizationSettingsKey,
    queryFn: getOrganizationSettings,
  });
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateOrganizationSettingsPayload) =>
      updateOrganizationSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(organizationSettingsKey, settings);
    },
  });
}
