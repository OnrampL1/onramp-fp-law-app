// Mirrors the backend Prisma `UserRole` enum (packages/shared/prisma/schema.prisma).
// Duplicated here rather than imported from @starter-kit/shared because that
// package pulls in Node-only dependencies (Prisma client, bcrypt, ioredis)
// that can't safely ship in the browser bundle. Keep this in sync if the
// backend role set changes.
export type BackendUserRole = "OWNER" | "ADMIN" | "INTERNAL";

// OWNER and ADMIN both get full User Management access; INTERNAL is
// read-only. OWNER is excluded from role assignment — organization
// ownership is transferred through its own dedicated flow, not a role
// change (see the backend's ASSIGNABLE_ROLES).
export function isAdminRole(role: BackendUserRole | string | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export const assignableRoles: readonly BackendUserRole[] = ["ADMIN", "INTERNAL"];

export const roleLabels: Record<BackendUserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  INTERNAL: "Team member",
};

export type PermissionKey =
  | "contracts.read"
  | "contracts.write"
  | "contracts.upload"
  | "users.manage"
  | "audit.read"
  | "settings.manage";

export const permissionLabels: Record<PermissionKey, string> = {
  "contracts.read": "View contracts",
  "contracts.write": "Edit contracts",
  "contracts.upload": "Upload contracts",
  "users.manage": "Manage users",
  "audit.read": "View audit log",
  "settings.manage": "Manage settings",
};

// Cosmetic "what does this role grant" preview — not a real ACL. There is no
// backend permission table; access is enforced purely by role.
const rolePermissionKeys: Record<BackendUserRole, PermissionKey[]> = {
  OWNER: [
    "contracts.read",
    "contracts.write",
    "contracts.upload",
    "users.manage",
    "audit.read",
    "settings.manage",
  ],
  ADMIN: [
    "contracts.read",
    "contracts.write",
    "contracts.upload",
    "users.manage",
    "audit.read",
    "settings.manage",
  ],
  INTERNAL: ["contracts.read", "contracts.write", "contracts.upload"],
};

export function getPermissionKeysForRole(role: BackendUserRole): PermissionKey[] {
  return rolePermissionKeys[role];
}
