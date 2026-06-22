"use client";

import { useEffect, useState } from "react";

import { Search, Bell, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "@base-ui/react";

export function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

        {/* Notifications */}
        <DropdownMenu>
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
            <Bell className="size-4.5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary" className="text-xs">
                3 new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              {
                t: "Critical risk detected",
                d: "Manufacturing Supply Contract flagged for uncapped liability.",
                time: "5m",
              },
              {
                t: "Contract expiring soon",
                d: "Enterprise SaaS License expires in 23 days.",
                time: "1h",
              },
              {
                t: "AI analysis complete",
                d: "12 clauses extracted from Northwind MSA.",
                time: "3h",
              },
            ].map((n) => (
              <DropdownMenuItem
                key={n.t}
                className="flex flex-col items-start gap-0.5 py-2.5"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium">{n.t}</span>
                  <span className="text-xs text-muted-foreground">
                    {n.time}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{n.d}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    // <header className="flex h-14 items-center justify-end border-b bg-card px-6 gap-4">
    //   <div className="flex items-center gap-2 text-sm text-muted-foreground">
    //     <User className="h-4 w-4" />
    //     <span>{user?.name}</span>
    //   </div>
    //   <button
    //     onClick={logout}
    //     className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    //   >
    //     <LogOut className="h-4 w-4" />
    //     Logout
    //   </button>
    // </header>
  );
}
