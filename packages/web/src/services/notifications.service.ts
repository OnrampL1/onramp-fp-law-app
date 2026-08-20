import { apiClient } from "@/lib/api-client";
import type {
  NotificationItem,
  NotificationListParams,
  NotificationListResult,
  NotificationPaginationMeta,
  NotificationPreferences,
} from "@/types/notifications";

interface ApiEnvelope<T> {
  data: T;
}

interface ListEnvelope {
  data: NotificationItem[];
  pagination: NotificationPaginationMeta;
}

export async function fetchNotificationList(
  params: NotificationListParams,
): Promise<NotificationListResult> {
  const query: Record<string, string | number | string[]> = {
    page: params.page,
    limit: params.limit,
  };

  if (params.scope) query.scope = params.scope;
  if (params.type) query.type = params.type;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;

  const response = await apiClient.get<ListEnvelope>("/notifications", {
    params: query,
  });

  return { items: response.data.data, pagination: response.data.pagination };
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationItem> {
  const response = await apiClient.post<ApiEnvelope<NotificationItem>>(
    `/notifications/${id}/read`,
  );
  return response.data.data;
}

export async function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  const response =
    await apiClient.post<ApiEnvelope<{ updatedCount: number }>>(
      "/notifications/read-all",
    );
  return response.data.data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await apiClient.get<ApiEnvelope<NotificationPreferences>>(
    "/notifications/preferences",
  );
  return response.data.data;
}

export async function updateNotificationPreferences(
  payload: NotificationPreferences,
): Promise<NotificationPreferences> {
  const response = await apiClient.put<ApiEnvelope<NotificationPreferences>>(
    "/notifications/preferences",
    payload,
  );
  return response.data.data;
}
