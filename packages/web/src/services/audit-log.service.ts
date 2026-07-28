import { apiClient } from "../lib/api-client";
import type { AuditLogListParams, AuditLogListResult } from "../types/audit";

interface ApiEnvelope<T> {
  data: T[];
  meta: { pagination: AuditLogListResult["pagination"] };
}

// Organization is derived from the authenticated session on the backend —
// the :id path segment is only checked against it, never trusted alone.
export async function fetchAuditLogList(
  organizationId: string,
  params: AuditLogListParams,
): Promise<AuditLogListResult> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };

  if (params.contractId) query.contractId = params.contractId;
  if (params.actorUserId) query.actorUserId = params.actorUserId;
  if (params.action) query.action = params.action;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;

  const response = await apiClient.get<ApiEnvelope<AuditLogListResult["items"][number]>>(
    `/organizations/${organizationId}/audit-logs`,
    { params: query },
  );

  return { items: response.data.data, pagination: response.data.meta.pagination };
}
