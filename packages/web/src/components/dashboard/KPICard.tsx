import { Card } from "@/components/ui/card";
import {
  FileText,
  FileCheck2,
  CalendarClock,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { kpis } from "@/lib/data";
import { cn } from "@/lib/utils";

const icons = { FileText, FileCheck2, CalendarClock, ShieldAlert };

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = icons[kpi.icon as keyof typeof icons];
        const isUp = kpi.trend === "up";
        // For the risk card, a downward trend is good
        const isPositive = kpi.label.includes("Risk") ? !isUp : isUp;
        return (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </div>
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
                  isPositive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700",
                )}
              >
                {isUp ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {kpi.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {kpi.value}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {kpi.label}
              </p>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
