import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, CheckCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toNotificationDisplay } from "@/lib/notifications";
import { useNotificationFilters } from "@/hooks/useNotificationFilters";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsInfinite,
} from "@/hooks/useNotifications";
import { NotificationFilters } from "./NotificationFilters";
import type { NotificationItem, NotificationScope } from "@/types/notifications";

interface NotificationsViewAllModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TABS: { value: NotificationScope; label: string }[] = [
  { value: "PERSONAL", label: "For You" },
  { value: "ORG", label: "Organization" },
];

export function NotificationsViewAllModal({
  open,
  onOpenChange,
}: NotificationsViewAllModalProps) {
  const navigate = useNavigate();
  const filters = useNotificationFilters("PERSONAL");
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotificationsInfinite(filters.queryParams);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = items.some((item) => !item.read);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll, not a Prev/Next table — the sentinel sits at the
  // bottom of the scroll container and loads the next page as it comes
  // into view, same UX as the bell dropdown's feed but automatic instead
  // of a manual "Load more" click.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!open || !root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  function handleSelect(item: NotificationItem) {
    if (!item.read) markRead.mutate(item.id);
    onOpenChange(false);
    navigate(toNotificationDisplay(item).route);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <DialogTitle>All notifications</DialogTitle>
            <DialogDescription>
              Every update across your workspace and for you, with filters.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => markAllRead.mutate()}
            disabled={!hasUnread || markAllRead.isPending}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-border px-4">
          <Tabs
            value={filters.scope}
            onValueChange={(value) => filters.setScope(value as NotificationScope)}
          >
            <TabsList variant="line" className="h-auto gap-4 p-0">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-none px-0 py-2.5 text-sm text-muted-foreground shadow-none data-[active]:bg-transparent data-[active]:text-blue-600 data-[active]:shadow-none after:bg-blue-600"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <NotificationFilters
            datePreset={filters.datePreset}
            filtersActive={filters.filtersActive}
            onDatePresetChange={filters.setDatePreset}
            onReset={filters.resetFilters}
          />
        </div>

        <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading notifications…
            </div>
          )}

          {isError && (
            <div className="py-12 text-center text-sm text-destructive">
              Unable to load notifications.
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <BellOff className="size-6" />
              {filters.filtersActive
                ? "No notifications match this filter."
                : "Nothing here yet."}
            </div>
          )}

          {!isLoading &&
            !isError &&
            items.map((item) => {
              const display = toNotificationDisplay(item);
              const Icon = display.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/60",
                    !item.read && "bg-accent/30",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                      display.iconClassName,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {!item.read && (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-destructive"
                            aria-hidden="true"
                          />
                        )}
                        {display.title}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {display.time}
                      </span>
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {display.description}
                    </span>
                  </div>
                </button>
              );
            })}

          {!isLoading && !isError && items.length > 0 && (
            <div ref={sentinelRef} className="flex items-center justify-center py-4">
              {isFetchingNextPage && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading more…
                </span>
              )}
              {!hasNextPage && (
                <span className="text-xs text-muted-foreground">You've reached the end.</span>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
