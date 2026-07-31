import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPermissionKeysForRole, type BackendUserRole } from "@/lib/permissions";
import type { TeamMember } from "@/lib/users";
import {
  listUsers,
  updateUserRole,
  updateUserStatus,
  type ApiUser,
} from "@/services/users.service";
import {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  type ApiInvitation,
  type CreateInvitationPayload,
} from "@/services/invitations.service";

const usersKey = ["users"] as const;
const invitationsKey = ["invitations"] as const;

function toUserRow(user: ApiUser): TeamMember {
  return {
    source: "user",
    id: user.id,
    name: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status === "SUSPENDED" ? "disabled" : "active",
    permissionKeys: getPermissionKeysForRole(user.role),
    createdAt: user.createdAt,
    lastActiveAt: user.lastLoginAt,
  };
}

function toInvitationRow(invitation: ApiInvitation): TeamMember {
  return {
    source: "invitation",
    id: invitation.id,
    name: null,
    email: invitation.email,
    role: invitation.role,
    status: "pending",
    permissionKeys: getPermissionKeysForRole(invitation.role),
    createdAt: invitation.createdAt,
    lastActiveAt: null,
    invitedAt: invitation.createdAt,
  };
}

export function useTeamMembers() {
  const usersQuery = useQuery({ queryKey: usersKey, queryFn: listUsers });
  const invitationsQuery = useQuery({
    queryKey: invitationsKey,
    queryFn: listInvitations,
  });

  const members = useMemo<TeamMember[]>(() => {
    const userRows = (usersQuery.data ?? [])
      .filter((user) => user.status === "ACTIVE" || user.status === "SUSPENDED")
      .map(toUserRow);
    // EXPIRED invitations are surfaced separately, in invitation history
    // (see useInvitationHistory) — they don't belong in the active roster.
    const invitationRows = (invitationsQuery.data ?? [])
      .filter((invitation) => invitation.status === "PENDING")
      .map(toInvitationRow);
    return [...userRows, ...invitationRows];
  }, [usersQuery.data, invitationsQuery.data]);

  return {
    members,
    isLoading: usersQuery.isLoading || invitationsQuery.isLoading,
    isError: usersQuery.isError || invitationsQuery.isError,
    error: usersQuery.error ?? invitationsQuery.error,
  };
}

// Expired invitations, kept out of the main roster (useTeamMembers) so they
// never read as active team members. Reuses the same query cache entry as
// useTeamMembers (identical queryKey/queryFn), so this doesn't cause an
// extra network request.
export function useInvitationHistory() {
  const invitationsQuery = useQuery({
    queryKey: invitationsKey,
    queryFn: listInvitations,
  });

  const invitations = useMemo(
    () => (invitationsQuery.data ?? []).filter((i) => i.status === "EXPIRED"),
    [invitationsQuery.data],
  );

  return {
    invitations,
    isLoading: invitationsQuery.isLoading,
    isError: invitationsQuery.isError,
  };
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: Extract<BackendUserRole, "ADMIN" | "INTERNAL">;
    }) => updateUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: "ACTIVE" | "SUSPENDED";
    }) => updateUserStatus(userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInvitationPayload) => createInvitation(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationsKey }),
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => resendInvitation(invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationsKey }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationsKey }),
  });
}
