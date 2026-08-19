import { platformApiClient } from "../lib/platform-api-client";
import type {
  AssignPlatformOrganizationOwnerPayload,
  CreatePlatformOrganizationPayload,
  ListPlatformOrganizationsParams,
  ListPlatformOrganizationsResponse,
  PlatformOrganizationListItem,
  UpdatePlatformOrganizationStatusPayload,
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

export async function createPlatformOrganization(
  payload: CreatePlatformOrganizationPayload,
): Promise<PlatformOrganizationListItem> {
  const { data } = await platformApiClient.post<{
    data: PlatformOrganizationListItem;
  }>("/platform/organizations", payload);

  return data.data;
}

export async function assignPlatformOrganizationOwner(
  organizationId: string,
  payload: AssignPlatformOrganizationOwnerPayload,
): Promise<PlatformOrganizationListItem> {
  const { data } = await platformApiClient.post<{
    data: PlatformOrganizationListItem;
  }>(`/platform/organizations/${organizationId}/owner`, payload);

  return data.data;
}

export async function updatePlatformOrganizationStatus(
  organizationId: string,
  payload: UpdatePlatformOrganizationStatusPayload,
): Promise<PlatformOrganizationListItem> {
  const { data } = await platformApiClient.patch<{
    data: PlatformOrganizationListItem;
  }>(`/platform/organizations/${organizationId}/status`, payload);

  return data.data;
}
