import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiCardItem = {
  icon: ReactNode;
  value: string | number;
  label: string;
  sublabel?: string;
  delta?: string;
  deltaPositive?: boolean;
};

export function KpiCard({
  icon,
  value,
  label,
  sublabel,
  delta,
  deltaPositive,
}: KpiCardItem) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </div>
        {delta && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              deltaPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
            )}
          >
            {deltaPositive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
        {sublabel && (
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </Card>
  );
}

type KpiCardsProps = {
  items: KpiCardItem[];
  className?: string;
};

export function KpiCards({ items, className }: KpiCardsProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}
