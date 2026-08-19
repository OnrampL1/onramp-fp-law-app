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
    logoUrlExpiresInSeconds: number | null;
    notificationPreferences: NotificationPreferences | null;
    branding: unknown | null;
  };
  permissions: {
    canManageSettings: boolean;
    canRenameOrganization: boolean;
  };
};

export type UpdateOrganizationSettingsPayload = Partial<{
  name: string;
  timezone: string;
  language: "en" | "fr" | "ar";
  notificationPreferences: NotificationPreferences;
}>;

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

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

export async function uploadOrganizationLogo(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<{ data: OrganizationSettingsResponse }>(
    "/settings/organization/logo",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

export async function deleteOrganizationLogo() {
  const { data } = await apiClient.delete<{ data: OrganizationSettingsResponse }>(
    "/settings/organization/logo",
  );
  return data.data;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  await apiClient.post("/auth/change-password", payload);
}
