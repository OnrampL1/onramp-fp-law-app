import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronsUpDown,
  FileText,
  LayoutDashboard,
  PenLine,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  BrainCircuit,
} from "lucide-react";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationSettings } from "@/hooks/useSettings";
import { isAdminRole, roleLabels, type BackendUserRole } from "@/lib/permissions";

const workspaceNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Contracts", href: "/contracts", icon: FileText },
  { title: "Contract Upload", href: "/upload", icon: Upload },
  {
    title: "Organization Brain",
    href: "/organization-brain",
    icon: BrainCircuit,
  },
  { title: "Legal Assistant", href: "/legal-assistant", icon: Scale },
];

// requiresAdmin marks items the backend actually 403s for non-Owner/Admin
// roles (Domain & Business Rules, Section 10, for Audit Logging) — keep this
// in sync with what each route actually enforces, not just cosmetic hiding.
const adminNav = [
  { title: "User Management", href: "/users", icon: Users },
  {
    title: "Witness Workflow",
    href: "/witness",
    icon: PenLine,
    requiresAdmin: true,
  },
  {
    title: "Audit Logging",
    href: "/audit",
    icon: ScrollText,
    requiresAdmin: true,
  },
  { title: "Settings", href: "/settings", icon: Settings },
];

function getRoleLabel(role?: string) {
  if (role && role in roleLabels) {
    return roleLabels[role as BackendUserRole];
  }
  return role ?? "Team member";
}

function getInitials(name?: string) {
  if (!name) {
    return "AW";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { data: organizationSettings } = useOrganizationSettings();
  const [logoFailedToLoad, setLogoFailedToLoad] = useState(false);
  const userName = user?.fullName ?? "Alex Whitfield";
  const userRoleLabel = getRoleLabel(user?.role);
  const visibleAdminNav = adminNav.filter(
    (item) => !item.requiresAdmin || isAdminRole(user?.role),
  );

  const organizationName = organizationSettings?.organization.name ?? "Clausio";
  const logoUrl = organizationSettings?.settings.logoUrl;
  const showLogo = Boolean(logoUrl) && !logoFailedToLoad;

  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-open:bg-sidebar-accent"
            >
              <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
                {showLogo ? (
                  <img
                    src={logoUrl!}
                    alt=""
                    className="size-full object-cover"
                    onError={() => setLogoFailedToLoad(true)}
                  />
                ) : (
                  <Scale className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {organizationName}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className="my-[2px]"
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleAdminNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={
                        <Link to={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      }
                      isActive={pathname === item.href}
                      tooltip={item.title}
                      className="my-[2px]"
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={userName}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-medium p-2">
                {getInitials(userName)}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {userRoleLabel}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={`Signed in as ${userRoleLabel}`}>
              <ShieldCheck />
              <span>Signed in as {userRoleLabel}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-center gap-1 px-2 pt-1 pb-0.5 text-[11px] text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
          <Scale className="size-3" />
          <span>Powered by Clausio</span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </SidebarRoot>
  );
}
