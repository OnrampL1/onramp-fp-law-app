import { cn } from "../../lib/utils";
import type { AuditActionGroup } from "../../types/audit";

interface AuditLogActionBadgeProps {
  group: AuditActionGroup;
  className?: string;
}

// No "verb" concept exists on the backend (no Create/Update/Delete field on
// AuditLog) — actions are grouped by the domain entity they act on instead,
// matching AUDIT_ACTION_GROUP in types/audit.ts.
const GROUP_STYLES: Record<AuditActionGroup, string> = {
  Organization: "bg-indigo-50  text-indigo-700  dark:bg-indigo-900/20  dark:text-indigo-400",
  User:         "bg-blue-50    text-blue-700    dark:bg-blue-900/20    dark:text-blue-400",
  Contract:     "bg-green-50   text-green-700   dark:bg-green-900/20   dark:text-green-400",
  Note:         "bg-teal-50    text-teal-700    dark:bg-teal-900/20    dark:text-teal-400",
  Witness:      "bg-purple-50  text-purple-700  dark:bg-purple-900/20  dark:text-purple-400",
  AI:           "bg-orange-50  text-orange-700  dark:bg-orange-900/20  dark:text-orange-400",
  Platform:     "bg-muted      text-muted-foreground",
};

export function AuditLogActionBadge({ group, className }: AuditLogActionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
        GROUP_STYLES[group],
        className,
      )}
    >
      {group}
    </span>
  );
}
