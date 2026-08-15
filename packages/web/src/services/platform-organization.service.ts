import { platformApiClient } from "../lib/platform-api-client";
import type {
  ListPlatformOrganizationsParams,
  ListPlatformOrganizationsResponse,
  PlatformOrganizationListItem,
} from "../types/platform-organization";

export async function listPlatformOrganizations(
  params: ListPlatformOrganizationsParams,
): Promise<ListPlatformOrganizationsResponse> {
  const { data } =
    await platformApiClient.get<ListPlatformOrganizationsResponse>(
      "/platform/organizations",
      { params },
    );

  return data;
}

export async function getPlatformOrganization(
  id: string,
): Promise<PlatformOrganizationListItem> {
  const { data } = await platformApiClient.get<{
    data: PlatformOrganizationListItem;
  }>(`/platform/organizations/${id}`);

  return data.data;
}
