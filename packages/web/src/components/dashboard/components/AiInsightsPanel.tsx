import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { SparklesIcon, ChevronRightIcon } from "../icons";
import type { AiInsight } from "../types";

interface AiInsightsPanelProps {
  insights: AiInsight[];
}

/**
 * Card panel listing AI-detected risk categories with counts.
 * Each row is clickable (hover state) and chevron-navigable.
 */
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


function AiInsightRow({ icon, label, count, description }: AiInsight) {
  return (
    <li className="flex cursor-pointer items-center justify-between px-6 py-3 transition-colors hover:bg-muted/40">
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