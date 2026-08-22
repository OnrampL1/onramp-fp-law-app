"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, LogOut, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useMarkNotificationRead,
  useNotificationsFeed,
} from "@/hooks/useNotifications";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { SearchDropdown } from "@/components/layout/search/SearchDropdown";
import { SearchModal } from "@/components/layout/search/SearchModal";
import { NotificationsViewAllModal } from "@/components/notifications/NotificationsViewAllModal";
import { cn } from "@/lib/utils";
import { toNotificationDisplay } from "@/lib/notifications";
import type { NotificationItem } from "@/types/notifications";
import { useTheme } from "@/providers/ThemeProvider";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarTrigger } from "../ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@base-ui/react";

const DROPDOWN_PAGE_SIZE = 10;
// The dropdown is a quick glance, not the full history — cap what it'll
// ever accumulate via "Load more" and point to the "View all" modal (which
// scrolls without limit) once a user actually wants to dig further back.
const DROPDOWN_ITEM_CAP = 20;

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const search = useGlobalSearch();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Deliberately a separate state variable from the search modal's
  // `modalOpen` above — Header.tsx previously had a real naming collision
  // here (a notifications `handleViewAll` that actually opened the search
  // modal because both features shared one `modalOpen`/`handleViewAll`
  // pair). Kept distinct on purpose so that can't happen again.
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);

  const showDropdown = dropdownOpen && search.isActive && !modalOpen;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDropdownOpen(false);
        setModalOpen(true);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  function handleDropdownSelect(route: string) {
    navigate(route);
    setDropdownOpen(false);
    search.setQuery("");
  }

  function handleViewAllSearch() {
    setDropdownOpen(false);
    setModalOpen(true);
  }

  function handleViewAllNotifications() {
    setNotificationsMenuOpen(false);
    setNotificationsModalOpen(true);
  }

  const {
    data: notificationPages,
    isLoading: notificationsLoading,
    isError: notificationsError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotificationsFeed(DROPDOWN_PAGE_SIZE);

  const markRead = useMarkNotificationRead();

  const allLoadedNotifications =
    notificationPages?.pages.flatMap((page) => page.items) ?? [];
  const notifications = allLoadedNotifications.slice(0, DROPDOWN_ITEM_CAP);
  const notificationCount = notifications.length;
  const canLoadMore =
    hasNextPage && allLoadedNotifications.length < DROPDOWN_ITEM_CAP;
  const atCap = allLoadedNotifications.length >= DROPDOWN_ITEM_CAP;
  const hasUnread = notifications.some((item) => !item.read);
  const orgNotifications = notifications.filter((item) => item.scope === "ORG");
  const personalNotifications = notifications.filter(
    (item) => item.scope === "PERSONAL",
  );

  function handleNotificationSelect(item: NotificationItem) {
    if (!item.read) markRead.mutate(item.id);
    navigate(toNotificationDisplay(item).route);
  }

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  function renderNotificationGroup(label: string, items: NotificationItem[]) {
    if (items.length === 0) return null;

    return (
      <div key={label}>
        <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {items.map((item) => {
          const display = toNotificationDisplay(item);
          const Icon = display.icon;

          return (
            <DropdownMenuItem
              key={item.id}
              className="items-start gap-2.5 py-2.5"
              onClick={() => handleNotificationSelect(item)}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                  display.iconClassName,
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                    {!item.read && (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-destructive"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">{display.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {display.time}
                  </span>
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {display.description}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="hidden h-6 lg:block" />
      <div
        ref={searchContainerRef}
        className="relative hidden flex-1 md:block md:max-w-md"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search.query}
          onChange={(event) => {
            search.setQuery(event.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setDropdownOpen(false);
          }}
          placeholder="Search contracts, clauses, counterparties..."
          className="h-9 pl-9"
          aria-label="Global search"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
          Ctrl K
        </kbd>

        {showDropdown && (
          <SearchDropdown
            query={search.query}
            groups={search.groups}
            isLoadingLive={search.isLoadingLive}
            isLiveError={search.isLiveError}
            onSelect={handleDropdownSelect}
            onViewAll={handleViewAllSearch}
          />
        )}
      </div>

      <SearchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        query={search.query}
        onQueryChange={search.setQuery}
        groups={search.groups}
        isLoadingLive={search.isLoadingLive}
        isLiveError={search.isLiveError}
      />

      <NotificationsViewAllModal
        open={notificationsModalOpen}
        onOpenChange={setNotificationsModalOpen}
      />

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        <DropdownMenu
          open={notificationsMenuOpen}
          onOpenChange={setNotificationsMenuOpen}
        >
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="relative h-9 w-9"
                aria-label="Notifications"
              />
            }
          >
            <Bell className="size-4" />
            {notificationCount > 0 && hasUnread && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {notificationsLoading && (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Loading notifications...
                </div>
              )}

              {notificationsError && (
                <div className="px-2 py-4 text-center text-xs text-destructive">
                  Unable to load notifications.
                </div>
              )}

              {!notificationsLoading &&
                !notificationsError &&
                notificationCount === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    You're all caught up - no notifications right now.
                  </div>
                )}

              {!notificationsLoading &&
                !notificationsError &&
                renderNotificationGroup("Organization", orgNotifications)}
              {!notificationsLoading &&
                !notificationsError &&
                renderNotificationGroup("For You", personalNotifications)}

              {!notificationsLoading &&
                !notificationsError &&
                notificationCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="flex items-center justify-between gap-2 px-1 py-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={!canLoadMore || isFetchingNextPage}
                        onClick={(event) => {
                          event.stopPropagation();
                          fetchNextPage();
                        }}
                      >
                        {isFetchingNextPage
                          ? "Loading…"
                          : atCap
                            ? "View all for more"
                            : hasNextPage
                              ? "Load more"
                              : "No more notifications"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleViewAllNotifications();
                        }}
                      >
                        View all
                      </Button>
                    </div>
                  </>
                )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setSignOutOpen(true)}
          disabled={isLoggingOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Clausio?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again before accessing your contract
              workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoggingOut}
              onClick={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
            >
              {isLoggingOut ? "Signing out..." : "Yes, sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
