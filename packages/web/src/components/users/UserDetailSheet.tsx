import { CalendarDays, Mail } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getInitials, statusLabels, type TeamMember } from "@/lib/users";
import { roleLabels } from "@/lib/permissions";

import { PermissionBadge, UserRoleBadge, UserStatusBadge } from "./UserBadges";

type UserDetailSheetProps = {
  user: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function UserDetailSheet({
  user,
  open,
  onOpenChange,
}: UserDetailSheetProps) {
  if (!user) {
    return null;
  }

  const displayName = user.name ?? "Invitation pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                {getInitials(user.name ?? user.email)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <SheetTitle className="truncate">{displayName}</SheetTitle>
              <SheetDescription className="truncate">
                {user.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto px-4 pb-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Access summary</h3>

            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Role</span>
                <UserRoleBadge role={user.role} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Status</span>
                <UserStatusBadge status={user.status} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Permissions</h3>

            <div className="flex flex-wrap gap-1.5">
              {user.permissionKeys.map((permission) => (
                <PermissionBadge key={permission} permission={permission} />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {roleLabels[user.role]} access currently grants{" "}
              {user.permissionKeys.length} permission
              {user.permissionKeys.length === 1 ? "" : "s"}.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Profile</h3>

            <div className="space-y-3 rounded-lg border p-3 text-sm">
              <div className="flex items-start gap-2">
                <Mail
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-medium">Email</p>
                  <p className="truncate text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CalendarDays
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Account dates</p>
                  <p className="text-muted-foreground">
                    Created {formatDate(user.createdAt)}
                  </p>
                  <p className="text-muted-foreground">
                    Last active {formatDate(user.lastActiveAt)}
                  </p>
                  {user.source === "invitation" && (
                    <p className="text-muted-foreground">
                      Invited {formatDate(user.invitedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">
              Current status: {statusLabels[user.status]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Role and access changes are available from the user actions
              menu and are enforced by the backend, not just this screen.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
