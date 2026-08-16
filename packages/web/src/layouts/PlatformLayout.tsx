import { Outlet, useNavigate } from "react-router-dom";
import { Building2, LogOut, Scale, ShieldAlert } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { usePlatformAuth } from "../hooks/usePlatformAuth";

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
  const { platformUser, platformLogout } = usePlatformAuth();

  async function handleLogout() {
    await platformLogout();
    navigate("/platform/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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

          <nav className="hidden items-center gap-2 md:flex">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/platform/organizations")}
            >
              <Building2 className="size-4" />
              Organizations
            </Button>
          </nav>

          <div className="flex items-center gap-3">
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
