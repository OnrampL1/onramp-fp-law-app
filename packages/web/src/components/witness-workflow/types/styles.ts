import type { WitnessStatus } from "./index";

// ─── Witness status badge ─────────────────────────────────────────────────────

/** bg + text classes for each witness invitation status pill. */
export const WITNESS_STATUS_STYLES: Record<WitnessStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  used:    "bg-green-50  text-green-700",
  expired: "bg-gray-100  text-gray-500",
  revoked: "bg-red-50    text-red-700",
};

/** Optional dot colour per witness status (used in the badge). */
export const WITNESS_STATUS_DOT: Record<WitnessStatus, string> = {
  pending: "bg-yellow-500",
  used:    "bg-green-500",
  expired: "bg-gray-400",
  revoked: "bg-red-500",
};

/** Display label per witness status — the type itself stays lowercase to match the API. */
export const WITNESS_STATUS_LABELS: Record<WitnessStatus, string> = {
  pending: "Pending",
  used:    "Used",
  expired: "Expired",
  revoked: "Revoked",
};

// ─── Security badge ───────────────────────────────────────────────────────────

export type SecurityBadgeVariant = "secure" | "active" | "enforced" | "verified";

export const SECURITY_BADGE_STYLES: Record<SecurityBadgeVariant, string> = {
  secure:   "bg-green-50  text-green-700",
  active:   "bg-blue-50   text-blue-700",
  enforced: "bg-green-50  text-green-700",
  verified: "bg-green-50  text-green-700",
};