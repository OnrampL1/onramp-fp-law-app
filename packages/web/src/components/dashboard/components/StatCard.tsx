import { cn } from "../../../lib/utils";
import { Card, CardContent } from "../../../components/ui/card";
import type { StatCardData } from "../types";

type StatCardProps = StatCardData;

/**
 * Single KPI tile.
 * Renders an icon, a delta indicator (up/down), a large value, and optional sub-label.
 */
export function StatCard({ icon, delta, deltaPositive, value, label, sublabel }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        {/* Icon + delta row */}
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <span
            className={cn(
              "text-xs font-medium",
              deltaPositive ? "text-green-600" : "text-red-500",
            )}
          >
            {deltaPositive ? "↑" : "↓"} {delta}
          </span>
        </div>

        {/* Value + labels */}
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{label}</p>
          {sublabel && (
            <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}