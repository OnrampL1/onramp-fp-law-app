import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchOrganizationActivity,
  type OrganizationActivityParams,
} from "../services/audit-log.service";

export function useOrganizationActivity(
  organizationId: string | undefined,
  params: OrganizationActivityParams,
) {
  return useQuery({
    queryKey: ["organization-activity", organizationId, params],
    queryFn: () => fetchOrganizationActivity(organizationId as string, params),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });
}
