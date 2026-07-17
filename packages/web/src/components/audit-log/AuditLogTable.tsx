import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { AuditLogActionBadge } from "./AuditLogActionBadge";
import { AuditLogViewChangesModal } from "./AuditLogViewChangesModal";
import type { AuditLogEntry } from "../../lib/data";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  totalCount: number;
  retentionYears: number;
}

const TABLE_HEADERS = [
  "Timestamp",
  "User",
  "Action",
  "Resource",
  "Before",
  "After",
  "IP Address",
  "",            // View changes column — no header
] as const;

// ─── Action icon ──────────────────────────────────────────────────────────────

function ActionIcon({ action }: { action: AuditLogEntry["action"] }) {
  const configs: Record<AuditLogEntry["action"], { bg: string; icon: React.ReactNode }> = {
    "contract.clause.updated": {
      bg: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>,
    },
    "auth.session.created": {
      bg: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>,
    },
    "contract.created": {
      bg: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    },
    "user.role.changed": {
      bg: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
    },
    "report.exported": {
      bg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
    },
    "auth.login.failed": {
      bg: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>,
    },
    "contract.viewed": {
      bg: "bg-muted text-muted-foreground",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    "contract.deleted": {
      bg: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
    },
    "user.invited": {
      bg: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>,
    },
    "contract.exported": {
      bg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
    },
  };
  const cfg = configs[action];
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${cfg.bg}`}>
      {cfg.icon}
    </span>
  );
}

// ─── Key-value cell — replaces AuditLogJsonCell ───────────────────────────────

const MAX_VISIBLE = 2;

function AuditDataCell({ data }: { data: Record<string, unknown> | null }) {
  if (!data) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const entries   = Object.entries(data);
  const visible   = entries.slice(0, MAX_VISIBLE);
  const remaining = entries.length - MAX_VISIBLE;

  return (
    <div className="space-y-1.5">
      {/* Label: BEFORE or AFTER heading (rendered by parent, not here) */}
      {visible.map(([key, value]) => (
        <div key={key}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{key}</p>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {Array.isArray(value)
              ? (value as unknown[]).join(", ")
              : String(value)}
          </p>
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground">+{remaining} more fields</p>
      )}
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

/**
 * Audit log entries table.
 *
 * Desktop (xl+): full 8-column table.
 *   - User column: avatar initials + name + location
 *   - Action column: icon + human-readable label + verb badge
 *   - Before/After: stacked key-value pairs (max 2 visible + overflow count)
 *   - Last column: "View changes →" button opening the modal
 *
 * Mobile: stacked card list.
 * Footer: entry count + retention period.
 */
export function AuditLogTable({ entries, totalCount, retentionYears }: AuditLogTableProps) {
  const [activeEntry, setActiveEntry] = useState<AuditLogEntry | null>(null);

  return (
    <>
      <Card>
        <CardContent className="p-0">

          {/* ── Desktop table ── */}
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {TABLE_HEADERS.map((h, i) => (
                    <th
                      key={i}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <AuditLogRow
                    key={entry.id}
                    entry={entry}
                    onViewChanges={() => setActiveEntry(entry)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile / tablet card list ── */}
          <ul className="divide-y divide-border xl:hidden">
            {entries.map((entry) => (
              <AuditLogCard
                key={entry.id}
                entry={entry}
                onViewChanges={() => setActiveEntry(entry)}
              />
            ))}
          </ul>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              Showing <span className="font-medium text-foreground">{entries.length}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> events
            </span>
            <span>Retention: {retentionYears} years</span>
          </div>
        </CardContent>
      </Card>

      {/* ── View Changes modal ── */}
      {activeEntry && (
        <AuditLogViewChangesModal
          entry={activeEntry}
          onClose={() => setActiveEntry(null)}
        />
      )}
    </>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

interface RowProps {
  entry: AuditLogEntry;
  onViewChanges: () => void;
}

function AuditLogRow({ entry, onViewChanges }: RowProps) {
  return (
    <tr className="align-top transition-colors hover:bg-muted/20">

      {/* Timestamp */}
      <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
        {entry.timestamp}
      </td>

      {/* User — avatar + name + location */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {entry.user.initials}
          </div>
          <div>
            <p className="whitespace-nowrap text-sm font-semibold text-foreground">{entry.user.name}</p>
            <p className="text-xs text-muted-foreground">{entry.user.location}</p>
          </div>
        </div>
      </td>

      {/* Action — icon + human-readable label + verb badge */}
      <td className="px-4 py-4">
        <div className="flex items-start gap-2">
          <ActionIcon action={entry.action} />
          <div>
            <p className="text-sm font-semibold text-foreground">{entry.actionLabel}</p>
            <AuditLogActionBadge verb={entry.verb} className="mt-1" />
          </div>
        </div>
      </td>

      {/* Resource */}
      <td className="px-4 py-4">
        <p className="whitespace-nowrap text-sm font-semibold text-foreground">{entry.resourceName}</p>
        <p className="text-xs text-muted-foreground">{entry.resourceType}</p>
      </td>

      {/* Before */}
      <td className="w-44 px-4 py-4">
        {entry.before && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Before
          </p>
        )}
        <AuditDataCell data={entry.before} />
      </td>

      {/* After */}
      <td className="w-44 px-4 py-4">
        {entry.after && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            After
          </p>
        )}
        <AuditDataCell data={entry.after} />
      </td>

      {/* IP Address */}
      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-muted-foreground">
        {entry.ipAddress}
      </td>

      {/* View changes */}
      <td className="whitespace-nowrap px-4 py-4">
        <button
          onClick={onViewChanges}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
        >
          View changes
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function AuditLogCard({ entry, onViewChanges }: RowProps) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4">

      {/* Top: action icon + label + badge + timestamp */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ActionIcon action={entry.action} />
          <div>
            <p className="text-sm font-semibold text-foreground">{entry.actionLabel}</p>
            <AuditLogActionBadge verb={entry.verb} className="mt-0.5" />
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{entry.timestamp}</span>
      </div>

      {/* User + resource + IP */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
            {entry.user.initials}
          </div>
          <span className="font-medium text-foreground">{entry.user.name}</span>
          <span className="text-muted-foreground">· {entry.user.location}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Resource </span>
          <span className="font-medium text-foreground">{entry.resourceName}</span>
          <span className="text-muted-foreground"> · {entry.resourceType}</span>
        </div>
        <span className="font-mono text-muted-foreground">{entry.ipAddress}</span>
      </div>

      {/* Before / After key-value */}
      {(entry.before || entry.after) && (
        <div className="grid grid-cols-2 gap-3">
          {entry.before && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Before</p>
              <AuditDataCell data={entry.before} />
            </div>
          )}
          {entry.after && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">After</p>
              <AuditDataCell data={entry.after} />
            </div>
          )}
        </div>
      )}

      {/* View changes button */}
      <button
        onClick={onViewChanges}
        className="self-start inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
      >
        View changes
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </li>
  );
}