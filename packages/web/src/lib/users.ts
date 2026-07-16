import type { BackendUserRole, PermissionKey } from "./permissions";

export type { PermissionKey };

// Real accounts only have "active"/"disabled" (mapped from the backend's
// ACTIVE/SUSPENDED). "pending" is not a User status — it represents a
// pending Invitation, which is a separate backend entity (see TeamMember).
export type UserAccountStatus = "active" | "disabled" | "pending";

export const statusLabels: Record<UserAccountStatus, string> = {
  active: "Active",
  disabled: "Disabled",
  pending: "Pending invite",
};

// A single row in the User Management table, merged from two backend
// sources: real Users (ACTIVE/SUSPENDED) and pending Invitations (not yet
// accepted, so there's no User row for them yet). `source` tags which one
// a given row came from so the table can gate actions correctly — e.g. only
// "user" rows can have their role changed or be disabled; only "invitation"
// rows can be resent.
export type TeamMember =
  | {
      source: "user";
      id: string;
      name: string;
      email: string;
      role: BackendUserRole;
      status: Extract<UserAccountStatus, "active" | "disabled">;
      permissionKeys: PermissionKey[];
      createdAt: string;
      lastActiveAt: string | null;
    }
  | {
      source: "invitation";
      id: string;
      name: null;
      email: string;
      role: BackendUserRole;
      status: Extract<UserAccountStatus, "pending">;
      permissionKeys: PermissionKey[];
      createdAt: string;
      lastActiveAt: null;
      invitedAt: string;
    };

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
