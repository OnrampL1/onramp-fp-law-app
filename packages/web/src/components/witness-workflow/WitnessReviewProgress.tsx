import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import type { ReviewStage } from "./types";

interface WitnessReviewProgressProps {
  stages: ReviewStage[];
}

type Tab = "progress" | "activity";

export function WitnessReviewProgress({ stages }: WitnessReviewProgressProps) {
  const [activeTab, setActiveTab] = useState<Tab>("progress");

  return (
    <Card>
      {/* Tab bar */}
      <div className="border-b border-border px-6 pt-4">
        <div className="flex gap-4">
          {(["progress", "activity"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "progress" ? "Review Progress" : "Access Activity"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "progress" ? (
        <>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Witness Review Progress</CardTitle>
            <CardDescription>
              Completion funnel across all active witness invitations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {stages.map((s) => (
                <StageCard key={s.stage} stage={s} />
              ))}
            </div>
          </CardContent>
        </>
      ) : (
        <CardContent className="flex min-h-[180px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Access activity log coming soon.</p>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ stage: s }: { stage: ReviewStage }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Stage label */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {s.icon}
        </span>
        <span className="text-xs text-muted-foreground">Stage {s.stage}</span>
      </div>

      {/* Label + count */}
      <p className="text-sm font-semibold text-foreground">{s.label}</p>
      <p className="text-xs text-muted-foreground">{s.count} witnesses</p>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${s.pct}%` }}
        />
      </div>

      {/* Percentage */}
      <p className="text-xs font-medium text-muted-foreground">{s.pct}%</p>
    </div>
  );
}