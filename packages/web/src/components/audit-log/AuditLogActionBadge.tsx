import { cn } from "../../lib/utils";
import type { AuditVerb } from "../../lib/data";

interface AuditLogActionBadgeProps {
  verb: AuditVerb;
  className?: string;
}

const VERB_STYLES: Record<AuditVerb, string> = {
  Create:     "bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-400",
  Update:     "bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-400",
  Delete:     "bg-red-50    text-red-700    dark:bg-red-900/20    dark:text-red-400",
  Auth:       "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  View:       "bg-muted     text-muted-foreground",
  Export:     "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Permission: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
};


export function AuditLogActionBadge({ verb, className }: AuditLogActionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
        VERB_STYLES[verb],
        className,
      )}
    >
      {verb}
    </span>
  );
}