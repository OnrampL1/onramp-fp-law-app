import { apiClient } from "@/lib/api-client";
import type {
  ContractContentResponse,
  ContractDetailResponse,
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

export async function fetchContractContent(
  id: string,
): Promise<ContractContentResponse> {
  const response = await apiClient.get<ApiEnvelope<ContractContentResponse>>(
    `/contracts/${id}/content`,
  );
  return response.data.data;
}
