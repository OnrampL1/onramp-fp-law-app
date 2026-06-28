import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { expiringContracts } from "@/lib/data";
import { CalendarClock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { RiskBadge } from "../ui/badges";

const CONTRACT_ROUTES: Record<string, string> = {
  "Manufacturing Supply Contract": "/contracts/CTR-10470",
  "Enterprise SaaS License": "/contracts/CTR-10479",
  "Office Lease Agreement": "/contracts/CTR-10447",
  "Marketing Retainer": "/contracts/CTR-10442",
};

export function ExpiringContractsList() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          <CardTitle className="text-base">Expiring Contracts</CardTitle>
        </div>
        <CardDescription>
          Contracts approaching their expiration date
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {expiringContracts.map((c) => {
          const urgent = c.daysLeft <= 30;
          const route = CONTRACT_ROUTES[c.name] ?? "/contracts";
          return (
            <div
              key={c.name}
              role="button"
              tabIndex={0}
              onClick={() => navigate(route)}
              onKeyDown={(e) => e.key === "Enter" && navigate(route)}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div
                className={cn(
                  "flex size-12 shrink-0 flex-col items-center justify-center rounded-lg",
                  urgent
                    ? "bg-red-50 text-red-600"
                    : "bg-accent text-accent-foreground",
                )}
              >
                <span className="text-base font-semibold leading-none">
                  {c.daysLeft}
                </span>
                <span className="text-[10px] font-medium uppercase">days</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {c.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.counterparty} · {c.value}
                </p>
              </div>
              <RiskBadge risk={c.risk} />
            </div>
          );
        })}
        <Button variant="outline" className="w-full gap-1.5">
          View renewal calendar
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
