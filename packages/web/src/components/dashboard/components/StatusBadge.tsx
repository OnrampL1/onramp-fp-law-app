import { cn } from "../../../lib/utils";
import { STATUS_STYLES } from "../types/styles";
import type { ContractStatus } from "../types";

interface StatusBadgeProps {
  status: ContractStatus;
  className?: string;
}

/**
 * Pill badge for a contract's lifecycle status.
 * Colours are driven by STATUS_STYLES — extend that map to add new statuses.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}