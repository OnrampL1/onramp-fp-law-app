import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchOrganizationActivity,
  type OrganizationActivityParams,
} from "../services/audit-log.service";
import { LIST_REFETCH_INTERVAL_MS } from "../lib/query-config";

export function useOrganizationActivity(
  organizationId: string | undefined,
  params: OrganizationActivityParams,
) {
  return useQuery({
    queryKey: ["organization-activity", organizationId, params],
    queryFn: () => fetchOrganizationActivity(organizationId as string, params),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}
