import { useQuery } from "@tanstack/react-query";
import { listPlatformOrganizations } from "../services/platform-organization.service";
import type { ListPlatformOrganizationsParams } from "../types/platform-organization";

export function usePlatformOrganizations(
  params: ListPlatformOrganizationsParams,
) {
  return useQuery({
    queryKey: ["platform-organizations", params],
    queryFn: () => listPlatformOrganizations(params),
  });
}
