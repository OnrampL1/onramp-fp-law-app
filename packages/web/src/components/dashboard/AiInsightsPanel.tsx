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
import { AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInsightsSummary } from "@/hooks/useInsights";
import { RISK_CATEGORY_META } from "@/lib/insight-categories";

export function AiInsightsPanel() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useInsightsSummary();

  // Only categories with at least one flagged contract - a zero-count
  // category has nothing to drill into, and a fixed subset would either
  // show permanently-empty rows or silently omit a category (e.g.
  // Indemnification) the moment it actually has findings.
  const activeCategories = (data?.categories ?? [])
    .filter((c) => c.contractCount > 0)
    .sort((a, b) => b.contractCount - a.contractCount);

  return (
    <Card>
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
        ) : isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : activeCategories.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No risk categories flagged yet.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {activeCategories.map(({ category, contractCount }) => {
              const meta = RISK_CATEGORY_META[category];
              const Icon = meta.icon;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => navigate(`/insights/${meta.slug}`)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      meta.iconClassName,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {meta.label}
                    </p>
                  </div>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {contractCount}
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
