export type NotificationType =
  | "CONTRACT_EXPIRING"
  | "AI_ANALYSIS_COMPLETED"
  | "RISK_FLAG_DETECTED";
export type NotificationScope = "ORG" | "PERSONAL";

// Superset of the pre-persistence NotificationItemDto: contractId/
// contractTitle/occurredAt keep their old meaning (both existing types are
// still contract-scoped) so the current bell dropdown keeps working
// unmodified against this response shape; scope/read/readAt are additive,
// for the frontend pass that switches off the localStorage seen-state.
// severity/category/flagCount are RISK_FLAG_DETECTED-only, optional so the
// other two types' payloads stay exactly as they were.
export interface NotificationItemDto {
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

export interface NotificationListResult {
  data: NotificationItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
