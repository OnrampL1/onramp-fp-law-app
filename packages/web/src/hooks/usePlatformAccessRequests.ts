import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approvePlatformAccessRequest,
  declinePlatformAccessRequest,
  getPlatformAccessRequest,
  listPlatformAccessRequests,
} from "../services/platform-access-request.service";
import { LIST_REFETCH_INTERVAL_MS } from "../lib/query-config";
import type {
  ApprovePlatformAccessRequestPayload,
  DeclinePlatformAccessRequestPayload,
  ListPlatformAccessRequestsParams,
} from "../types/platform-access-request";

export function usePlatformAccessRequests(
  params: ListPlatformAccessRequestsParams,
) {
  return useQuery({
    queryKey: ["platform-access-requests", params],
    queryFn: () => listPlatformAccessRequests(params),
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
}

export function usePlatformAccessRequest(id: string | null) {
  return useQuery({
    queryKey: ["platform-access-request", id],
    queryFn: () => getPlatformAccessRequest(id!),
    enabled: !!id,
  });
}

export function useApprovePlatformAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: ApprovePlatformAccessRequestPayload;
    }) => approvePlatformAccessRequest(requestId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform-access-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["platform-access-request", variables.requestId],
      });
      queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
    },
  });
}

export function useDeclinePlatformAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: DeclinePlatformAccessRequestPayload;
    }) => declinePlatformAccessRequest(requestId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform-access-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["platform-access-request", variables.requestId],
      });
    },
  });
}
