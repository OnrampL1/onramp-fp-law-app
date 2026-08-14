import { apiClient } from "@/lib/api-client";
import type { AuditLogListResult } from "@/types/audit";

interface ApiEnvelope<T> {
  data: T[];
  meta: { pagination: AuditLogListResult["pagination"] };
}

export async function fetchContractTimeline(
  contractId: string,
  limit: number,
): Promise<AuditLogListResult> {
  const response = await apiClient.get<
    ApiEnvelope<AuditLogListResult["items"][number]>
  >(`/contracts/${contractId}/timeline`, { params: { limit } });

  return {
    items: response.data.data,
    pagination: response.data.meta.pagination,
  };
}
