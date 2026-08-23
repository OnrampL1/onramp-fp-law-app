import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchAuditLogList } from "../services/audit-log.service";
import { LIST_REFETCH_INTERVAL_MS } from "../lib/query-config";
import type { AuditLogListParams } from "../types/audit";

export function useAuditLogsList(organizationId: string | undefined, params: AuditLogListParams) {
  return useQuery({
    queryKey: ["audit-logs", organizationId, params],
    queryFn: () => fetchAuditLogList(organizationId as string, params),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}
