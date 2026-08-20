import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  fetchNotificationList,
  getNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "@/services/notifications.service";
import type {
  NotificationListParams,
  NotificationListResult,
  NotificationPreferences,
} from "@/types/notifications";

const NOTIFICATIONS_INFINITE_KEY = "notifications-infinite" as const;
const NOTIFICATION_PREFERENCES_KEY = ["notifications", "preferences"] as const;

// Shared by the bell dropdown's feed and the "View all" modal's scrollable
// list — both append pages into one growing list rather than replacing them
// on navigation, which is exactly what useInfiniteQuery is for. The modal
// additionally keys on its filters (scope/type/date range) so switching
// tabs or presets starts a fresh paged fetch instead of reusing stale pages.
export function useNotificationsInfinite(params: Omit<NotificationListParams, "page">) {
  return useInfiniteQuery({
    queryKey: [NOTIFICATIONS_INFINITE_KEY, params],
    queryFn: ({ pageParam }) => fetchNotificationList({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
  });
}

export function useNotificationsFeed(pageSize: number) {
  return useNotificationsInfinite({ limit: pageSize });
}

function patchItemInPage(
  page: NotificationListResult,
  id: string,
  patch: Partial<NotificationListResult["items"][number]>,
): NotificationListResult {
  if (!page.items.some((item) => item.id === id)) return page;
  return {
    ...page,
    items: page.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id: string) => {
      const readAt = new Date().toISOString();

      queryClient.setQueriesData<InfiniteData<NotificationListResult>>(
        { queryKey: [NOTIFICATIONS_INFINITE_KEY] },
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => patchItemInPage(page, id, { read: true, readAt })),
              }
            : data,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_INFINITE_KEY] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_INFINITE_KEY] });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIFICATION_PREFERENCES_KEY,
    queryFn: getNotificationPreferences,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NotificationPreferences) =>
      updateNotificationPreferences(payload),
    onSuccess: (preferences) => {
      queryClient.setQueryData(NOTIFICATION_PREFERENCES_KEY, preferences);
    },
  });
}
