import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  FileText,
  LogOut,
  Moon,
  Scale,
  ShieldAlert,
  Sun,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { usePlatformAuth } from "../hooks/usePlatformAuth";
import { useTheme } from "../providers/ThemeProvider";

function roleLabel(role: string) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "SUPPORT_ENGINEER") return "Support Engineer";
  return role;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function PlatformLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { platformUser, platformLogout } = usePlatformAuth();
  const { theme, toggleTheme } = useTheme();

  async function handleLogout() {
    await platformLogout();
    navigate("/platform/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Clausio</p>
                <Badge variant="secondary" className="gap-1">
                  <ShieldAlert className="size-3" />
                  Platform
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Organization Management
              </p>
            </div>
          </div>

          <nav className="order-last flex w-full items-center gap-2 overflow-x-auto lg:order-none lg:w-auto lg:overflow-visible">
            <Button
              variant={
                location.pathname === "/platform/organizations"
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              className="min-w-max flex-1 gap-2 lg:flex-none"
              onClick={() => navigate("/platform/organizations")}
            >
              <Building2 className="size-4" />
              Organizations
            </Button>

            <Button
              variant={
                location.pathname === "/platform/access-requests"
                  ? "secondary"
                  : "ghost"
              }
              size="sm"
              className="min-w-max flex-1 gap-2 lg:flex-none"
              onClick={() => navigate("/platform/access-requests")}
            >
              <FileText className="size-4" />
              Access Requests
            </Button>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            {platformUser && (
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-medium">{platformUser.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {roleLabel(platformUser.role)}
                </p>
              </div>
            )}

            {platformUser && (
              <div className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-medium">
                {initials(platformUser.fullName)}
              </div>
            )}

            <Button
              variant="outline"
              size="icon"
              className="size-9"
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

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
