import { useMemo, useState } from "react";
import { Download, Plus, Search, UsersRound } from "lucide-react";

import { UserStats } from "@/components/users/UserStats";
import { UserTable } from "@/components/users/UserTable";
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
  getPermissionKeysForRole,
  roleLabels,
  statusLabels,
  teamMembers,
  type TeamMember,
  type UserAccessRole,
  type UserAccountStatus,
} from "@/lib/users";
import { useAuth } from "@/hooks/useAuth";

import {
  InviteUserSheet,
  type InviteUserPayload,
} from "@/components/users/InviteUserSheet";
import { UserDetailSheet } from "@/components/users/UserDetailSheet";
import { ChangeRoleSheet } from "@/components/users/ChangeRoleSheet";

type RoleFilter = "all" | UserAccessRole;
type StatusFilter = "all" | UserAccountStatus;

const roleFilters: RoleFilter[] = ["all", "admin", "user", "viewer"];
const statusFilters: StatusFilter[] = ["all", "active", "pending", "disabled"];

export function UserManagement() {
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [users, setUsers] = useState<TeamMember[]>(teamMembers);
  const [roleChangeUser, setRoleChangeUser] = useState<TeamMember | null>(null);
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.team.toLowerCase().includes(normalizedQuery);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  function handleSelectUser(user: TeamMember) {
    setSelectedUser(user);
    setDetailOpen(true);
  }

  function handleInviteUser(payload: InviteUserPayload) {
    const now = new Date().toISOString();

    setUsers((currentUsers) => [
      {
        id: crypto.randomUUID(),
        name: payload.name,
        email: payload.email,
        role: payload.role,
        status: "pending",
        title: payload.title || "Invited user",
        team: payload.team || "Unassigned",
        permissionKeys: getPermissionKeysForRole(payload.role),
        createdAt: now,
        lastActiveAt: null,
        invitedAt: now,
      },
      ...currentUsers,
    ]);
  }

  function handleResendInvite(user: TeamMember) {
    const now = new Date().toISOString();

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id
          ? { ...currentUser, invitedAt: now }
          : currentUser,
      ),
    );

    setSelectedUser((currentUser) =>
      currentUser?.id === user.id
        ? { ...currentUser, invitedAt: now }
        : currentUser,
    );
  }

  function handleDisableUser(user: TeamMember) {
    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id
          ? { ...currentUser, status: "disabled" }
          : currentUser,
      ),
    );

    setSelectedUser((currentUser) =>
      currentUser?.id === user.id
        ? { ...currentUser, status: "disabled" }
        : currentUser,
    );
  }

  function canChangeUserRole(user: TeamMember) {
    return currentUser?.role === "admin" && user.role !== "admin";
  }

  function handleOpenRoleChange(user: TeamMember) {
    if (!canChangeUserRole(user)) {
      return;
    }

    setRoleChangeUser(user);
    setRoleChangeOpen(true);
  }

  function handleSaveRole(user: TeamMember, role: UserAccessRole) {
    if (!canChangeUserRole(user)) {
      return;
    }

    const permissionKeys = getPermissionKeysForRole(role);

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id
          ? { ...currentUser, role, permissionKeys }
          : currentUser,
      ),
    );

    setSelectedUser((currentUser) =>
      currentUser?.id === user.id
        ? { ...currentUser, role, permissionKeys }
        : currentUser,
    );

    setRoleChangeUser((currentUser) =>
      currentUser?.id === user.id
        ? { ...currentUser, role, permissionKeys }
        : currentUser,
    );
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
              Manage team members, role-based access, viewer permissions, and
              pending invitations.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="outline" className="gap-2">
            <Download className="size-4" aria-hidden="true" />
            Export
          </Button>

          <Button
            type="button"
            className="gap-2"
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            Invite user
          </Button>
        </div>
      </div>

      <UserStats users={users} />

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
            placeholder="Search by name, email, or team"
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

      <UserTable
        users={filteredUsers}
        onSelectUser={handleSelectUser}
        onDisableUser={handleDisableUser}
        onResendInvite={handleResendInvite}
        onChangeRole={handleOpenRoleChange}
        canChangeRole={canChangeUserRole}
      />

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
