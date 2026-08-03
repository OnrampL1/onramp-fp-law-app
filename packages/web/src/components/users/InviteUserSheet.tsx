import { useMemo, useState, type FormEvent } from "react";
import { MailPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  assignableRoles,
  getPermissionKeysForRole,
  roleLabels,
  type BackendUserRole,
  type AssignableUserRole,
} from "@/lib/permissions";

import { PermissionBadge } from "./UserBadges";

export type InviteUserPayload = {
  email: string;
  name: string;
  role: AssignableUserRole;
};

type InviteUserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite?: (payload: InviteUserPayload) => void;
  availableRoles?: readonly AssignableUserRole[];
};

export function InviteUserSheet({
  open,
  onOpenChange,
  onInvite,
  availableRoles = assignableRoles,
}: InviteUserSheetProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AssignableUserRole>("INTERNAL");

  const permissions = useMemo(() => getPermissionKeysForRole(role), [role]);

  function resetForm() {
    setEmail("");
    setName("");
    setRole("INTERNAL");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onInvite?.({ email, name, role });

    resetForm();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MailPlus className="size-5" aria-hidden="true" />
          </div>
          <SheetTitle>Invite user</SheetTitle>
          <SheetDescription>
            Send an invitation email. The account is created once they accept
            and set a password.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Cooper"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jane@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as AssignableUserRole)}
              >
                <SelectTrigger className="w-full" aria-label="Invite role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">Permission preview</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {roleLabels[role]} access includes:
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {permissions.map((permission) => (
                  <PermissionBadge key={permission} permission={permission} />
                ))}
              </div>
            </div>
          </div>

          <SheetFooter className="border-t">
            <Button type="submit" className="gap-2">
              <MailPlus className="size-4" aria-hidden="true" />
              Send invite
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
