import { useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import type { ReviewStage, AccessActivityItem, ActivityEventType } from "./types";

interface ActivityPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface WitnessReviewProgressProps {
  stages: ReviewStage[];
  activityItems: AccessActivityItem[];
  activityIsLoading: boolean;
  activityIsError: boolean;
  onActivityRetry: () => void;
  activityPagination?: ActivityPaginationMeta;
  onActivityPageChange: (page: number) => void;
}

type Tab = "progress" | "activity";

/**
 * Tabbed panel:
 * - Review Progress: completion funnel across all witness invitations
 * - Access Activity: real audit trail of witness access events, paged
 *   through rather than rendered as one long list
 */
export function WitnessReviewProgress({
  stages,
  activityItems,
  activityIsLoading,
  activityIsError,
  onActivityRetry,
  activityPagination,
  onActivityPageChange,
}: WitnessReviewProgressProps) {
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
              Completion funnel across all witness invitations ever issued.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              Real audit trail of witness link creation, access, and revocation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {activityIsLoading ? (
              <p className="py-14 text-center text-sm text-muted-foreground">Loading activity...</p>
            ) : activityIsError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <AlertCircle className="size-6 text-destructive" />
                <p className="text-sm text-muted-foreground">We couldn't load witness activity.</p>
                <Button variant="outline" size="sm" onClick={onActivityRetry}>
                  Retry
                </Button>
              </div>
            ) : activityItems.length === 0 ? (
              <p className="py-14 text-center text-sm text-muted-foreground">
                No witness activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {activityItems.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </ul>
            )}

            {activityPagination && activityPagination.total > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {activityPagination.page} of {activityPagination.totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onActivityPageChange(Math.max(1, activityPagination.page - 1))}
                    disabled={activityPagination.page === 1}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() =>
                      onActivityPageChange(
                        Math.min(activityPagination.totalPages, activityPagination.page + 1),
                      )
                    }
                    disabled={activityPagination.page === activityPagination.totalPages}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
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
  witness_accessed: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  witness_revoked:  "bg-red-50   text-red-600   dark:bg-red-900/20   dark:text-red-400",
  link_generated:   "bg-muted    text-muted-foreground",
};

function ActivityIcon({ type }: { type: ActivityEventType }) {
  const icons: Record<ActivityEventType, React.ReactNode> = {
    witness_accessed: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    witness_revoked: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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
