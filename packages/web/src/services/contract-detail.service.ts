import { apiClient } from "@/lib/api-client";
import type {
  ContractContentResponse,
  ContractDetailResponse,
  SetContractLegalStatePayload,
  UpdateContractContentPayload,
  UpdateContractMetadataPayload,
} from "@/types/contracts";

interface ApiEnvelope<T> {
  data: T;
}

export async function fetchContractDetail(
  id: string,
): Promise<ContractDetailResponse> {
  const response = await apiClient.get<ApiEnvelope<ContractDetailResponse>>(
    `/contracts/${id}`,
  );
  return response.data.data;
}

export async function updateContractMetadata(
  id: string,
  payload: UpdateContractMetadataPayload,
): Promise<ContractDetailResponse> {
  const response = await apiClient.put<ApiEnvelope<ContractDetailResponse>>(
    `/contracts/${id}/metadata`,
    payload,
  );
  return response.data.data;
}

export async function fetchContractContent(
  id: string,
): Promise<ContractContentResponse> {
  const response = await apiClient.get<ApiEnvelope<ContractContentResponse>>(
    `/contracts/${id}/content`,
  );
  return response.data.data;
}

export async function setContractLegalState(
  id: string,
  payload: SetContractLegalStatePayload,
): Promise<ContractDetailResponse> {
  const response = await apiClient.put<ApiEnvelope<ContractDetailResponse>>(
    `/contracts/${id}/legal-state`,
    payload,
  );
  return response.data.data;
}

export async function updateContractContent(
  id: string,
  payload: UpdateContractContentPayload,
): Promise<ContractContentResponse> {
  const response = await apiClient.put<ApiEnvelope<ContractContentResponse>>(
    `/contracts/${id}/content`,
    payload,
  );
  return response.data.data;
}
