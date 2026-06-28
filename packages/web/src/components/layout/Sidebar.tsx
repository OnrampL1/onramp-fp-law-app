import { Link, useLocation } from "react-router-dom";
import {
  ChevronsUpDown,
  FileText,
  LayoutDashboard,
  PenLine,
  Scale,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
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

const workspaceNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Contracts", href: "/contracts", icon: FileText },
  { title: "AI Analysis", href: "/ai-analysis", icon: Sparkles },
  { title: "Clause Investigator", href: "/investigator", icon: Search },
  { title: "Contract Upload", href: "/upload", icon: Upload },
];

const adminNav = [
  { title: "User Management", href: "/users", icon: Users },
  { title: "Witness Workflow", href: "/witness", icon: PenLine },
  { title: "Audit Logging", href: "/audit", icon: ScrollText },
  { title: "Settings", href: "/settings", icon: Settings },
];

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
  const userName = user?.name ?? "Alex Whitfield";

  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-open:bg-sidebar-accent"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scale className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Clausio</span>
                <span className="truncate text-xs text-muted-foreground">
                  Legal Intelligence
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

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
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
                  Administrator
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Signed in as Administrator">
              <ShieldCheck />
              <span>Signed in as Administrator</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </SidebarRoot>
  );
}
