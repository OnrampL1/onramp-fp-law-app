import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ShieldAlert } from "lucide-react";
import { Button } from "../components/ui/button";
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
import { AUDIT_ACTION_LABELS } from "../types/audit";

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

  function sanitizeCsvCell(value: string): string {
    // Prefix values that a spreadsheet app would interpret as a formula
    // (=, +, -, @) with a single quote so they're treated as plain text.
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
  }

  function handleExport() {
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

    const rows = entries.map((entry) => {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Immutable record of every contract and user action for compliance.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={handleExport}
        >
          <Download className="size-4" aria-hidden="true" />
          Export Logs
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
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
      </div>

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

      <p className="text-center text-xs text-muted-foreground">
        Retention: {RETENTION_YEARS} years
      </p>
    </div>
  );
}
