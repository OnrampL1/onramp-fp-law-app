// ─── Witness-specific types ───────────────────────────────────────────────────

// Matches the real backend model (WitnessLinkStatus in types/witness.ts /
// deriveWitnessStatus in witness.service.ts) — there is no separate
// "viewed" or "acknowledged" state, only pending/used/expired/revoked.
export type WitnessStatus = "pending" | "used" | "expired" | "revoked";

// Single fixed value, not a real choice — every witness gets identical
// read-only access regardless of anything selected in the generate form
// (BR-8). Kept as a named type rather than inlining "Review Only" so its
// call sites still read as intentional rather than a stray string literal.
export type AccessType = "Review Only";
export type AccessExpiry = "24h" | "48h" | "72h" | "7d";

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
  id: string;
  contractId: string;
  url: string;
  expirationDate: string;
  accessType: AccessType;
  witnessEmail: string;
  witnessName: string | null;
  // "Sent" means handed off to the mail queue, not confirmed delivered.
  emailSentAt: string | null;
}

// ─── NEW: access activity timeline ───────────────────────────────────────────

// The 3 audit events witness.service.ts actually emits — no per-action
// granular log (page views, downloads) exists behind this.
export type ActivityEventType =
  | "link_generated"
  | "witness_accessed"
  | "witness_revoked";

export interface AccessActivityItem {
  id: string;
  eventType: ActivityEventType;
  label: string;
  subLabel: string;
  time: string;
}