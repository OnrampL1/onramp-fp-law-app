import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "../shared/icons";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  CalendarClock,
  Copyright,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInsightsSummary } from "@/hooks/useInsights";
import type { RiskCategory } from "@/types/insights";

const CATEGORY_LINKS: {
  category: RiskCategory;
  label: string;
  icon: LucideIcon;
  href: string;
  iconClassName: string;
}[] = [
  {
    category: "AUTO_RENEWAL",
    label: "Auto-renewal",
    icon: CalendarClock,
    href: "/insights/auto-renewal",
    iconClassName: "bg-red-50 text-red-600",
  },
  {
    category: "LIABILITY",
    label: "Liability",
    icon: ShieldAlert,
    href: "/insights/liability",
    iconClassName: "bg-red-50 text-red-600",
  },
  {
    category: "NON_COMPETE",
    label: "Non-compete",
    icon: Ban,
    href: "/insights/non-compete",
    iconClassName: "bg-accent text-accent-foreground",
  },
  {
    category: "IP_ASSIGNMENT",
    label: "IP assignment",
    icon: Copyright,
    href: "/insights/ip-assignment",
    iconClassName: "bg-accent text-accent-foreground",
  },
];

export function AiInsightsPanel() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useInsightsSummary();

  const countFor = (category: RiskCategory) =>
    data?.categories.find((c) => c.category === category)?.contractCount;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon />
          <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
        </div>
        <CardDescription>
          Portfolio-wide risk categories, drawn from every contract's completed
          analysis.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-6 text-center">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Insights could not be loaded.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {CATEGORY_LINKS.map(
              ({ category, label, icon: Icon, href, iconClassName }) => {
              const count = countFor(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => navigate(href)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      iconClassName,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {label}
                    </p>
                  </div>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {isLoading ? "…" : (count ?? 0)}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/contracts")}
        >
          View Contracts
        </Button>
      </CardContent>
    </Card>
  );
}
