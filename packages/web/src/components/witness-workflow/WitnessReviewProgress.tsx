import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import type { ReviewStage, AccessActivityItem, ActivityEventType } from "./types";

interface WitnessReviewProgressProps {
  stages: ReviewStage[];
  activityItems: AccessActivityItem[];
}

type Tab = "progress" | "activity";

/**
 * Tabbed panel:
 * - Review Progress: completion funnel across active witness invitations
 * - Access Activity: chronological audit trail of witness access events
 */
export function WitnessReviewProgress({ stages, activityItems }: WitnessReviewProgressProps) {
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
              className={`pb-3 text-sm font-medium transition-colors ${
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
        <>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Witness Access Activity</CardTitle>
            <CardDescription>
              Chronological audit trail of witness access events.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {activityItems.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          </CardContent>
        </>
      )}
    </Card>
  );
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ stage: s }: { stage: ReviewStage }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground">{s.icon}</span>
        <span className="text-xs text-muted-foreground">Stage {s.stage}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{s.label}</p>
      <p className="text-xs text-muted-foreground">{s.count} witnesses</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${s.pct}%` }} />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{s.pct}%</p>
    </div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────

const ACTIVITY_ICON_STYLES: Record<ActivityEventType, string> = {
  acknowledged:     "bg-green-50  text-green-600  dark:bg-green-900/20 dark:text-green-400",
  review_completed: "bg-blue-50   text-blue-600   dark:bg-blue-900/20  dark:text-blue-400",
  pdf_downloaded:   "bg-muted     text-muted-foreground",
  contract_opened:  "bg-muted     text-muted-foreground",
  link_generated:   "bg-muted     text-muted-foreground",
};

function ActivityIcon({ type }: { type: ActivityEventType }) {
  const icons: Record<ActivityEventType, React.ReactNode> = {
    acknowledged: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    review_completed: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    pdf_downloaded: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    contract_opened: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    link_generated: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  };
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ACTIVITY_ICON_STYLES[type]}`}>
      {icons[type]}
    </span>
  );
}

function ActivityRow({ item }: { item: AccessActivityItem }) {
  return (
    <li className="flex items-center gap-3 px-6 py-4">
      <ActivityIcon type={item.eventType} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.subLabel}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
    </li>
  );
}