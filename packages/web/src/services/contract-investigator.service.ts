import { apiClient } from "@/lib/api-client";
import type {
  AskInvestigatorPayload,
  AskInvestigatorResponse,
} from "@/types/investigator";

interface ApiEnvelope<T> {
  data: T;
}

export async function askInvestigator(
  contractId: string,
  payload: AskInvestigatorPayload,
): Promise<AskInvestigatorResponse> {
  const response = await apiClient.post<ApiEnvelope<AskInvestigatorResponse>>(
    `/contracts/${contractId}/investigator/ask`,
    payload,
  );
  return response.data.data;
}
