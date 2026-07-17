import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { statusOverview } from "@/lib/data";

const dotColors: Record<string, string> = {
  Draft: "bg-amber-500",
  Active: "bg-emerald-500",
  Expired: "bg-muted-foreground",
  Terminated: "bg-red-500",
};

const barColors: Record<string, string> = {
  Draft: "bg-amber-500",
  Active: "bg-emerald-500",
  Expired: "bg-muted-foreground",
  Terminated: "bg-red-500",
};

export function ContractStatusOverview() {
  const total = 2847;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contract Status Overview</CardTitle>
        <CardDescription>
          Distribution across the full portfolio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stacked bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {statusOverview.map((s) => (
            <div
              key={s.status}
              className={barColors[s.status]}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.status}: ${s.count}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {statusOverview.map((s) => (
            <div key={s.status} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${dotColors[s.status]}`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-foreground">
                  {s.status}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-tight text-foreground">
                  {s.count.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {((s.count / total) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
