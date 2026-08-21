import { useMemo, useState } from "react";
import { Download, Plus, Search, ShieldCheck, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  statusLabels,
  type TeamMember,
  type UserAccountStatus,
} from "@/lib/users";
import {
  isAdminRole,
  roleLabels,
  type BackendUserRole,
  getAssignableRolesForActor,
} from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateInvitation,
  useInvitationHistory,
  useResendInvitation,
  useRevokeInvitation,
  useTeamMembers,
  useUpdateUserRole,
  useUpdateUserStatus,
} from "@/hooks/useUserManagement";

import {
  ChangeRoleSheet,
  InviteUserSheet,
  InvitationHistory,
  RevokeInvitationDialog,
  UserDetailSheet,
  UserStats,
  UserTable,
  type InviteUserPayload,
} from "@/components/users";

type RoleFilter = "all" | BackendUserRole;
type StatusFilter = "all" | UserAccountStatus;
type AccessChangeTarget = {
  user: TeamMember;
  action: "disable" | "reactivate";
};

const roleFilters: RoleFilter[] = ["all", "OWNER", "ADMIN", "INTERNAL"];
const statusFilters: StatusFilter[] = ["all", "active", "disabled", "pending"];

export function UserManagement() {
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<TeamMember | null>(null);
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<TeamMember | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [accessChangeTarget, setAccessChangeTarget] =
    useState<AccessChangeTarget | null>(null);
  // Invitation id -> accept-invitation URL, populated only from create/resend
  // mutation responses (the raw token is never persisted, so this is the one
  // and only chance to grab a copyable link — same constraint the witness-
  // link "Copy Link" feature already lives with). Session-only by design:
  // reloading the page loses it, matching the witness panel's own behavior.
  const [copyableLinks, setCopyableLinks] = useState<Record<string, string>>(
    {},
  );

  const { members, isLoading, isError } = useTeamMembers();
  const { invitations: expiredInvitations } = useInvitationHistory();
  const createInvitation = useCreateInvitation();
  const resendInvitationMutation = useResendInvitation();
  const revokeInvitationMutation = useRevokeInvitation();
  const updateUserStatus = useUpdateUserStatus();
  const updateUserRole = useUpdateUserRole();

  // Backend authorization is what actually protects these actions (see
  // PUT /users/:id/role, /status, POST /invitations) — this only controls
  // what the UI offers, matching a read-only INTERNAL account's real access.
  const isCurrentUserAdmin = isAdminRole(currentUser?.role);

  const assignableRoleOptions = useMemo(
    () => getAssignableRolesForActor(currentUser?.role),
    [currentUser?.role],
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return members.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        (user.name?.toLowerCase().includes(normalizedQuery) ?? false) ||
        user.email.toLowerCase().includes(normalizedQuery);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, members]);

  function handleSelectUser(user: TeamMember) {
    setSelectedUser(user);
    setDetailOpen(true);
  }

  function handleInviteUser(payload: InviteUserPayload) {
    if (
      !isCurrentUserAdmin ||
      (payload.role === "ADMIN" && currentUser?.role !== "OWNER")
    ) {
      return;
    }

    createInvitation.mutate(
      {
        email: payload.email,
        fullName: payload.name,
        role: payload.role,
      },
      { onSuccess: rememberCopyableLink },
    );
  }

  // Shared by every call site that can return a fresh accept-invitation link
  // (create, and both resend entry points below) — resend rotates the token,
  // so this always overwrites any previously stored link for that id, since
  // the old one just stopped working.
  function rememberCopyableLink(invitation: {
    id: string;
    acceptInvitationUrl: string | null;
  }) {
    if (!invitation.acceptInvitationUrl) return;
    setCopyableLinks((prev) => ({
      ...prev,
      [invitation.id]: invitation.acceptInvitationUrl!,
    }));
  }

  function handleResendInvite(user: TeamMember) {
    if (!canManageUserAccess(user) || user.source !== "invitation") {
      return;
    }
    resendInvitationMutation.mutate(user.id, {
      onSuccess: rememberCopyableLink,
    });
  }

  function handleResendExpiredInvite(invitationId: string) {
    if (!isCurrentUserAdmin) {
      return;
    }
    // Resend always sets status back to PENDING (whatever it started as),
    // so this row moves out of invitation history and into the main roster
    // on the next refetch — that's where its Copy Link ends up rendering,
    // not here.
    resendInvitationMutation.mutate(invitationId, {
      onSuccess: rememberCopyableLink,
    });
  }

  function handleOpenRevokeInvite(user: TeamMember) {
    if (!canManageUserAccess(user) || user.source !== "invitation") {
      return;
    }
    setRevokeTarget(user);
    setRevokeOpen(true);
  }

  function handleConfirmRevokeInvite(user: TeamMember) {
    revokeInvitationMutation.mutate(user.id);
  }

  function handleDisableUser(user: TeamMember) {
    if (!canManageUserAccess(user) || user.source !== "user") {
      return;
    }

    setAccessChangeTarget({ user, action: "disable" });
  }

  function handleReactivateUser(user: TeamMember) {
    if (!canManageUserAccess(user) || user.source !== "user") {
      return;
    }

    setAccessChangeTarget({ user, action: "reactivate" });
  }

  function handleConfirmAccessChange() {
    if (!accessChangeTarget) return;

    const { user, action } = accessChangeTarget;

    if (!canManageUserAccess(user) || user.source !== "user") {
      return;
    }

    updateUserStatus.mutate({
      userId: user.id,
      status: action === "disable" ? "SUSPENDED" : "ACTIVE",
    });

    setAccessChangeTarget(null);
  }

  function isCurrentUser(user: TeamMember) {
    return user.id === currentUser?.id || user.email === currentUser?.email;
  }

  function canChangeUserRole(user: TeamMember) {
    return (
      currentUser?.role === "OWNER" &&
      user.source === "user" &&
      user.role !== "OWNER" &&
      !isCurrentUser(user)
    );
  }

  function canManageUserAccess(user: TeamMember) {
    return isCurrentUserAdmin && user.role !== "OWNER" && !isCurrentUser(user);
  }

  function handleOpenRoleChange(user: TeamMember) {
    if (!canChangeUserRole(user)) {
      return;
    }

    setRoleChangeUser(user);
    setRoleChangeOpen(true);
  }

  function handleSaveRole(
    user: TeamMember,
    role: Extract<BackendUserRole, "ADMIN" | "INTERNAL">,
  ) {
    if (
      !canChangeUserRole(user) ||
      (role === "ADMIN" && currentUser?.role !== "OWNER")
    ) {
      return;
    }

    updateUserRole.mutate({ userId: user.id, role });
    setRoleChangeOpen(false);
  }

  function sanitizeCsvCell(value: string): string {
    // Prefix values that a spreadsheet app would interpret as a formula
    // (=, +, -, @) with a single quote so they're treated as plain text.
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
  }

  function handleExportUsers() {
    const headers = [
      "Name",
      "Email",
      "Role",
      "Status",
      "Created",
      "Last Active",
    ];

    const rows = filteredUsers.map((user) => [
      user.name ?? "(pending)",
      user.email,
      roleLabels[user.role],
      statusLabels[user.status],
      user.createdAt,
      user.lastActiveAt ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => sanitizeCsvCell(String(cell)))
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "user-management.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  const accessChangeUserName =
    accessChangeTarget?.user.name ??
    accessChangeTarget?.user.email ??
    "this user";
  const isDisablingAccess = accessChangeTarget?.action === "disable";

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UsersRound className="size-5" aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage team members, role-based access, and pending invitations.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleExportUsers}
          >
            <Download className="size-4" aria-hidden="true" />
            Export
          </Button>

          {isCurrentUserAdmin && (
            <Button
              type="button"
              className="gap-2"
              onClick={() => setInviteOpen(true)}
            >
              <Plus className="size-4" aria-hidden="true" />
              Invite user
            </Button>
          )}
        </div>
      </div>

      {!isCurrentUserAdmin && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </div>

          <div>
            <p className="text-sm font-medium">Read-only access</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can review team members and permissions, but only
              administrators can invite users, resend invitations, disable
              access, or change roles.
            </p>
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load team members. Try refreshing the page.
        </div>
      )}

      <UserStats users={members} />

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            placeholder="Search by name or email"
            aria-label="Search users"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as RoleFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Filter users by role"
            >
              <SelectValue placeholder="All roles">
                {(val) =>
                  val === "all"
                    ? "All roles"
                    : roleLabels[val as BackendUserRole]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roleFilters.map((role) => (
                <SelectItem key={role} value={role}>
                  {role === "all" ? "All roles" : roleLabels[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Filter users by status"
            >
              <SelectValue placeholder="All statuses">
                {(val) =>
                  val === "all"
                    ? "All statuses"
                    : statusLabels[val as UserAccountStatus]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all" ? "All statuses" : statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (
        <UserTable
          users={filteredUsers}
          onSelectUser={handleSelectUser}
          onDisableUser={handleDisableUser}
          onReactivateUser={handleReactivateUser}
          onResendInvite={handleResendInvite}
          onRevokeInvite={handleOpenRevokeInvite}
          onChangeRole={handleOpenRoleChange}
          canChangeRole={canChangeUserRole}
          canManageAccess={canManageUserAccess}
          copyableLinks={copyableLinks}
        />
      )}

      {isCurrentUserAdmin && (
        <InvitationHistory
          invitations={expiredInvitations}
          onResendInvite={handleResendExpiredInvite}
        />
      )}

      <InviteUserSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInviteUser}
        availableRoles={assignableRoleOptions}
      />

      <UserDetailSheet
        user={selectedUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <ChangeRoleSheet
        user={roleChangeUser}
        open={roleChangeOpen}
        onOpenChange={setRoleChangeOpen}
        onSave={handleSaveRole}
        availableRoles={assignableRoleOptions}
      />

      <RevokeInvitationDialog
        invitation={revokeTarget}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onConfirm={handleConfirmRevokeInvite}
      />
      <AlertDialog
        open={!!accessChangeTarget}
        onOpenChange={(open) => {
          if (!open && !updateUserStatus.isPending) {
            setAccessChangeTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDisablingAccess
                ? "Disable user access?"
                : "Reactivate user access?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {accessChangeTarget
                ? isDisablingAccess
                  ? `${accessChangeUserName} will no longer be able to sign in or access organization resources. Existing audit history will be preserved.`
                  : `${accessChangeUserName} will regain access to the organization according to their current role and permissions.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateUserStatus.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant={isDisablingAccess ? "destructive" : "default"}
              disabled={updateUserStatus.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleConfirmAccessChange();
              }}
            >
              {isDisablingAccess ? "Disable access" : "Reactivate user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
