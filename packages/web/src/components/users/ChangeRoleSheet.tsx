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
import {
  getPermissionKeysForRole,
  roleLabels,
  type TeamMember,
  type UserAccessRole,
} from "@/lib/users";

import { PermissionBadge, UserRoleBadge } from "./UserBadges";

type ChangeRoleSheetProps = {
  user: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: TeamMember, role: UserAccessRole) => void;
};

export function ChangeRoleSheet({
  user,
  open,
  onOpenChange,
  onSave,
}: ChangeRoleSheetProps) {
  const [selectedRole, setSelectedRole] = useState<UserAccessRole>("viewer");

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);

  const permissions = useMemo(
    () => getPermissionKeysForRole(selectedRole),
    [selectedRole],
  );

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
                setSelectedRole(value as UserAccessRole)
              }
            >
              <SelectTrigger className="w-full" aria-label="New user role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
          <Button type="button" onClick={handleSave}>
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
