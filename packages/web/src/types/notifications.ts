// Mirrors the backend Prisma `NotificationType`/`NotificationScope` enums
// (packages/shared/prisma/schema.prisma) and the NotificationItemDto shape
// (packages/api/src/types/notification.types.ts).

export const NOTIFICATION_TYPES = [
  "CONTRACT_EXPIRING",
  "AI_ANALYSIS_COMPLETED",
  "RISK_FLAG_DETECTED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationScope = "ORG" | "PERSONAL";

// Every current type maps 1:1 to a scope, same grouping the dropdown and
// the "View all" filter both use — CONTRACT_EXPIRING is org-wide (an
// expiration is an operational fact, not sensitive). AI_ANALYSIS_COMPLETED
// and RISK_FLAG_DETECTED are both PERSONAL: analysis results and, more so,
// a contract's specific legal risk exposure aren't every member's business
// by default — only the uploader (who already has access to the contract)
// gets pinged. The org-wide toggle in Settings still lets an admin mute
// either for everyone; it just doesn't change who receives it when it's on.
export type NotificationTypeGroup = "Organization" | "For You";

export const NOTIFICATION_TYPE_GROUP: Record<NotificationType, NotificationTypeGroup> = {
  CONTRACT_EXPIRING: "Organization",
  AI_ANALYSIS_COMPLETED: "For You",
  RISK_FLAG_DETECTED: "For You",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  CONTRACT_EXPIRING: "Contract expiring soon",
  AI_ANALYSIS_COMPLETED: "AI analysis complete",
  RISK_FLAG_DETECTED: "Risk flag detected",
};

export interface NotificationItem {
  id: string;
  type: NotificationType;
  scope: NotificationScope;
  contractId: string;
  contractTitle: string;
  occurredAt: string;
  severity?: string;
  category?: string;
  flagCount?: number;
  read: boolean;
  readAt: string | null;
}

export interface NotificationPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Preset ranges for the "View all" modal's date filter, replacing raw
// From/To date inputs. "all" omits both params entirely.
export const DATE_RANGE_PRESETS = [
  "all",
  "yesterday",
  "last7",
  "last30",
  "last90",
  "lastYear",
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  all: "All time",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  last90: "Last 90 days",
  lastYear: "Last year",
};

export interface NotificationListParams {
  scope?: NotificationScope;
  type?: NotificationType | NotificationType[];
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export interface NotificationListResult {
  items: NotificationItem[];
  pagination: NotificationPaginationMeta;
}

// GET/PUT /notifications/preferences — personal, self-service, no admin
// gate. Separate from OrganizationSettings.notificationPreferences (the
// admin-gated org-wide kill switch), which keeps its own
// contractUpdates/riskAlerts/aiInsights shape in settings.service.ts.
export interface NotificationPreferences {
  contractExpiring?: boolean;
  aiAnalysisCompleted?: boolean;
  riskFlagsDetected?: boolean;
}
