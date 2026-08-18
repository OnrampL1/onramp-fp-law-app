import { useQuery } from "@tanstack/react-query";
import {
  getPlatformAccessRequest,
  listPlatformAccessRequests,
} from "../services/platform-access-request.service";
import type { ListPlatformAccessRequestsParams } from "../types/platform-access-request";

export function usePlatformAccessRequests(
  params: ListPlatformAccessRequestsParams,
) {
  return useQuery({
    queryKey: ["platform-access-requests", params],
    queryFn: () => listPlatformAccessRequests(params),
  });
}

export function usePlatformAccessRequest(id: string | null) {
  return useQuery({
    queryKey: ["platform-access-request", id],
    queryFn: () => getPlatformAccessRequest(id!),
    enabled: !!id,
  });
}
