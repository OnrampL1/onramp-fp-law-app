// Mirrors the backend Prisma `AuditAction`/`AuditActorType` enums
// (packages/shared/prisma/schema.prisma). Duplicated here for the same
// reason as BackendUserRole in lib/permissions.ts — the shared package
// pulls in Node-only dependencies that can't ship in the browser bundle.

export const AUDIT_ACTIONS = [
  "ORGANIZATION_CREATED",
  "OWNER_ASSIGNED",
  "ORGANIZATION_ACTIVATED",
  "ORGANIZATION_SUSPENDED",
  "ORGANIZATION_ARCHIVED",
  "ORGANIZATION_SETTINGS_UPDATED",
  "OWNERSHIP_TRANSFERRED",
  "OWNERSHIP_RECOVERED",
  "USER_INVITED",
  "INVITATION_ACCEPTED",
  "INVITATION_REVOKED",
  "USER_SUSPENDED",
  "USER_REACTIVATED",
  "USER_DEACTIVATED",
  "USER_ROLE_CHANGED",
  "CONTRACT_UPLOADED",
  "CONTRACT_TEXT_EXTRACTED",
  "CONTRACT_METADATA_UPDATED",
  "CONTRACT_BUSINESS_STATUS_CHANGED",
  "CONTRACT_PROCESSING_STATUS_CHANGED",
  "CONTRACT_SOFT_DELETED",
  "NOTE_ADDED",
  "NOTE_EDITED",
  "NOTE_DELETED",
  "WITNESS_INVITATION_CREATED",
  "WITNESS_ACCESSED",
  "WITNESS_INVITATION_REVOKED",
  "AI_ANALYSIS_REQUESTED",
  "AI_ANALYSIS_COMPLETED",
  "AI_ANALYSIS_FAILED",
  "ORGANIZATION_BRAIN_ITEM_CREATED",
  "ORGANIZATION_BRAIN_ITEM_DELETED",
  "PLATFORM_SUPPORT_ACCESS_GRANTED",
  "PLATFORM_SUPPORT_ACCESS_REVOKED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditActorType = "USER" | "PLATFORM_USER" | "SYSTEM";

// Domain grouping used for icon/badge styling and the action filter's
// optgroups — there's no "verb" (Create/Update/Delete) concept on the
// backend, so actions are grouped by the entity they act on instead.
export type AuditActionGroup =
  | "Organization"
  | "User"
  | "Contract"
  | "Note"
  | "Witness"
  | "AI"
  | "Platform";

export const AUDIT_ACTION_GROUP: Record<AuditAction, AuditActionGroup> = {
  ORGANIZATION_CREATED: "Organization",
  OWNER_ASSIGNED: "Organization",
  ORGANIZATION_ACTIVATED: "Organization",
  ORGANIZATION_SUSPENDED: "Organization",
  ORGANIZATION_ARCHIVED: "Organization",
  ORGANIZATION_SETTINGS_UPDATED: "Organization",
  OWNERSHIP_TRANSFERRED: "Organization",
  OWNERSHIP_RECOVERED: "Organization",

  USER_INVITED: "User",
  INVITATION_ACCEPTED: "User",
  INVITATION_REVOKED: "User",
  USER_SUSPENDED: "User",
  USER_REACTIVATED: "User",
  USER_DEACTIVATED: "User",
  USER_ROLE_CHANGED: "User",

  CONTRACT_UPLOADED: "Contract",
  CONTRACT_TEXT_EXTRACTED: "Contract",
  CONTRACT_METADATA_UPDATED: "Contract",
  CONTRACT_BUSINESS_STATUS_CHANGED: "Contract",
  CONTRACT_PROCESSING_STATUS_CHANGED: "Contract",
  CONTRACT_SOFT_DELETED: "Contract",

  NOTE_ADDED: "Note",
  NOTE_EDITED: "Note",
  NOTE_DELETED: "Note",

  WITNESS_INVITATION_CREATED: "Witness",
  WITNESS_ACCESSED: "Witness",
  WITNESS_INVITATION_REVOKED: "Witness",

  AI_ANALYSIS_REQUESTED: "AI",
  AI_ANALYSIS_COMPLETED: "AI",
  AI_ANALYSIS_FAILED: "AI",

  PLATFORM_SUPPORT_ACCESS_GRANTED: "Platform",
  PLATFORM_SUPPORT_ACCESS_REVOKED: "Platform",

  ORGANIZATION_BRAIN_ITEM_CREATED: "AI",
  ORGANIZATION_BRAIN_ITEM_DELETED: "AI",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  ORGANIZATION_CREATED: "Organization created",
  OWNER_ASSIGNED: "Owner assigned",
  ORGANIZATION_ACTIVATED: "Organization activated",
  ORGANIZATION_SUSPENDED: "Organization suspended",
  ORGANIZATION_ARCHIVED: "Organization archived",
  ORGANIZATION_SETTINGS_UPDATED: "Organization settings updated",
  OWNERSHIP_TRANSFERRED: "Ownership transferred",
  OWNERSHIP_RECOVERED: "Ownership recovered",

  USER_INVITED: "User invited",
  INVITATION_ACCEPTED: "Invitation accepted",
  INVITATION_REVOKED: "Invitation revoked",
  USER_SUSPENDED: "User suspended",
  USER_REACTIVATED: "User reactivated",
  USER_DEACTIVATED: "User deactivated",
  USER_ROLE_CHANGED: "User role changed",

  CONTRACT_UPLOADED: "Contract uploaded",
  CONTRACT_TEXT_EXTRACTED: "Contract text extracted",
  CONTRACT_METADATA_UPDATED: "Contract metadata updated",
  CONTRACT_BUSINESS_STATUS_CHANGED: "Contract status changed",
  CONTRACT_PROCESSING_STATUS_CHANGED: "Contract processing status changed",
  CONTRACT_SOFT_DELETED: "Contract deleted",

  NOTE_ADDED: "Note added",
  NOTE_EDITED: "Note edited",
  NOTE_DELETED: "Note deleted",

  WITNESS_INVITATION_CREATED: "Witness invitation created",
  WITNESS_ACCESSED: "Witness accessed",
  WITNESS_INVITATION_REVOKED: "Witness invitation revoked",

  AI_ANALYSIS_REQUESTED: "AI analysis requested",
  AI_ANALYSIS_COMPLETED: "AI analysis completed",
  AI_ANALYSIS_FAILED: "AI analysis failed",

  PLATFORM_SUPPORT_ACCESS_GRANTED: "Platform support access granted",
  PLATFORM_SUPPORT_ACCESS_REVOKED: "Platform support access revoked",

  ORGANIZATION_BRAIN_ITEM_CREATED: "Organization brain item added",
  ORGANIZATION_BRAIN_ITEM_DELETED: "Organization brain item deleted",
};

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorType: AuditActorType;
  actorUserId: string | null;
  actorPlatformUserId: string | null;
  action: AuditAction;
  targetEntityType: string;
  targetEntityId: string;
  targetDisplayName: string | null;
  contractId: string | null;
  witnessInvitationId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogListParams {
  contractId?: string;
  actorUserId?: string;
  // A single action, or several at once (e.g. the Witness Workflow page's
  // Access Activity tab filtering to its 3 witness-related actions).
  action?: AuditAction | AuditAction[];
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export interface AuditLogListResult {
  items: AuditLogEntry[];
  pagination: AuditLogPaginationMeta;
}
