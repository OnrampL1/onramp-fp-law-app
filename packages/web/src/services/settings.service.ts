import { apiClient } from "@/lib/api-client";

export type NotificationPreferences = {
  contractUpdates?: boolean;
  riskAlerts?: boolean;
  aiInsights?: boolean;
};

export type OrganizationSettingsResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    status: "CREATED" | "OWNER_ASSIGNED" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  };
  settings: {
    timezone: string;
    language: "en" | "fr" | "ar";
    logoUrl: string | null;
    notificationPreferences: NotificationPreferences | null;
    branding: unknown | null;
  };
  permissions: {
    canManageSettings: boolean;
  };
};

export type UpdateOrganizationSettingsPayload = Partial<{
  name: string;
  timezone: string;
  language: "en" | "fr" | "ar";
  logoUrl: string | null;
  notificationPreferences: NotificationPreferences;
}>;

export async function getOrganizationSettings() {
  const { data } = await apiClient.get<{ data: OrganizationSettingsResponse }>(
    "/settings/organization",
  );
  return data.data;
}

export async function updateOrganizationSettings(
  payload: UpdateOrganizationSettingsPayload,
) {
  const { data } = await apiClient.put<{ data: OrganizationSettingsResponse }>(
    "/settings/organization",
    payload,
  );
  return data.data;
}
