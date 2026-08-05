export type NotificationType = "CONTRACT_EXPIRING" | "AI_ANALYSIS_COMPLETED";

export interface NotificationItemDto {
  id: string;
  type: NotificationType;
  contractId: string;
  contractTitle: string;
  // ISO timestamp: the contract's expirationDate for CONTRACT_EXPIRING,
  // the analysis's createdAt for AI_ANALYSIS_COMPLETED. Deliberately not
  // pre-formatted into English here — the frontend already has
  // formatRelativeTime() and it handles both past and future dates.
  occurredAt: string;
}
