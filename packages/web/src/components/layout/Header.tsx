"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Clock, LogOut, Moon, Sparkles, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { NotificationItem } from "@/types/notifications";

import { Badge } from "../ui/badge";
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

const DAY_MS = 24 * 60 * 60 * 1000;

function formatExpiryInDays(isoDate: string): string {
  const today = new Date();
  const todayUtcMidnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const expiry = new Date(isoDate);
  const expiryUtcMidnight = Date.UTC(
    expiry.getUTCFullYear(),
    expiry.getUTCMonth(),
    expiry.getUTCDate(),
  );
  const daysUntil = Math.round(
    (expiryUtcMidnight - todayUtcMidnight) / DAY_MS,
  );

  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

function toDisplayNotification(item: NotificationItem) {
  if (item.type === "CONTRACT_EXPIRING") {
    const expiry = formatExpiryInDays(item.occurredAt);
    return {
      key: item.id,
      icon: Clock,
      iconClassName: "bg-amber-50 text-amber-600",
      title: "Contract expiring soon",
      description: `${item.contractTitle} expires ${expiry}.`,
      time: expiry,
    };
  }

  const time = formatRelativeTime(item.occurredAt);
  return {
    key: item.id,
    icon: Sparkles,
    iconClassName: "bg-emerald-50 text-emerald-600",
    title: "AI analysis complete",
    description: `Analysis completed for ${item.contractTitle}.`,
    time,
  };
}

const SEEN_STORAGE_KEY = "clausio:notifications:seenIds";

function readSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeenIds(ids: string[]): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable; notification seen state just will not persist.
  }
}

export function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: notifications, isLoading, isError } = useNotifications();
  const notificationCount = notifications?.length ?? 0;

  const [seenIds, setSeenIds] = useState<Set<string>>(() => readSeenIds());
  const hasUnseen = (notifications ?? []).some((item) => !seenIds.has(item.id));

  function handleNotificationsOpenChange(open: boolean) {
    if (!open || !notifications) return;
    const ids = notifications.map((item) => item.id);
    writeSeenIds(ids);
    setSeenIds(new Set(ids));
  }

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const nextTheme =
      storedTheme === "dark" || (!storedTheme && prefersDark)
        ? "dark"
        : "light";

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="hidden h-6 lg:block" />
      <div className="relative hidden flex-1 md:block md:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search contracts, clauses, counterparties..."
          className="h-9 pl-9"
          aria-label="Global search"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
          Ctrl K
        </kbd>
      </div>

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

        <DropdownMenu onOpenChange={handleNotificationsOpenChange}>
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
            {notificationCount > 0 && hasUnseen && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {notificationCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {isLoading && (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Loading notifications...
                </div>
              )}

              {isError && (
                <div className="px-2 py-4 text-center text-xs text-destructive">
                  Unable to load notifications.
                </div>
              )}

              {!isLoading && !isError && notificationCount === 0 && (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  You're all caught up - no notifications right now.
                </div>
              )}

              {!isLoading &&
                !isError &&
                notifications?.map((item) => {
                  const display = toDisplayNotification(item);
                  const Icon = display.icon;

                  return (
                    <DropdownMenuItem
                      key={display.key}
                      className="items-start gap-2.5 py-2.5"
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
                          <span className="text-sm font-medium">
                            {display.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {display.time}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {display.description}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
