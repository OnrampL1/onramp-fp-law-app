import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, ArrowRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { DashboardContractItem } from "@/types/dashboard";

const DAY_MS = 24 * 60 * 60 * 1000;

interface ExpiringContractsListProps {
  contracts: DashboardContractItem[] | undefined;
  isLoading?: boolean;
}

function daysUntil(dateString: string): number {
  const today = new Date();
  const todayUtcMidnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const date = new Date(dateString);
  const dateUtcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  return Math.round((dateUtcMidnight - todayUtcMidnight) / DAY_MS);
}

export function ExpiringContractsList({
  contracts,
  isLoading = false,
}: ExpiringContractsListProps) {
  const navigate = useNavigate();
  // Capped rather than showing every match - this card sits beside Legal
  // State Overview at a fixed-ish height, and a long list here would either
  // force that layout or just look unbalanced. "View All Contracts" below
  // is the escape hatch for anything beyond these three.
  const items = (contracts ?? []).slice(0, 3);

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
        {isLoading ? (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Loading expiring contracts...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            No contracts expire in the next 30 days.
          </div>
        ) : (
          items.map((contract) => {
            const daysLeft = contract.expirationDate
              ? daysUntil(contract.expirationDate)
              : null;
            const urgent = daysLeft !== null && daysLeft <= 7;

            return (
              <div
                key={contract.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/contracts/${contract.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/contracts/${contract.id}`);
                  }
                }}
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
                    {daysLeft}
                  </span>
                  <span className="text-[10px] font-medium uppercase">
                    days
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {contract.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {contract.counterparty} · expires{" "}
                    {formatDate(contract.expirationDate)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        <Button
          variant="outline"
          className="w-full gap-1.5"
          onClick={() => navigate("/contracts")}
        >
          View All Contracts
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
