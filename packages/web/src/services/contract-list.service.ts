import { apiClient } from "../lib/api-client";
import { ContractListParams, ContractListResult } from "../types/contracts";

interface ApiEnvelope<T> {
  data: T;
}

export async function fetchContractList(
  params: ContractListParams,
): Promise<ContractListResult> {
  const query: Record<string, string | number> = {
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
    page: params.page,
    pageSize: params.pageSize,
  };

  if (params.search) query.search = params.search;
  if (params.status) query.status = params.status;
  if (params.tag) query.tag = params.tag;
  if (params.expirationBucket) query.expirationBucket = params.expirationBucket;

  const response = await apiClient.get<ApiEnvelope<ContractListResult>>(
    "/contracts",
    { params: query },
  );

  return response.data.data;
}
