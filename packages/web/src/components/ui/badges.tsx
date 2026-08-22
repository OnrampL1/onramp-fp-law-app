import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContractStatus, RiskLevel, Severity } from "@/lib/data";
import type { DashboardBusinessStatus } from "@/types/dashboard";

const statusStyles: Record<ContractStatus, string> = {
  Active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  Draft:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  Expired: "border-border bg-muted text-muted-foreground",
  Terminated:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const statusDotStyles: Record<ContractStatus, string> = {
  Active: "bg-emerald-500",
  Draft: "bg-amber-500",
  Expired: "bg-muted-foreground",
  Terminated: "bg-red-500",
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium rounded-full", statusStyles[status])}
    >
      <span
        className={cn("size-1.5 rounded-full", statusDotStyles[status])}
        aria-hidden
      />
      {status}
    </Badge>
  );
}

const riskStyles: Record<RiskLevel, string> = {
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  Medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  High: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
  Critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const riskDotStyles: Record<RiskLevel, string> = {
  Low: "bg-emerald-500",
  Medium: "bg-amber-500",
  High: "bg-orange-500",
  Critical: "bg-red-500",
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium rounded-full", riskStyles[risk])}
    >
      <span
        className={cn("size-1.5 rounded-full", riskDotStyles[risk])}
        aria-hidden
      />
      {risk}
    </Badge>
  );
}

const severityStyles: Record<Severity, string> = {
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  Medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  High: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
  Critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const severityDotStyles: Record<Severity, string> = {
  Low: "bg-emerald-500",
  Medium: "bg-amber-500",
  High: "bg-orange-500",
  Critical: "bg-red-500",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium uppercase tracking-wide text-[10px] rounded-full",
        severityStyles[severity],
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", severityDotStyles[severity])}
        aria-hidden
      />
      {severity}
    </Badge>
  );
}

export const BUSINESS_STATUS_LABELS: Record<DashboardBusinessStatus, string> =
  {
    DRAFT: "Draft",
    UNDER_REVIEW: "Under review",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
  };

const businessStatusStyles: Record<DashboardBusinessStatus, string> = {
  DRAFT:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  UNDER_REVIEW:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  ARCHIVED: "border-border bg-muted text-muted-foreground",
};

const businessStatusDotStyles: Record<DashboardBusinessStatus, string> = {
  DRAFT: "bg-amber-500",
  UNDER_REVIEW: "bg-blue-500",
  COMPLETED: "bg-emerald-500",
  ARCHIVED: "bg-muted-foreground",
};

export function BusinessStatusBadge({
  status,
}: {
  status: DashboardBusinessStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium rounded-full",
        businessStatusStyles[status],
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", businessStatusDotStyles[status])}
        aria-hidden
      />
      {BUSINESS_STATUS_LABELS[status]}
    </Badge>
  );
}
