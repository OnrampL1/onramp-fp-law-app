import { useEffect, useMemo, useState } from "react";
import { UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TeamMember } from "@/lib/users";
import {
  assignableRoles,
  getPermissionKeysForRole,
  roleLabels,
  type BackendUserRole,
  AssignableUserRole,
} from "@/lib/permissions";

import { PermissionBadge, UserRoleBadge } from "./UserBadges";

type ChangeRoleSheetProps = {
  user: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: TeamMember, role: AssignableUserRole) => void;
  availableRoles?: readonly AssignableUserRole[];
};

export function ChangeRoleSheet({
  user,
  open,
  onOpenChange,
  onSave,
  availableRoles = assignableRoles,
}: ChangeRoleSheetProps) {
  const [selectedRole, setSelectedRole] =
    useState<AssignableUserRole>("INTERNAL");

  useEffect(() => {
    if (user && user.role !== "OWNER") {
      const nextRole = user.role === "ADMIN" ? "ADMIN" : "INTERNAL";
      setSelectedRole(
        availableRoles.includes(nextRole)
          ? nextRole
          : (availableRoles[0] ?? "INTERNAL"),
      );
    }
  }, [availableRoles, user]);

  const permissions = useMemo(
    () => getPermissionKeysForRole(selectedRole),
    [selectedRole],
  );

  const isRoleUnchanged = user?.role === selectedRole;

  if (!user) {
    return null;
  }

  function handleSave() {
    if (!user) {
      return;
    }

    onSave(user, selectedRole);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UserCog className="size-5" aria-hidden="true" />
          </div>
          <SheetTitle>Change role</SheetTitle>
          <SheetDescription>
            Update access for {user.name}. Permissions will follow the selected
            role.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Current role</p>
            <UserRoleBadge role={user.role} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">New role</p>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setSelectedRole(value as AssignableUserRole)
              }
            >
              <SelectTrigger className="w-full" aria-label="New user role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">Permission preview</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {roleLabels[selectedRole]} access includes:
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {permissions.map((permission) => (
                <PermissionBadge key={permission} permission={permission} />
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t">
          <Button type="button" onClick={handleSave} disabled={isRoleUnchanged}>
            Save role
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
