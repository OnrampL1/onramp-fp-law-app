export type WitnessLinkStatus = "pending" | "used" | "revoked" | "expired";

export interface WitnessLinkResult {
  id: string;
  contractId: string;
  // Only ever non-null in the response right after creation — the raw
  // token is never persisted, so a listed/refetched invitation can't
  // carry one. Matches WitnessToken.token in openapi.yaml.
  token: string | null;
  witnessUrl: string | null;
  witnessEmail: string;
  witnessName: string | null;
  status: WitnessLinkStatus;
  expiresAt: string;
  createdAt: string;
  // "Sent" means handed off to the mail queue, not confirmed delivered —
  // null if sendEmail was false or no send was attempted.
  emailSentAt: string | null;
}

export interface WitnessLinkListItem {
  id: string;
  contractId: string;
  contractTitle: string;
  witnessEmail: string;
  witnessName: string | null;
  issuedBy: { id: string; fullName: string };
  status: WitnessLinkStatus;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  emailSentAt: string | null;
}

export interface WitnessLinkListPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WitnessLinkListParams {
  page: number;
  limit: number;
  contractId?: string;
}

export interface WitnessLinkListResult {
  items: WitnessLinkListItem[];
  pagination: WitnessLinkListPaginationMeta;
}

export interface CreateWitnessLinkPayload {
  contractId: string;
  witnessEmail: string;
  witnessName?: string;
  expiresInHours?: number;
  // Defaults to true server-side if omitted.
  sendEmail?: boolean;
}

// Matches getWitnessLinkStats() in witness.service.ts. No historical
// snapshotting exists, so the *NewLast7Days fields are new-occurrence
// counts (created/used/newly-expired in that window), not true
// before/after deltas.
export interface WitnessLinkStats {
  total: number;
  totalNewLast7Days: number;
  active: number;
  pending: number;
  used: number;
  usedThisMonth: number;
  usedLast7Days: number;
  expired: number;
  expiredNewLast7Days: number;
  revoked: number;
}
