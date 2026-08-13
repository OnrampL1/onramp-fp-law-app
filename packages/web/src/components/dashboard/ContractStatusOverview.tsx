import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import type { DashboardLegalStateCounts } from "@/types/dashboard";

const legalStateLabels = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
  UNSET: "Unset",
} as const;

const dotColors: Record<keyof DashboardLegalStateCounts, string> = {
  DRAFT: "bg-amber-500",
  ACTIVE: "bg-emerald-500",
  EXPIRED: "bg-muted-foreground",
  TERMINATED: "bg-red-500",
  UNSET: "bg-slate-400",
};

const barColors: Record<keyof DashboardLegalStateCounts, string> = {
  DRAFT: "bg-amber-500",
  ACTIVE: "bg-emerald-500",
  EXPIRED: "bg-muted-foreground",
  TERMINATED: "bg-red-500",
  UNSET: "bg-slate-400",
};

const displayOrder: Array<keyof DashboardLegalStateCounts> = [
  "DRAFT",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
  "UNSET",
];

interface ContractStatusOverviewProps {
  counts: DashboardLegalStateCounts | undefined;
  total: number;
  isLoading?: boolean;
}

export function ContractStatusOverview({
  counts,
  total,
  isLoading = false,
}: ContractStatusOverviewProps) {
  const safeCounts =
    counts ??
    ({
      DRAFT: 0,
      ACTIVE: 0,
      EXPIRED: 0,
      TERMINATED: 0,
      UNSET: 0,
    } satisfies DashboardLegalStateCounts);

  const visibleStates = displayOrder.filter((state) => {
    return state !== "UNSET" || safeCounts.UNSET > 0;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Legal State Overview</CardTitle>
        <CardDescription>
          Validity distribution across active portfolio records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {total > 0 ? (
            visibleStates.map((state) => (
              <div
                key={state}
                className={barColors[state]}
                style={{ width: `${(safeCounts[state] / total) * 100}%` }}
                title={`${legalStateLabels[state]}: ${safeCounts[state]}`}
              />
            ))
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {visibleStates.map((state) => {
            const count = safeCounts[state];
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={state} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${dotColors[state]}`}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-foreground">
                    {legalStateLabels[state]}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-foreground">
                    {isLoading ? "..." : count.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
