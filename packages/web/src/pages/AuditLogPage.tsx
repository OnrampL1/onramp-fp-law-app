import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ScrollText, ShieldAlert } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { AuditLogFilters } from "../components/audit-log/AuditLogFilters";
import {
  AuditLogTable,
  getActorDisplay,
  getTargetDisplay,
  humanizeTargetType,
} from "../components/audit-log/AuditLogTable";
import { useAuditLogFilters } from "../hooks/useAuditLogFilters";
import { useAuditLogsList } from "../hooks/useAuditLogsList";
import { useContractsList } from "../hooks/useContractsList";
import { useAuth } from "../hooks/useAuth";
import { isAdminRole } from "../lib/permissions";
import { listUsers } from "../services/users.service";
import { fetchAuditLogList } from "../services/audit-log.service";
import { AUDIT_ACTION_LABELS, type AuditLogEntry } from "../types/audit";

// The audit-logs query schema's max page size (packages/api/src/schemas/audit.schemas.ts)
// — used to minimize the number of requests when paging through everything for export.
const EXPORT_PAGE_SIZE = 100;

const RETENTION_YEARS = 7;

/**
 * Audit Logs page.
 *
 * Owner/Admin oversight only (Domain & Business Rules, Section 10) — the
 * backend already 403s everyone else (GET /organizations/:id/audit-logs),
 * this is a client-side guard so INTERNAL users see a clear message
 * instead of a failed fetch.
 */
export function AuditLogPage() {
  const { user } = useAuth();
  const filters = useAuditLogFilters();

  const { data: users } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  // 50 is the contracts list endpoint's actual max page size
  // (contract.schemas.ts MAX_PAGE_SIZE) — requesting more 422s the whole
  // query, which was silently emptying this lookup map entirely.
  const { data: contractsData } = useContractsList({
    sortBy: "title",
    sortDirection: "asc",
    page: 1,
    pageSize: 50,
  });

  const usersById = useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u])),
    [users],
  );
  const contracts = contractsData?.items ?? [];
  const contractsById = useMemo(
    () => new Map(contracts.map((c) => [c.id, c])),
    [contracts],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useAuditLogsList(user?.organizationId, filters.queryParams);

  const entries = data?.items ?? [];
  const pagination = data?.pagination;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function sanitizeCsvCell(value: string): string {
    // Prefix values that a spreadsheet app would interpret as a formula
    // (=, +, -, @) with a single quote so they're treated as plain text.
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
  }

  // Exports every entry matching the current filters, not just the page
  // currently loaded in the table — pages through the list endpoint at the
  // schema's max page size until there's nothing left to fetch.
  async function fetchAllMatchingEntries(organizationId: string): Promise<AuditLogEntry[]> {
    const allEntries: AuditLogEntry[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const result = await fetchAuditLogList(organizationId, {
        ...filters.queryParams,
        page,
        limit: EXPORT_PAGE_SIZE,
      });
      allEntries.push(...result.items);
      totalPages = result.pagination.totalPages;
      page += 1;
    } while (page <= totalPages);

    return allEntries;
  }

  async function handleExport() {
    if (!user?.organizationId || isExporting) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const allEntries = await fetchAllMatchingEntries(user.organizationId);

      const headers = [
        "Timestamp",
        "Actor",
        "Action",
        "Target",
        "Target ID",
        "Before",
        "After",
        "IP Address",
      ];

      const rows = allEntries.map((entry) => {
        const actor = getActorDisplay(entry, usersById);
        const target = getTargetDisplay(entry, contractsById);

        return [
          entry.createdAt,
          actor.name,
          AUDIT_ACTION_LABELS[entry.action],
          target.detailIsId ? humanizeTargetType(entry.targetEntityType) : target.name,
          entry.targetEntityId,
          entry.oldValue ? JSON.stringify(entry.oldValue) : "",
          entry.newValue ? JSON.stringify(entry.newValue) : "",
          entry.ipAddress ?? "",
        ];
      });

      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => sanitizeCsvCell(String(cell)))
            .map((cell) => `"${cell.replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "audit-logs.csv";
      link.click();

      URL.revokeObjectURL(url);
    } catch {
      setExportError("Couldn't export the audit log. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  if (!isAdminRole(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card py-20 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="font-medium text-foreground">Access restricted</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          The audit trail is available to the organization Owner and Administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScrollText className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Immutable record of every contract and user action for compliance.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="size-4" aria-hidden="true" />
            {isExporting ? "Exporting…" : "Export Logs"}
          </Button>
          {exportError && (
            <p className="text-xs text-destructive">{exportError}</p>
          )}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <AuditLogFilters
          actorUserId={filters.actorUserId}
          action={filters.action}
          contractId={filters.contractId}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          filtersActive={filters.filtersActive}
          users={users ?? []}
          contracts={contracts}
          onActorUserIdChange={filters.setActorUserId}
          onActionChange={filters.setAction}
          onContractIdChange={filters.setContractId}
          onDateFromChange={filters.setDateFrom}
          onDateToChange={filters.setDateTo}
          onReset={filters.resetFilters}
        />

        <AuditLogTable
          entries={entries}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          usersById={usersById}
          contractsById={contractsById}
          pagination={pagination}
          onPageChange={filters.setPage}
        />
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Retention: {RETENTION_YEARS} years
      </p>
    </div>
  );
}
