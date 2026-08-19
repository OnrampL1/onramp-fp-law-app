import { apiClient } from "@/lib/api-client";
import type { NotificationItem } from "@/types/notifications";

interface ApiEnvelope<T> {
  data: T;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const response = await apiClient.get<ApiEnvelope<NotificationItem[]>>(
    "/notifications",
  );
  return response.data.data;
}
