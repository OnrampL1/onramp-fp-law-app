import type { WitnessStatus } from "./index";

// ─── Witness status badge ─────────────────────────────────────────────────────
// Same pastel + dark-mode-paired palette used by every other status badge in
// the app (see components/users/UserBadges.tsx, components/ui/badges.tsx).

/** border + bg + text classes for each witness invitation status pill. */
export const WITNESS_STATUS_STYLES: Record<WitnessStatus, string> = {
  pending:
    "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  used: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "border border-border bg-muted text-muted-foreground",
  revoked:
    "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

/** Dot colour per witness status (used in the badge). */
export const WITNESS_STATUS_DOT: Record<WitnessStatus, string> = {
  pending: "bg-amber-500",
  used: "bg-emerald-500",
  expired: "bg-muted-foreground",
  revoked: "bg-red-500",
};

/** Display label per witness status — the type itself stays lowercase to match the API. */
export const WITNESS_STATUS_LABELS: Record<WitnessStatus, string> = {
  pending: "Pending",
  used: "Used",
  expired: "Expired",
  revoked: "Revoked",
};

// ─── Security badge ───────────────────────────────────────────────────────────

export type SecurityBadgeVariant = "secure" | "active" | "enforced" | "verified";

export const SECURITY_BADGE_STYLES: Record<SecurityBadgeVariant, string> = {
  secure:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  active:
    "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  enforced:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  verified:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
};
