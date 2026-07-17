import type { WitnessStatus } from "./index";

// ─── Witness status badge ─────────────────────────────────────────────────────

/** bg + text classes for each witness invitation status pill. */
export const WITNESS_STATUS_STYLES: Record<WitnessStatus, string> = {
  Viewed:       "bg-blue-50   text-blue-700",
  Acknowledged: "bg-green-50  text-green-700",
  Pending:      "bg-yellow-50 text-yellow-700",
  Expired:      "bg-gray-100  text-gray-500",
  Revoked:      "bg-red-50    text-red-700",
};

/** Optional dot colour per witness status (used in the badge). */
export const WITNESS_STATUS_DOT: Record<WitnessStatus, string> = {
  Viewed:       "bg-blue-500",
  Acknowledged: "bg-green-500",
  Pending:      "bg-yellow-500",
  Expired:      "bg-gray-400",
  Revoked:      "bg-red-500",
};

// ─── Security badge ───────────────────────────────────────────────────────────

export type SecurityBadgeVariant = "secure" | "active" | "enforced" | "verified";

export const SECURITY_BADGE_STYLES: Record<SecurityBadgeVariant, string> = {
  secure:   "bg-green-50  text-green-700",
  active:   "bg-blue-50   text-blue-700",
  enforced: "bg-green-50  text-green-700",
  verified: "bg-green-50  text-green-700",
};