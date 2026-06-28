import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContractStatus, RiskLevel, Severity } from "@/lib/data";

const statusStyles: Record<ContractStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Draft: "bg-amber-50 text-amber-700 border-amber-200",
  Expired: "bg-muted text-muted-foreground border-border",
  Terminated: "bg-red-50 text-red-700 border-red-200",
};

const riskStyles: Record<RiskLevel, string> = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium rounded-full", statusStyles[status])}
    >
      {status}
    </Badge>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const dot: Record<RiskLevel, string> = {
    Low: "bg-emerald-500",
    Medium: "bg-amber-500",
    High: "bg-orange-500",
    Critical: "bg-red-500",
  };
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium rounded-full", riskStyles[risk])}
    >
      <span className={cn("size-1.5 rounded-full", dot[risk])} aria-hidden />
      {risk}
    </Badge>
  );
}

const severityStyles: Record<Severity, string> = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium uppercase tracking-wide text-[10px]",
        severityStyles[severity],
      )}
    >
      {severity}
    </Badge>
  );
}
