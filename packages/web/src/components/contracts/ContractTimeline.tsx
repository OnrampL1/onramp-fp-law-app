import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useContractTimeline } from "@/hooks/useContractTimeline";
import { getActorDisplay } from "@/components/audit-log/AuditLogTable";
import { listUsers } from "@/services/users.service";
import {
  AUDIT_ACTION_LABELS,
  type AuditAction,
  type AuditLogEntry,
} from "@/types/audit";
import {
  Upload,
  RefreshCw,
  Sparkles,
  Link2,
  MessageSquare,
  Pencil,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const EVENT_ICON: Partial<
  Record<
    AuditAction,
    { icon: React.ComponentType<{ className?: string }>; className: string }
  >
> = {
  CONTRACT_UPLOADED: {
    icon: Upload,
    className: "bg-blue-50 text-blue-600 ring-blue-100",
  },
  CONTRACT_METADATA_UPDATED: {
    icon: Pencil,
    className: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  },
  CONTRACT_TEXT_EXTRACTED: {
    icon: RefreshCw,
    className: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  CONTRACT_PROCESSING_STATUS_CHANGED: {
    icon: RefreshCw,
    className: "bg-red-50 text-red-600 ring-red-100",
  },
  AI_ANALYSIS_COMPLETED: {
    icon: Sparkles,
    className: "bg-primary/10 text-primary ring-primary/15",
  },
  AI_ANALYSIS_FAILED: {
    icon: Sparkles,
    className: "bg-red-50 text-red-600 ring-red-100",
  },
  WITNESS_INVITATION_CREATED: {
    icon: Link2,
    className: "bg-amber-50 text-amber-600 ring-amber-100",
  },
  WITNESS_ACCESSED: {
    icon: Link2,
    className: "bg-amber-50 text-amber-600 ring-amber-100",
  },
  WITNESS_INVITATION_REVOKED: {
    icon: Link2,
    className: "bg-muted text-muted-foreground ring-border",
  },
  NOTE_ADDED: {
    icon: MessageSquare,
    className: "bg-muted text-muted-foreground ring-border",
  },
  NOTE_EDITED: {
    icon: MessageSquare,
    className: "bg-muted text-muted-foreground ring-border",
  },
  NOTE_DELETED: {
    icon: MessageSquare,
    className: "bg-muted text-muted-foreground ring-border",
  },
};

const DEFAULT_EVENT_ICON = {
  icon: RefreshCw,
  className: "bg-muted text-muted-foreground ring-border",
};

const NOTE_PREVIEW_LENGTH = 120;

// CONTRACT_PROCESSING_STATUS_CHANGED is, today, only ever written on
// extraction failure (contract-processing.repository.ts's
// markExtractionFailed) — a more specific label than the generic
// AUDIT_ACTION_LABELS entry is accurate, not presumptuous. AI_ANALYSIS_*
// actions carry which analysis type in newValue.type, worth surfacing in
// the primary label rather than a generic "AI analysis completed" for both
// Summary and Risk runs.
function labelFor(entry: AuditLogEntry): string {
  if (entry.action === "CONTRACT_PROCESSING_STATUS_CHANGED") {
    return "Text extraction failed";
  }
  if (
    entry.action === "AI_ANALYSIS_COMPLETED" ||
    entry.action === "AI_ANALYSIS_FAILED"
  ) {
    const type = entry.newValue?.type;
    const typeLabel =
      type === "SUMMARY" ? "Summary" : type === "RISK" ? "Risk" : "AI";
    const verb =
      entry.action === "AI_ANALYSIS_COMPLETED"
        ? "analysis completed"
        : "analysis failed";
    return `${typeLabel} ${verb}`;
  }
  return AUDIT_ACTION_LABELS[entry.action];
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function detailFor(entry: AuditLogEntry): string | undefined {
  if (entry.action === "CONTRACT_PROCESSING_STATUS_CHANGED") {
    const error = entry.newValue?.processingError;
    return typeof error === "string" ? error : undefined;
  }
  if (entry.action === "AI_ANALYSIS_FAILED") {
    const error = entry.newValue?.error;
    return typeof error === "string" ? error : undefined;
  }
  if (entry.action === "NOTE_ADDED" || entry.action === "NOTE_EDITED") {
    const content = entry.newValue?.content;
    return typeof content === "string"
      ? truncate(content, NOTE_PREVIEW_LENGTH)
      : undefined;
  }
  if (entry.action === "NOTE_DELETED") {
    const content = entry.oldValue?.content;
    return typeof content === "string"
      ? `Deleted: "${truncate(content, NOTE_PREVIEW_LENGTH)}"`
      : undefined;
  }
  return undefined;
}

const PAGE_SIZE = 5;

export function ContractTimeline({ contractId }: { contractId: string }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, isError, isFetching } = useContractTimeline(
    contractId,
    limit,
  );
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const usersById = new Map((users ?? []).map((u) => [u.id, u]));
  const hasMore = data ? data.items.length < data.pagination.total : false;

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Contract Activity Timeline
        </h2>
        {data && (
          <span className="text-xs text-muted-foreground">
            {data.pagination.total} events
          </span>
        )}
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Recorded activity for this contract
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading activity…
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Couldn't load the activity timeline.
        </p>
      ) : !data || data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No activity recorded yet.
        </p>
      ) : (
        <>
          <ol className="relative space-y-6">
            {data.items.map((entry, i) => {
              const { icon: Icon, className } =
                EVENT_ICON[entry.action] ?? DEFAULT_EVENT_ICON;
              const actor = getActorDisplay(entry, usersById);
              const detail = detailFor(entry);
              const isLast = i === data.items.length - 1;
              return (
                <li key={entry.id} className="relative flex gap-4">
                  {!isLast && (
                    <span
                      className="absolute left-[18px] top-10 h-[calc(100%+0.5rem)] w-px bg-border"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                      className,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{actor.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {labelFor(entry)}
                        </span>
                      </p>
                      {detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {detail}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5 sm:hidden">
                        <AvatarFallback className="bg-accent text-[9px] font-semibold text-accent-foreground">
                          {actor.initials}
                        </AvatarFallback>
                      </Avatar>
                      <time className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                        {formatRelativeTime(entry.createdAt)}
                      </time>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              className="mt-5 w-full bg-transparent"
              disabled={isFetching}
              onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
            >
              {isFetching ? "Loading…" : "Load more"}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
