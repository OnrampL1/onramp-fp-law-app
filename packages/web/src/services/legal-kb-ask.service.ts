import { apiClient } from "@/lib/api-client";
import type { AskLegalKbPayload, AskLegalKbResponse } from "@/types/legal-assistant";

interface ApiEnvelope<T> {
  data: T;
}

export async function askLegalKb(
  payload: AskLegalKbPayload,
): Promise<AskLegalKbResponse> {
  const response = await apiClient.post<ApiEnvelope<AskLegalKbResponse>>(
    "/legal-kb/ask",
    payload,
  );
  return response.data.data;
}
