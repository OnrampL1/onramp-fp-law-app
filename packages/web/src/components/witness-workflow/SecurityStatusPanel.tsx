import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { SECURITY_BADGE_STYLES } from "./types/styles";
import type { SecurityFeature } from "./types";

interface SecurityStatusPanelProps {
  features: SecurityFeature[];
}


export function SecurityStatusPanel({ features }: SecurityStatusPanelProps) {
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-4 w-4 text-muted-foreground"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
        <h2 className="text-sm font-semibold text-foreground">Security Status</h2>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((f) => (
          <SecurityFeatureCard key={f.title} feature={f} />
        ))}
      </div>
    </div>
  );
}

// ─── Single feature card ──────────────────────────────────────────────────────

function SecurityFeatureCard({ feature: f }: { feature: SecurityFeature }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {f.icon}
          </div>

          {/* Text + badge */}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold">{f.title}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{f.subtitle}</p>
            <span
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                SECURITY_BADGE_STYLES[f.badgeVariant],
              )}
            >
              {/* tick */}
              <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
                <path fillRule="evenodd" d="M10.28 2.28a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 011.06-1.06L4.25 7.19l4.97-4.97a.75.75 0 011.06.06z" clipRule="evenodd" />
              </svg>
              {f.badgeLabel}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}