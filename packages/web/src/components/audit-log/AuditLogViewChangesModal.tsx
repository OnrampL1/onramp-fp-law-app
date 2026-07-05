import { useState } from "react";
import { AuditLogActionBadge } from "./AuditLogActionBadge";
import type { AuditLogEntry, FieldDiff, FieldChangeType } from "../../lib/data";

interface AuditLogViewChangesModalProps {
  entry: AuditLogEntry;
  onClose: () => void;
}

// ─── Change type badge ────────────────────────────────────────────────────────

const CHANGE_BADGE_STYLES: Record<FieldChangeType, string> = {
  changed:   "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  added:     "bg-green-50  text-green-700  border border-green-200  dark:bg-green-900/20  dark:text-green-400  dark:border-green-800",
  removed:   "bg-red-50    text-red-700    border border-red-200    dark:bg-red-900/20    dark:text-red-400    dark:border-red-800",
  unchanged: "bg-muted text-muted-foreground border border-border",
};

const CHANGE_BADGE_LABELS: Record<FieldChangeType, string> = {
  changed:   "Changed",
  added:     "Added",
  removed:   "Removed",
  unchanged: "Unchanged",
};

function ChangeBadge({ type }: { type: FieldChangeType }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${CHANGE_BADGE_STYLES[type]}`}>
      {type === "changed"  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>}
      {type === "added"    && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
      {type === "removed"  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>}
      {CHANGE_BADGE_LABELS[type]}
    </span>
  );
}

// ─── Field value renderer ─────────────────────────────────────────────────────

function FieldValue({
  value,
  highlight,
}: {
  value: unknown;
  highlight?: "red" | "green";
}) {
  const highlightClass =
    highlight === "red"
      ? "text-red-500 dark:text-red-400"
      : highlight === "green"
      ? "text-green-600 dark:text-green-400"
      : "text-foreground";

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic text-sm">None</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(value as unknown[]).map((v, i) => (
          <span
            key={i}
            className={`rounded border border-border px-2 py-0.5 text-sm font-medium ${highlightClass}`}
          >
            {String(v)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <span className={`text-sm font-semibold ${highlightClass}`}>
      {String(value)}
    </span>
  );
}

// ─── Single field diff card ───────────────────────────────────────────────────

function FieldDiffCard({ field }: { field: FieldDiff }) {
  const isChanged  = field.changeType === "changed";
  const isAdded    = field.changeType === "added";
  const isRemoved  = field.changeType === "removed";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Field header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-semibold text-foreground">{field.key}</p>
        <ChangeBadge type={field.changeType} />
      </div>

      {/* Before / After columns */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Before */}
        <div className={`p-4 ${isRemoved ? "bg-red-50/40 dark:bg-red-900/10" : isAdded ? "bg-muted/20" : isChanged ? "bg-red-50/30 dark:bg-red-900/10" : "bg-muted/20"}`}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Before
          </p>
          <FieldValue
            value={field.before}
            highlight={isChanged || isRemoved ? "red" : undefined}
          />
        </div>

        {/* After */}
        <div className={`p-4 ${isAdded ? "bg-green-50/40 dark:bg-green-900/10" : isChanged ? "bg-green-50/30 dark:bg-green-900/10" : isRemoved ? "bg-muted/20" : "bg-muted/20"}`}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            After
          </p>
          <FieldValue
            value={field.after}
            highlight={isChanged || isAdded ? "green" : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function AuditLogViewChangesModal({
  entry,
  onClose,
}: AuditLogViewChangesModalProps) {
  const [showUnchanged, setShowUnchanged] = useState(false);

  const changedFields   = entry.changedFields.filter((f) => f.changeType !== "unchanged");
  const unchangedFields = entry.changedFields.filter((f) => f.changeType === "unchanged");

  const changedCount  = entry.changedFields.filter((f) => f.changeType === "changed").length;
  const addedCount    = entry.changedFields.filter((f) => f.changeType === "added").length;
  const removedCount  = entry.changedFields.filter((f) => f.changeType === "removed").length;

  const visibleFields = showUnchanged
    ? entry.changedFields
    : changedFields;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-4xl space-y-5 pb-10">

        {/* Back button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Audit Logs
        </button>

        {/* ── Header card ── */}
        <div className="rounded-xl border border-border bg-card p-6">

          {/* Top row: title + badge + user */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-foreground">View Changes</h2>
                <AuditLogActionBadge verb={entry.verb} />
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {entry.actionLabel} on{" "}
                <span className="font-semibold text-foreground">{entry.resourceName}</span>{" "}
                <span className="text-muted-foreground">({entry.resourceType})</span>
              </p>
            </div>

            {/* User avatar + name + timestamp */}
            <div className="flex items-center gap-3 sm:text-right">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {entry.user.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{entry.user.name}</p>
                <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
              </div>
            </div>
          </div>

          {/* Change summary + IP */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              {/* Changed */}
              <div className="flex items-center gap-1.5 text-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-yellow-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                <span className="font-semibold text-foreground">{changedCount}</span>
                <span className="text-muted-foreground">changed</span>
              </div>

              {/* Added */}
              <div className="flex items-center gap-1.5 text-sm">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white text-[10px] font-bold">+</span>
                <span className="font-semibold text-foreground">{addedCount}</span>
                <span className="text-muted-foreground">added</span>
              </div>

              {/* Removed */}
              <div className="flex items-center gap-1.5 text-sm">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">−</span>
                <span className="font-semibold text-foreground">{removedCount}</span>
                <span className="text-muted-foreground">removed</span>
              </div>
            </div>

            {/* IP */}
            <span className="font-mono text-xs text-muted-foreground">{entry.ipAddress}</span>
          </div>
        </div>

        {/* ── What changed ── */}
        {visibleFields.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">
              What changed ({changedFields.length})
            </p>
            <div className="space-y-3">
              {visibleFields.map((field) => (
                <FieldDiffCard key={field.key} field={field} />
              ))}
            </div>
          </div>
        )}

        {/* ── No changes (view-only events) ── */}
        {entry.changedFields.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card py-10">
            <p className="text-sm text-muted-foreground">No field changes recorded for this event.</p>
          </div>
        )}

        {/* ── Show unchanged fields toggle ── */}
        {unchangedFields.length > 0 && (
          <button
            onClick={() => setShowUnchanged((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showUnchanged
              ? `Hide ${unchangedFields.length} unchanged fields`
              : `Show ${unchangedFields.length} unchanged fields`}
          </button>
        )}
      </div>
    </div>
  );
}