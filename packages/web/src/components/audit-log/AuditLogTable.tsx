import { useState } from "react";
import { AlertCircle, ScrollText } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../ui/button";
import { AuditLogActionBadge } from "./AuditLogActionBadge";
import { AuditLogViewChangesModal } from "./AuditLogViewChangesModal";
import { AuditLogPagination } from "./AuditLogPagination";
import {
  AUDIT_ACTION_GROUP,
  AUDIT_ACTION_LABELS,
  type AuditActionGroup,
} from "../../types/audit";
import type { AuditLogEntry, AuditLogPaginationMeta } from "../../types/audit";
import type { ApiUser } from "../../services/users.service";
import type { ContractListItem } from "../../types/contracts";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  usersById: Map<string, ApiUser>;
  contractsById: Map<string, ContractListItem>;
  pagination?: AuditLogPaginationMeta;
  onPageChange: (page: number) => void;
}

const TABLE_HEADERS = [
  "Timestamp",
  "Actor",
  "Action",
  "Target",
  "Before",
  "After",
  "IP Address",
  "",
] as const;

// ─── Actor / target display helpers ────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getActorDisplay(
  entry: AuditLogEntry,
  usersById: Map<string, ApiUser>,
) {
  if (entry.actorType === "PLATFORM_USER") {
    return { name: "Platform Support", initials: "PS" };
  }
  if (entry.actorType === "SYSTEM") {
    return { name: "System", initials: "SY" };
  }
  const user = entry.actorUserId ? usersById.get(entry.actorUserId) : undefined;
  if (!user) {
    return { name: "Unknown user", initials: "?" };
  }
  return { name: user.fullName, initials: getInitials(user.fullName) };
}

// Known targetEntityType values written by the backend (see write call
// sites and audit.service.ts's TARGET_RESOLVERS) — spaced out for display.
// Anything not listed here (a future domain's target type) still gets a
// readable label via the regex fallback instead of showing raw PascalCase.
const TARGET_TYPE_LABELS: Record<string, string> = {
  Organization: "Organization",
  User: "User",
  Invitation: "Invitation",
  Contract: "Contract",
  Note: "Note",
  WitnessInvitation: "Witness Invitation",
  AIAnalysis: "AI Analysis",
};

export function humanizeTargetType(type: string): string {
  return (
    TARGET_TYPE_LABELS[type] ?? type.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  );
}

interface TargetDisplay {
  name: string;
  detail: string;
  detailIsId?: boolean;
}

export function getTargetDisplay(
  entry: AuditLogEntry,
  contractsById: Map<string, ContractListItem>,
): TargetDisplay {
  // Server-resolved label takes priority (see audit.service.ts's
  // targetEntityType-keyed resolver registry). Contract has its own
  // resolution path via contractId + the contracts list already loaded
  // for the filter dropdown, since that lookup predates and doesn't need
  // a server round trip. Anything else with no resolver yet has no name to
  // show — lead with the entity type instead of a meaningless id fragment,
  // and keep the id available but de-emphasized underneath, since it's
  // still the only way to look the record up directly.
  if (entry.targetDisplayName) {
    return {
      name: entry.targetDisplayName,
      detail: humanizeTargetType(entry.targetEntityType),
    };
  }
  if (entry.contractId) {
    const contract = contractsById.get(entry.contractId);
    if (contract) {
      return { name: contract.title, detail: "Contract" };
    }
  }
  return {
    name: humanizeTargetType(entry.targetEntityType),
    detail: `${entry.targetEntityId.slice(0, 8)}…`,
    detailIsId: true,
  };
}

// ─── Action icon — one per domain group ────────────────────────────────────

const GROUP_ICON_BG: Record<AuditActionGroup, string> = {
  Organization:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  User: "bg-blue-100   text-blue-600   dark:bg-blue-900/30   dark:text-blue-400",
  Contract:
    "bg-green-100  text-green-600  dark:bg-green-900/30  dark:text-green-400",
  Note: "bg-teal-100   text-teal-600   dark:bg-teal-900/30   dark:text-teal-400",
  Witness:
    "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  AI: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  Platform: "bg-muted text-muted-foreground",
};

const GROUP_ICON_PATH: Record<AuditActionGroup, string> = {
  Organization:
    "M2.25 21h19.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  User: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  Contract:
    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  Note: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z",
  Witness:
    "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  AI: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
  Platform:
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
};

function ActionIcon({ group }: { group: AuditActionGroup }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${GROUP_ICON_BG[group]}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-3.5 w-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={GROUP_ICON_PATH[group]}
        />
      </svg>
    </span>
  );
}

// ─── Key-value cell ─────────────────────────────────────────────────────────

const MAX_VISIBLE = 2;

function AuditDataCell({ data }: { data: Record<string, unknown> | null }) {
  if (!data) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const entries = Object.entries(data);
  const visible = entries.slice(0, MAX_VISIBLE);
  const remaining = entries.length - MAX_VISIBLE;

  return (
    <div className="space-y-1.5">
      {visible.map(([key, value]) => (
        <div key={key}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {key}
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {Array.isArray(value)
              ? (value as unknown[]).join(", ")
              : String(value)}
          </p>
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground">
          +{remaining} more fields
        </p>
      )}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main table ───────────────────────────────────────────────────────────

export function AuditLogTable({
  entries,
  isLoading,
  isError,
  onRetry,
  usersById,
  contractsById,
  pagination,
  onPageChange,
}: AuditLogTableProps) {
  const [activeEntry, setActiveEntry] = useState<AuditLogEntry | null>(null);

  return (
    <>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          {/*
            max-h + overflow-auto (not overflow-x-auto) is required, not
            cosmetic: overflow-x-auto alone makes the browser implicitly
            compute overflow-y as auto too (CSS Overflow spec), which
            silently makes THIS div the sticky containing block instead of
            the page's scroll container. Since it had no bounded height it
            never actually scrolled, so `sticky top-0` on the header cells
            never visibly engaged. Giving it a real max-height makes it a
            genuine scroll container so stickiness has something to stick
            against.
          */}
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {TABLE_HEADERS.map((h, i) => (
                    <th
                      key={i}
                      className="sticky top-0 z-10 whitespace-nowrap bg-muted px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={TABLE_HEADERS.length}
                      className="py-14 text-center text-sm text-muted-foreground"
                    >
                      Loading audit logs...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={TABLE_HEADERS.length}>
                      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                        <AlertCircle className="size-6 text-destructive" />
                        <p className="text-sm text-muted-foreground">
                          We couldn't load audit logs. Please try again.
                        </p>
                        <Button variant="outline" size="sm" onClick={onRetry}>
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_HEADERS.length}>
                      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <ScrollText className="size-6" />
                        </div>
                        <p className="font-medium text-foreground">
                          No audit events found
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your filters to find what you're looking
                          for.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <AuditLogRow
                      key={entry.id}
                      entry={entry}
                      usersById={usersById}
                      contractsById={contractsById}
                      onViewChanges={() => setActiveEntry(entry)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.total > 0 && (
            <AuditLogPagination
              pagination={pagination}
              onPageChange={onPageChange}
            />
          )}
        </CardContent>
      </Card>

      {activeEntry && (
        <AuditLogViewChangesModal
          entry={activeEntry}
          actor={getActorDisplay(activeEntry, usersById)}
          target={getTargetDisplay(activeEntry, contractsById)}
          onClose={() => setActiveEntry(null)}
        />
      )}
    </>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  entry: AuditLogEntry;
  usersById: Map<string, ApiUser>;
  contractsById: Map<string, ContractListItem>;
  onViewChanges: () => void;
}

function AuditLogRow({
  entry,
  usersById,
  contractsById,
  onViewChanges,
}: RowProps) {
  const actor = getActorDisplay(entry, usersById);
  const target = getTargetDisplay(entry, contractsById);
  const group = AUDIT_ACTION_GROUP[entry.action];

  return (
    <tr className="align-top transition-colors hover:bg-muted/20">
      <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
        {formatTimestamp(entry.createdAt)}
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {actor.initials}
          </div>
          <p className="whitespace-nowrap text-sm font-semibold text-foreground">
            {actor.name}
          </p>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-start gap-2">
          <ActionIcon group={group} />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {AUDIT_ACTION_LABELS[entry.action]}
            </p>
            <AuditLogActionBadge group={group} className="mt-1" />
          </div>
        </div>
      </td>

      <td className="max-w-[200px] px-4 py-4">
        <p className="truncate whitespace-nowrap text-sm font-semibold text-foreground">
          {target.name}
        </p>
        <p
          className={
            target.detailIsId
              ? "font-mono text-[10px] font-light text-muted-foreground"
              : "text-xs text-muted-foreground"
          }
        >
          {target.detail}
        </p>
      </td>

      <td className="w-44 px-4 py-4">
        <AuditDataCell data={entry.oldValue} />
      </td>

      <td className="w-44 px-4 py-4">
        <AuditDataCell data={entry.newValue} />
      </td>

      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-muted-foreground">
        {entry.ipAddress ?? "—"}
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        <button
          onClick={onViewChanges}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
        >
          View changes
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
}
