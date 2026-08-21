import { apiClient } from "@/lib/api-client";
import type { NotificationPreferences } from "@/services/settings.service";

export type OrganizationOnboardingResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    status: "CREATED" | "OWNER_ASSIGNED" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
    onboardingRequired: boolean;
  };
  settings: {
    timezone: string;
    language: "en" | "fr" | "ar";
    notificationPreferences: NotificationPreferences | null;
  };
  permissions: {
    canCompleteOnboarding: boolean;
  };
};

export type CompleteOrganizationOnboardingPayload = {
  name: string;
  timezone: string;
  language: "en" | "fr" | "ar";
  notificationPreferences?: NotificationPreferences;
};

export async function getOrganizationOnboarding() {
  const { data } = await apiClient.get<{
    data: OrganizationOnboardingResponse;
  }>("/onboarding/organization");

  return data.data;
}

export async function completeOrganizationOnboarding(
  payload: CompleteOrganizationOnboardingPayload,
) {
  const { data } = await apiClient.post<{
    data: OrganizationOnboardingResponse;
  }>("/onboarding/organization/complete", payload);

  return data.data;
}
