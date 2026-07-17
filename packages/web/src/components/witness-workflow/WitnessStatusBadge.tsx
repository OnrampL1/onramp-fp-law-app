import { cn } from "../../lib/utils";
import { WITNESS_STATUS_STYLES, WITNESS_STATUS_DOT } from "./types/styles";
import type { WitnessStatus } from "./types";

interface WitnessStatusBadgeProps {
  status: WitnessStatus;
  className?: string;
}

export function WitnessStatusBadge({ status, className }: WitnessStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        WITNESS_STATUS_STYLES[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", WITNESS_STATUS_DOT[status])} />
      {status}
    </span>
  );
}