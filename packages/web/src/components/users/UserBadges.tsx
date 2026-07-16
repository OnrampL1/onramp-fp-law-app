import { ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabels, type UserAccountStatus, type PermissionKey } from "@/lib/users";
import { permissionLabels, roleLabels, type BackendUserRole } from "@/lib/permissions";

const roleStyles: Record<BackendUserRole, string> = {
  OWNER: "border-primary/30 bg-primary/10 text-primary",
  ADMIN:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  INTERNAL:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300",
};

const roleIcons = {
  OWNER: ShieldCheck,
  ADMIN: ShieldCheck,
  INTERNAL: UserRound,
} satisfies Record<BackendUserRole, typeof ShieldCheck>;

const statusStyles: Record<UserAccountStatus, string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  disabled: "border-border bg-muted text-muted-foreground",
};

const statusDotStyles: Record<UserAccountStatus, string> = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  disabled: "bg-muted-foreground",
};

export function UserRoleBadge({ role }: { role: BackendUserRole }) {
  const Icon = roleIcons[role];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full font-medium", roleStyles[role])}
    >
      <Icon className="size-3" aria-hidden="true" />
      {roleLabels[role]}
    </Badge>
  );
}

export function UserStatusBadge({ status }: { status: UserAccountStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full font-medium", statusStyles[status])}
    >
      <span
        className={cn("size-1.5 rounded-full", statusDotStyles[status])}
        aria-hidden="true"
      />
      {statusLabels[status]}
    </Badge>
  );
}

export function PermissionBadge({ permission }: { permission: PermissionKey }) {
  return (
    <Badge variant="outline" className="rounded-full font-medium">
      {permissionLabels[permission]}
    </Badge>
  );
}
