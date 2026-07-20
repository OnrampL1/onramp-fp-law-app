import type { UserRole } from "@prisma/client";

// OWNER and ADMIN both get full User Management access; INTERNAL is read-only.
// OWNER is intentionally excluded from role-assignment — organization
// ownership is transferred through its own dedicated flow (see
// Organization.ownerUserId / OWNERSHIP_TRANSFERRED), not a generic role change.
export const ADMIN_ROLES: readonly UserRole[] = ["OWNER", "ADMIN"];
export const ASSIGNABLE_ROLES: readonly UserRole[] = ["ADMIN", "INTERNAL"];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isAssignableRole(role: UserRole): boolean {
  return ASSIGNABLE_ROLES.includes(role);
}
