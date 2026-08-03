import { apiClient } from "../lib/api-client";
import type {
  CreateWitnessLinkPayload,
  WitnessLinkListParams,
  WitnessLinkListResult,
  WitnessLinkResult,
  WitnessLinkStats,
} from "../types/witness";

interface ApiEnvelope<T> {
  data: T;
}

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { pagination: WitnessLinkListResult["pagination"] };
}

export async function listWitnessLinks(
  params: WitnessLinkListParams,
): Promise<WitnessLinkListResult> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.contractId) query.contractId = params.contractId;

  const response = await apiClient.get<
    PaginatedEnvelope<WitnessLinkListResult["items"][number]>
  >("/users/witness-link", { params: query });

  return { items: response.data.data, pagination: response.data.meta.pagination };
}

export async function createWitnessLink(
  payload: CreateWitnessLinkPayload,
): Promise<WitnessLinkResult> {
  const response = await apiClient.post<ApiEnvelope<WitnessLinkResult>>(
    "/users/witness-link",
    payload,
  );
  return response.data.data;
}

export async function revokeWitnessLink(
  witnessInvitationId: string,
): Promise<WitnessLinkResult> {
  const response = await apiClient.post<ApiEnvelope<WitnessLinkResult>>(
    `/users/witness-link/${witnessInvitationId}/revoke`,
  );
  return response.data.data;
}

export async function resendWitnessLink(
  witnessInvitationId: string,
): Promise<WitnessLinkResult> {
  const response = await apiClient.post<ApiEnvelope<WitnessLinkResult>>(
    `/users/witness-link/${witnessInvitationId}/resend`,
  );
  return response.data.data;
}

export async function getWitnessLinkStats(): Promise<WitnessLinkStats> {
  const response = await apiClient.get<ApiEnvelope<WitnessLinkStats>>(
    "/users/witness-link/stats",
  );
  return response.data.data;
}
