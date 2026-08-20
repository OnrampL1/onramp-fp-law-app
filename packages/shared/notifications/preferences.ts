import type { NotificationType } from "@prisma/client";

// Personal, per-user toggles — separate from the org-wide kill switch below.
// Every authenticated user manages their own, no permission gate.
export interface UserNotificationPreferences {
  contractExpiring?: boolean;
  aiAnalysisCompleted?: boolean;
  riskFlagsDetected?: boolean;
}

// Mirrors OrganizationSettings.notificationPreferences's existing shape
// (contractUpdates/riskAlerts/aiInsights) — admin-gated via isAdminRole,
// unchanged by this feature.
export interface OrganizationNotificationPreferences {
  contractUpdates?: boolean;
  riskAlerts?: boolean;
  aiInsights?: boolean;
}

const ORG_PREFERENCE_KEY_BY_TYPE: Record<
  NotificationType,
  keyof OrganizationNotificationPreferences
> = {
  CONTRACT_EXPIRING: "contractUpdates",
  AI_ANALYSIS_COMPLETED: "aiInsights",
  RISK_FLAG_DETECTED: "riskAlerts",
};

const PERSONAL_PREFERENCE_KEY_BY_TYPE: Record<
  NotificationType,
  keyof UserNotificationPreferences
> = {
  CONTRACT_EXPIRING: "contractExpiring",
  AI_ANALYSIS_COMPLETED: "aiAnalysisCompleted",
  RISK_FLAG_DETECTED: "riskFlagsDetected",
};

// Shared by both the AI_ANALYSIS_COMPLETED event hook (packages/api) and the
// CONTRACT_EXPIRING sweep job (packages/workers) so the two generation paths
// can never drift on what "muted" means. Missing/null/anything but an
// explicit `false` is treated as enabled — an org or user that has never
// touched notification settings keeps receiving notifications rather than
// silently opting out by omission (the opposite of the org-wide settings
// UI's own `?? false` *display* default, which only matters for rendering
// an unset toggle as "Disabled", not for whether notifications fire).
export function isOrgNotificationEnabled(
  preferences: OrganizationNotificationPreferences | null | undefined,
  type: NotificationType,
): boolean {
  return preferences?.[ORG_PREFERENCE_KEY_BY_TYPE[type]] !== false;
}

export function isPersonalNotificationEnabled(
  preferences: UserNotificationPreferences | null | undefined,
  type: NotificationType,
): boolean {
  return preferences?.[PERSONAL_PREFERENCE_KEY_BY_TYPE[type]] !== false;
}
