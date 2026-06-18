import type { ContractStatus, RiskLevel } from "../types";

// ─── Status badge ─────────────────────────────────────────────────────────────

/** bg + text classes for each contract status. */
export const STATUS_STYLES: Record<ContractStatus, string> = {
  Active:     "bg-green-100  text-green-700",
  Draft:      "bg-yellow-100 text-yellow-700",
  Expired:    "bg-gray-100   text-gray-500",
  Terminated: "bg-red-100    text-red-600",
};

// ─── Risk badge ───────────────────────────────────────────────────────────────

/** bg + text classes for the risk pill. */
export const RISK_BADGE_STYLES: Record<RiskLevel, string> = {
  Low:      "bg-green-50  text-green-700",
  Medium:   "bg-yellow-50 text-yellow-700",
  High:     "bg-orange-50 text-orange-700",
  Critical: "bg-red-50    text-red-700",
};

/** Dot fill class for the coloured dot inside the risk pill. */
export const RISK_DOT_STYLES: Record<RiskLevel, string> = {
  Low:      "bg-green-500",
  Medium:   "bg-yellow-500",
  High:     "bg-orange-500",
  Critical: "bg-red-600",
};

// ─── Status bar (ContractStatusOverview) ─────────────────────────────────────

/** Bar segment fill class used in the segmented progress bar. */
export const STATUS_BAR_STYLES: Record<ContractStatus, string> = {
  Draft:      "bg-yellow-400",
  Active:     "bg-green-500",
  Expired:    "bg-gray-400",
  Terminated: "bg-red-500",
};