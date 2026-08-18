import { platformApiClient } from "../lib/platform-api-client";
import type {
  ListPlatformAccessRequestsParams,
  ListPlatformAccessRequestsResponse,
  PlatformAccessRequest,
} from "../types/platform-access-request";

export async function listPlatformAccessRequests(
  params: ListPlatformAccessRequestsParams,
): Promise<ListPlatformAccessRequestsResponse> {
  const { data } =
    await platformApiClient.get<ListPlatformAccessRequestsResponse>(
      "/platform/access-requests",
      { params },
    );

  return data;
}

export async function getPlatformAccessRequest(
  id: string,
): Promise<PlatformAccessRequest> {
  const { data } = await platformApiClient.get<{
    data: PlatformAccessRequest;
  }>(`/platform/access-requests/${id}`);

  return data.data;
}
