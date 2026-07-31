import { apiClient } from "../lib/api-client";
import type { BackendUserRole } from "../lib/permissions";

export interface ApiInvitation {
  id: string;
  email: string;
  role: BackendUserRole;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  meta: { pagination: { page: number; limit: number; total: number; totalPages: number } };
}

export interface CreateInvitationPayload {
  email: string;
  fullName: string;
  role: Extract<BackendUserRole, "ADMIN" | "INTERNAL">;
}

export async function listInvitations(): Promise<ApiInvitation[]> {
  const { data } = await apiClient.get<Paginated<ApiInvitation>>("/invitations", {
    params: { limit: 100 },
  });
  return data.data;
}

export async function createInvitation(
  payload: CreateInvitationPayload,
): Promise<ApiInvitation> {
  const { data } = await apiClient.post<{ data: ApiInvitation }>(
    "/invitations",
    payload,
  );
  return data.data;
}

export async function resendInvitation(
  invitationId: string,
): Promise<ApiInvitation> {
  const { data } = await apiClient.post<{ data: ApiInvitation }>(
    `/invitations/${invitationId}/resend`,
  );
  return data.data;
}

export async function revokeInvitation(
  invitationId: string,
): Promise<ApiInvitation> {
  const { data } = await apiClient.post<{ data: ApiInvitation }>(
    `/invitations/${invitationId}/revoke`,
  );
  return data.data;
}
