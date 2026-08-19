import { apiClient } from "@/lib/api-client";
import type { AskAssistantPayload, AskAssistantResponse } from "@/types/legal-assistant";

interface ApiEnvelope<T> {
  data: T;
}

export async function askAssistant(
  payload: AskAssistantPayload,
): Promise<AskAssistantResponse> {
  const response = await apiClient.post<ApiEnvelope<AskAssistantResponse>>(
    "/assistant/ask",
    payload,
  );
  return response.data.data;
}
