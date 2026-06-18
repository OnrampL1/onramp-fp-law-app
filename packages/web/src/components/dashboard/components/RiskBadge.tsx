import { cn } from "../../../lib/utils";
import { RISK_BADGE_STYLES, RISK_DOT_STYLES } from "../types/styles";
import type { RiskLevel } from "../types";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

/**
 * Pill badge with a coloured dot for a contract's risk level.
 * Colours are driven by RISK_BADGE_STYLES / RISK_DOT_STYLES — extend those maps to add new levels.
 */
export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        RISK_BADGE_STYLES[level],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", RISK_DOT_STYLES[level])} />
      {level}
    </span>
  );
}