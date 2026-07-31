import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { SparklesIcon, ChevronRightIcon } from "../shared/icons";
import { aiInsights } from "@/lib/data";
import type { InsightIconName, InsightTone } from "@/lib/data";
import { Ban, Fingerprint, RefreshCw, Scale, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<InsightIconName, typeof ShieldAlert> = {
  ShieldAlert,
  RefreshCw,
  Scale,
  Ban,
  Fingerprint,
};

const TONE_STYLES: Record<InsightTone, string> = {
  critical: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-accent text-accent-foreground",
};

const INSIGHT_ROUTES: Record<string, string> = {
  "High Risk Contracts": "/contracts?filter=high-risk",
  "Auto Renewal Alerts": "/insights/auto-renewal",
  "Liability Risks": "/insights/liability",
  "Non-Compete Detection": "/insights/non-compete",
  "IP Assignment Detection": "/insights/ip-assignment",
};

export function AiInsightsPanel() {
  const navigate = useNavigate();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon />
          <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
        </div>
        <CardDescription>
          Automated risk and clause detection across your portfolio
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {aiInsights.map((insight) => {
            const route = INSIGHT_ROUTES[insight.title] ?? "/placeholder";
            const Icon = ICONS[insight.icon];
            return (
              <li key={insight.title}>
                <button
                  type="button"
                  onClick={() => navigate(route)}
                  className="flex w-full cursor-pointer items-center justify-between px-6 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        TONE_STYLES[insight.tone],
                      )}
                    >
                      <Icon className="size-5" />
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-medium">
                        {insight.title}
                        <span className="ml-1.5 font-semibold text-foreground">
                          {insight.count}
                        </span>
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRightIcon className="text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
