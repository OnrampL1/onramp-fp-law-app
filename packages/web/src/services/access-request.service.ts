import { apiClient } from "../lib/api-client";
import type {
  SubmitAccessRequestPayload,
  SubmitAccessRequestResponse,
} from "../types/access-request";

export async function submitAccessRequest(
  payload: SubmitAccessRequestPayload,
): Promise<SubmitAccessRequestResponse["data"]> {
  const { data } = await apiClient.post<SubmitAccessRequestResponse>(
    "/access-requests",
    payload,
  );

  return data.data;
}
