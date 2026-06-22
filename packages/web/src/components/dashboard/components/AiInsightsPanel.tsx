import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { SparklesIcon, ChevronRightIcon } from "../icons";
import type { AiInsight } from "../types";

interface AiInsightsPanelProps {
  insights: AiInsight[];
}


export function AiInsightsPanel({ insights }: AiInsightsPanelProps) {
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
          {insights.map((item, i) => (
            <AiInsightRow key={i} {...item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

/**
 * Maps each insight label to its destination route.
 * Update the value here when the real page is built.
 */
const INSIGHT_ROUTES: Record<string, string> = {
  "High Risk Contracts":     "/contracts?filter=high-risk",
  "Auto Renewal Alerts":     "/insights/auto-renewal",
  "Liability Risks":         "/insights/liability",
  "Non-Compete Detection":   "/insights/non-compete",
  "IP Assignment Detection": "/insights/ip-assignment",
};

function AiInsightRow({ icon, label, count, description }: AiInsight) {
  const navigate = useNavigate();
  const route = INSIGHT_ROUTES[label] ?? "/placeholder";

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => navigate(route)}
      onKeyDown={(e) => e.key === "Enter" && navigate(route)}
      className="flex cursor-pointer items-center justify-between px-6 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3">
        {/* Icon wrapper */}
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>

        {/* Text */}
        <div>
          <p className="text-sm font-medium">
            {label}
            <span className="ml-1.5 font-semibold text-foreground">{count}</span>
          </p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <ChevronRightIcon className="text-muted-foreground" />
    </li>
  );
}