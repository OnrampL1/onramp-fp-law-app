import { useState, useMemo } from "react";
import { Button } from "../components/ui/button";
import { AuditLogFilters, type AuditLogFilterState } from "../components/audit-log/AuditLogFilters";
import { AuditLogTable } from "../components/audit-log/AuditLogTable";
import { auditLogs } from "../lib/data";

const RETENTION_YEARS = 7;

const DEFAULT_FILTERS: AuditLogFilterState = {
  search:   "",
  user:     "All users",
  action:   "All actions",
  contract: "All contracts",
  time:     "All time",
  severity: "All severities",
};

/**
 * Audit Logs page.
 *
 * Reused from existing codebase:
 *   - Button    (export action)
 *   - Input     (search in AuditLogFilters)
 *   - Card, CardContent (wrapping the table in AuditLogTable)
 *
 * New components (components/audit-log/):
 *   - AuditLogFilters       — search + 5 filter dropdowns
 *   - AuditLogTable         — desktop table / mobile card list + footer
 *   - AuditLogActionBadge   — coloured verb pill
 *   - AuditLogJsonCell      — syntax-highlighted JSON snippet
 *
 * Filtering is done client-side against the mock data.
 * When the backend is ready, replace the useMemo filtering
 * with an API call using the filter state as query params.
 */
export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilterState>(DEFAULT_FILTERS);

  function handleFilterChange(next: Partial<AuditLogFilterState>) {
    setFilters((prev) => ({ ...prev, ...next }));
  }

  // Client-side filtering — swap for API call when backend is ready
  const filtered = useMemo(() => {
    return auditLogs.filter((entry) => {
      const search = filters.search.toLowerCase();

      if (search) {
        const haystack = [
          entry.action,
          entry.resourceName,
          entry.user.name,
          entry.ipAddress,
        ].join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (filters.user !== "All users" && entry.user.name !== filters.user) {
        return false;
      }

      if (filters.action !== "All actions" && entry.verb !== filters.action) {
        return false;
      }

      if (
        filters.contract !== "All contracts" &&
        entry.resourceName !== filters.contract
      ) {
        return false;
      }

      // Time and severity filters are UI stubs — wire to API when backend is ready
      return true;
    });
  }, [filters]);

  function handleExport() {
    // Wire to real export endpoint when backend is ready
    console.log("Export audit logs");
  }

  function handleRefresh() {
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Immutable record of every contract and user action for compliance.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={handleExport}
        >
          {/* Export icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Export Logs
        </Button>
      </div>

      {/* ── Filters ── */}
      <AuditLogFilters
        filters={filters}
        onChange={handleFilterChange}
        onRefresh={handleRefresh}
      />

      {/* ── Table ── */}
      <AuditLogTable
        entries={filtered}
        totalCount={auditLogs.length}
        retentionYears={RETENTION_YEARS}
      />

    </div>
  );
}