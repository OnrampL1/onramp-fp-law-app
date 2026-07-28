import { useState, useEffect, useMemo } from "react";
import { AuditLogActionBadge } from "./AuditLogActionBadge";
import { AUDIT_ACTION_GROUP, AUDIT_ACTION_LABELS } from "../../types/audit";
import type { AuditLogEntry } from "../../types/audit";

type FieldChangeType = "changed" | "added" | "removed" | "unchanged";

interface FieldDiff {
  key: string;
  changeType: FieldChangeType;
  before: unknown;
  after: unknown;
}

interface AuditLogViewChangesModalProps {
  entry: AuditLogEntry;
  actor: { name: string; initials: string };
  target: { name: string; detail: string; detailIsId?: boolean };
  onClose: () => void;
}

// Real oldValue/newValue are usually single-field changes (e.g. just
// `{ role: "ADMIN" }`), not the rich multi-field diffs mock data had —
// this derives whatever fields are actually present instead of assuming a
// fixed shape.
function computeFieldDiffs(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
): FieldDiff[] {
  const keys = new Set([
    ...Object.keys(oldValue ?? {}),
    ...Object.keys(newValue ?? {}),
  ]);

  return Array.from(keys).map((key) => {
    const hasBefore = oldValue !== null && key in oldValue;
    const hasAfter = newValue !== null && key in newValue;
    const before = hasBefore ? oldValue![key] : undefined;
    const after = hasAfter ? newValue![key] : undefined;

    let changeType: FieldChangeType;
    if (!hasBefore && hasAfter) {
      changeType = "added";
    } else if (hasBefore && !hasAfter) {
      changeType = "removed";
    } else if (JSON.stringify(before) !== JSON.stringify(after)) {
      changeType = "changed";
    } else {
      changeType = "unchanged";
    }

    return { key, changeType, before, after };
  });
}

// ─── Lock body scroll while modal is open ────────────────────────────────────

function useLockBodyScroll() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
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
      {type === "changed" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      )}
      {type === "added" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      )}
      {type === "removed" && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
        </svg>
      )}
      {CHANGE_BADGE_LABELS[type]}
    </span>
  );
}

// ─── Field value renderer ─────────────────────────────────────────────────────

function FieldValue({ value, highlight }: { value: unknown; highlight?: "red" | "green" }) {
  const highlightClass =
    highlight === "red"   ? "text-red-500 dark:text-red-400" :
    highlight === "green" ? "text-green-600 dark:text-green-400" :
    "text-foreground";

  if (value === null || value === undefined) {
    return <span className="text-sm italic text-muted-foreground">None</span>;
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

  if (typeof value === "object") {
    return (
      <span className={`text-sm font-semibold ${highlightClass}`}>
        {JSON.stringify(value)}
      </span>
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
  const isChanged = field.changeType === "changed";
  const isAdded   = field.changeType === "added";
  const isRemoved = field.changeType === "removed";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-semibold text-foreground">{field.key}</p>
        <ChangeBadge type={field.changeType} />
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className={`p-4 ${isRemoved || isChanged ? "bg-red-50/40 dark:bg-red-900/10" : "bg-muted/20"}`}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Before</p>
          <FieldValue value={field.before} highlight={isChanged || isRemoved ? "red" : undefined} />
        </div>
        <div className={`p-4 ${isAdded || isChanged ? "bg-green-50/40 dark:bg-green-900/10" : "bg-muted/20"}`}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">After</p>
          <FieldValue value={field.after} highlight={isChanged || isAdded ? "green" : undefined} />
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function AuditLogViewChangesModal({ entry, actor, target, onClose }: AuditLogViewChangesModalProps) {
  useLockBodyScroll();

  const [showUnchanged, setShowUnchanged] = useState(false);

  const allFields = useMemo(
    () => computeFieldDiffs(entry.oldValue, entry.newValue),
    [entry.oldValue, entry.newValue],
  );

  const changedFields   = allFields.filter((f) => f.changeType !== "unchanged");
  const unchangedFields = allFields.filter((f) => f.changeType === "unchanged");
  const changedCount    = allFields.filter((f) => f.changeType === "changed").length;
  const addedCount      = allFields.filter((f) => f.changeType === "added").length;
  const removedCount    = allFields.filter((f) => f.changeType === "removed").length;

  const visibleFields = showUnchanged ? allFields : changedFields;
  const group = AUDIT_ACTION_GROUP[entry.action];
  const timestamp = new Date(entry.createdAt).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="w-full max-w-4xl space-y-5 px-4 py-10">

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-foreground">View Changes</h2>
                  <AuditLogActionBadge group={group} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {AUDIT_ACTION_LABELS[entry.action]} on{" "}
                  <span className="font-semibold text-foreground">{target.name}</span>{" "}
                  <span
                    className={target.detailIsId ? "font-mono text-muted-foreground" : "text-muted-foreground"}
                  >
                    ({target.detail})
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {actor.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{actor.name}</p>
                  <p className="text-xs text-muted-foreground">{timestamp}</p>
                </div>
              </div>
            </div>

            {/* Change summary */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-yellow-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  <span className="font-semibold text-foreground">{changedCount}</span>
                  <span className="text-muted-foreground">changed</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">+</span>
                  <span className="font-semibold text-foreground">{addedCount}</span>
                  <span className="text-muted-foreground">added</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">−</span>
                  <span className="font-semibold text-foreground">{removedCount}</span>
                  <span className="text-muted-foreground">removed</span>
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{entry.ipAddress ?? "—"}</span>
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

          {/* ── No changes recorded — degrade gracefully instead of assuming a rich diff ── */}
          {allFields.length === 0 && (
            <div className="flex items-center justify-center rounded-lg border border-border bg-card py-10">
              <p className="text-sm text-muted-foreground">No field changes recorded for this event.</p>
            </div>
          )}

          {/* ── Show unchanged toggle ── */}
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
    </>
  );
}
