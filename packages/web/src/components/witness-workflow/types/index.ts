// ─── Witness-specific types ───────────────────────────────────────────────────

export type WitnessStatus =
  | "Viewed"
  | "Acknowledged"
  | "Pending"
  | "Expired"
  | "Revoked";

export type AccessType = "Review & Acknowledge" | "Review Only";
export type AccessExpiry = "24h" | "48h" | "72h" | "7d";

export interface WitnessInvitation {
  id: string;
  contractName: string;
  contractId: string;
  witnessName: string;
  witnessEmail: string;
  generatedBy: string;
  created: string;
  expires: string;
  expiresLabel: string;
  status: WitnessStatus;
  accessType: AccessType;
  lastAction: string;
  generatedDate: string;
  url: string;
}

export interface ReviewStage {
  stage: number;
  icon: React.ReactNode;
  label: string;
  count: number;
  pct: number;
}

export interface SecurityFeature {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeVariant: "secure" | "active" | "enforced" | "verified";
}

export interface ExpiringLink {
  contractName: string;
  contractId: string;
  witnessName: string;
  expirationTime: string;
}

export interface WitnessStatCard {
  icon: React.ReactNode;
  delta: string;
  deltaPositive: boolean;
  value: string | number;
  label: string;
  sublabel?: string;
}

// ─── NEW: generated link state ────────────────────────────────────────────────

export interface GeneratedLink {
  url: string;
  expirationDate: string;
  accessType: AccessType;
}

// ─── NEW: access activity timeline ───────────────────────────────────────────

export type ActivityEventType =
  | "acknowledged"
  | "review_completed"
  | "pdf_downloaded"
  | "contract_opened"
  | "link_generated";

export interface AccessActivityItem {
  id: string;
  eventType: ActivityEventType;
  label: string;
  subLabel: string;
  time: string;
}