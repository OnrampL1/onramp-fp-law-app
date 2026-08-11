import { apiClient } from "@/lib/api-client";
import type {
  CreateOrganizationBrainPastePayload,
  CreateOrganizationBrainUploadPayload,
  OrganizationBrainItem,
  OrganizationBrainItemDetail,
  OrganizationBrainListParams,
  OrganizationBrainListResult,
} from "@/types/organization-brain";

interface ApiEnvelope<T> {
  data: T;
}

export async function fetchOrganizationBrainItems(
  params: OrganizationBrainListParams,
): Promise<OrganizationBrainListResult> {
  const query: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
  };

  if (params.type) query.type = params.type;
  if (params.search) query.search = params.search;

  const response = await apiClient.get<
    ApiEnvelope<OrganizationBrainListResult>
  >("/organization-brain", { params: query });

  return response.data.data;
}

export async function fetchOrganizationBrainItem(
  itemId: string,
): Promise<OrganizationBrainItemDetail> {
  const response = await apiClient.get<
    ApiEnvelope<OrganizationBrainItemDetail>
  >(`/organization-brain/${itemId}`);

  return response.data.data;
}

export async function createOrganizationBrainPaste(
  payload: CreateOrganizationBrainPastePayload,
): Promise<OrganizationBrainItem> {
  const response = await apiClient.post<ApiEnvelope<OrganizationBrainItem>>(
    "/organization-brain/paste",
    payload,
  );

  return response.data.data;
}

export async function createOrganizationBrainUpload(
  payload: CreateOrganizationBrainUploadPayload,
): Promise<OrganizationBrainItem> {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("type", payload.type);
  formData.append("file", payload.file);

  const response = await apiClient.post<ApiEnvelope<OrganizationBrainItem>>(
    "/organization-brain/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data.data;
}

export async function deleteOrganizationBrainItem(
  itemId: string,
): Promise<void> {
  await apiClient.delete(`/organization-brain/${itemId}`);
}
