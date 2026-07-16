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
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { statusLabels, type TeamMember, type UserAccountStatus } from "@/lib/users";
import { isAdminRole, roleLabels, type BackendUserRole } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateInvitation,
  useResendInvitation,
  useTeamMembers,
  useUpdateUserRole,
  useUpdateUserStatus,
} from "@/hooks/useUserManagement";

import {
  ChangeRoleSheet,
  InviteUserSheet,
  UserDetailSheet,
  UserStats,
  UserTable,
  type InviteUserPayload,
} from "@/components/users";

type RoleFilter = "all" | BackendUserRole;
type StatusFilter = "all" | UserAccountStatus;

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

  const { members, isLoading, isError } = useTeamMembers();
  const createInvitation = useCreateInvitation();
  const resendInvitationMutation = useResendInvitation();
  const updateUserStatus = useUpdateUserStatus();
  const updateUserRole = useUpdateUserRole();

  // Backend authorization is what actually protects these actions (see
  // PUT /users/:id/role, /status, POST /invitations) — this only controls
  // what the UI offers, matching a read-only INTERNAL account's real access.
  const isCurrentUserAdmin = isAdminRole(currentUser?.role);

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
    if (!isCurrentUserAdmin) {
      return;
    }

    createInvitation.mutate({
      email: payload.email,
      fullName: payload.name,
      role: payload.role,
    });
  }

  function handleResendInvite(user: TeamMember) {
    if (!canManageUserAccess(user) || user.source !== "invitation") {
      return;
    }
    resendInvitationMutation.mutate(user.id);
  }

  function handleDisableUser(user: TeamMember) {
    if (!canManageUserAccess(user) || user.source !== "user") {
      return;
    }
    updateUserStatus.mutate({ userId: user.id, status: "SUSPENDED" });
  }

  function handleReactivateUser(user: TeamMember) {
    if (!canManageUserAccess(user) || user.source !== "user") {
      return;
    }
    updateUserStatus.mutate({ userId: user.id, status: "ACTIVE" });
  }

  function isCurrentUser(user: TeamMember) {
    return user.id === currentUser?.id || user.email === currentUser?.email;
  }

  function canChangeUserRole(user: TeamMember) {
    return (
      isCurrentUserAdmin &&
      user.source === "user" &&
      user.role !== "OWNER" &&
      !isCurrentUser(user)
    );
  }

  function canManageUserAccess(user: TeamMember) {
    return (
      isCurrentUserAdmin && user.role !== "OWNER" && !isCurrentUser(user)
    );
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
    if (!canChangeUserRole(user)) {
      return;
    }

    updateUserRole.mutate({ userId: user.id, role });
    setRoleChangeOpen(false);
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
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
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
              Manage team members, role-based access, and pending
              invitations.
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
              <SelectValue />
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
              <SelectValue />
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
          onChangeRole={handleOpenRoleChange}
          canChangeRole={canChangeUserRole}
          canManageAccess={canManageUserAccess}
        />
      )}

      <InviteUserSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInviteUser}
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
      />
    </div>
  );
}
