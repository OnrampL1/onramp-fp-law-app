export type NotificationType = "CONTRACT_EXPIRING" | "AI_ANALYSIS_COMPLETED";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  contractId: string;
  contractTitle: string;
  occurredAt: string;
}
