import { useMemo, useState } from "react";
import { getDateRangeForPreset } from "@/lib/notifications";
import type {
  DateRangePreset,
  NotificationListParams,
  NotificationScope,
} from "@/types/notifications";

const PAGE_SIZE = 20;

export interface UseNotificationFiltersResult {
  scope: NotificationScope;
  datePreset: DateRangePreset;
  filtersActive: boolean;
  setScope: (value: NotificationScope) => void;
  setDatePreset: (value: DateRangePreset) => void;
  resetFilters: () => void;
  queryParams: Omit<NotificationListParams, "page">;
}

// One tab (scope) is always selected — there's no "all" scope option, since
// the modal is now tabbed (Organization / For You) rather than a flat list
// with an optional type filter. The old Type filter is gone entirely: every
// current NotificationType maps 1:1 to a scope, so once scope is a tab it
// would just re-select the same single type already implied by the tab.
export function useNotificationFilters(
  initialScope: NotificationScope,
): UseNotificationFiltersResult {
  const [scope, setScope] = useState<NotificationScope>(initialScope);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("all");

  const filtersActive = datePreset !== "all";

  function resetFilters() {
    setDatePreset("all");
  }

  // Computed once per preset change, not per render: getDateRangeForPreset
  // stamps `now` into dateFrom/dateTo, so calling it inline in the returned
  // object (recomputed on every render) produced a new dateFrom value every
  // few milliseconds — a new query key on every re-render, which fired
  // duplicate requests and, live, tripped the API's rate limiter. Found
  // while verifying the preset filter actually applying.
  const dateRange = useMemo(() => getDateRangeForPreset(datePreset), [datePreset]);

  return {
    scope,
    datePreset,
    filtersActive,
    setScope,
    setDatePreset,
    resetFilters,
    queryParams: {
      scope,
      ...dateRange,
      limit: PAGE_SIZE,
    },
  };
}
