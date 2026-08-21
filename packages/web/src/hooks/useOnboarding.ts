import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeOrganizationOnboarding,
  getOrganizationOnboarding,
  type CompleteOrganizationOnboardingPayload,
} from "@/services/onboarding.service";
import { organizationSettingsKey } from "@/hooks/useSettings";

export const organizationOnboardingKey = [
  "onboarding",
  "organization",
] as const;

export function useOrganizationOnboarding() {
  return useQuery({
    queryKey: organizationOnboardingKey,
    queryFn: getOrganizationOnboarding,
  });
}

export function useCompleteOrganizationOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CompleteOrganizationOnboardingPayload) =>
      completeOrganizationOnboarding(payload),
    onSuccess: (onboarding) => {
      queryClient.setQueryData(organizationOnboardingKey, onboarding);
      queryClient.invalidateQueries({ queryKey: organizationSettingsKey });
    },
  });
}
