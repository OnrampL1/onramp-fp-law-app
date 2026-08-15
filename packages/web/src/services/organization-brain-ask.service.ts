import { apiClient } from "@/lib/api-client";
import type { AskOrgBrainPayload, AskOrgBrainResponse } from "@/types/legal-assistant";

interface ApiEnvelope<T> {
  data: T;
}

export async function askOrganizationBrain(
  payload: AskOrgBrainPayload,
): Promise<AskOrgBrainResponse> {
  const response = await apiClient.post<ApiEnvelope<AskOrgBrainResponse>>(
    "/organization-brain/ask",
    payload,
  );
  return response.data.data;
}
