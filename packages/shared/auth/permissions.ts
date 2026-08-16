import type { PlatformUserRole, UserRole } from "@prisma/client";

// OWNER and ADMIN both get full User Management access; INTERNAL is read-only.
// OWNER is intentionally excluded from role-assignment — organization
// ownership is transferred through its own dedicated flow (see
// Organization.ownerUserId / OWNERSHIP_TRANSFERRED), not a generic role change.
export const ADMIN_ROLES: readonly UserRole[] = ["OWNER", "ADMIN"];
export const OWNER_ROLES: readonly UserRole[] = ["OWNER"];
export const ASSIGNABLE_ROLES: readonly UserRole[] = ["ADMIN", "INTERNAL"];

export const PLATFORM_SUPER_ADMIN_ROLES: readonly PlatformUserRole[] = [
  "SUPER_ADMIN",
];

export const PLATFORM_SUPPORT_ROLES: readonly PlatformUserRole[] = [
  "SUPPORT_ENGINEER",
];

export const PLATFORM_USER_ROLES: readonly PlatformUserRole[] = [
  "SUPER_ADMIN",
  "SUPPORT_ENGINEER",
];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isOwnerRole(role: UserRole): boolean {
  return OWNER_ROLES.includes(role);
}

export function isAssignableRole(role: UserRole): boolean {
  return ASSIGNABLE_ROLES.includes(role);
}

export function isPlatformSuperAdminRole(role: PlatformUserRole): boolean {
  return PLATFORM_SUPER_ADMIN_ROLES.includes(role);
}

export function isPlatformSupportRole(role: PlatformUserRole): boolean {
  return PLATFORM_SUPPORT_ROLES.includes(role);
}
