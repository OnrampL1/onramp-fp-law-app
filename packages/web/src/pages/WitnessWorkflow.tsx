import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/lib/permissions";
import {
  WitnessWorkflowHeader,
  GenerateWitnessAccessPanel,
  WitnessInvitationsTable,
  WitnessAccessDetailsSidebar,
  RevokeWitnessLinkDialog,
  WitnessReviewProgress,
  SecurityStatusPanel,
  ExpiringLinksPanel,
} from "../components/witness-workflow";
import { SECURITY_FEATURES } from "@/lib/data";
import type { GeneratedLink, AccessActivityItem, ActivityEventType, ReviewStage } from "../components/witness-workflow/types";
import type { WitnessLinkListItem } from "@/types/witness";
import {
  useWitnessLinks,
  useRevokeWitnessLink,
  useResendWitnessLink,
  useWitnessLinkStats,
} from "@/hooks/useWitnessLinks";
import { useAuditLogsList } from "@/hooks/useAuditLogsList";
import { useContractsList } from "@/hooks/useContractsList";
import { fetchAuditLogList } from "@/services/audit-log.service";
import { listUsers } from "@/services/users.service";
import { getActorDisplay } from "@/components/audit-log/AuditLogTable";
import { AUDIT_ACTION_LABELS, type AuditAction, type AuditLogEntry } from "@/types/audit";
import { formatRelativeTime } from "@/lib/utils";
import { KpiCards, type KpiCardItem } from "@/components/dashboard";
import { LinkIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from "../components/shared/icons";

const PAGE_SIZE = 20;
const ACTIVITY_PAGE_SIZE = 5;
// Matches the audit-logs query schema's max page size (packages/api/src/schemas/audit.schemas.ts)
// — same constant AuditLogPage.tsx uses to minimize requests when paging through everything for export.
const EXPORT_PAGE_SIZE = 100;

// No dedicated "expiring soon" filter exists on GET /users/witness-link yet
// (only page/limit/contractId) — this widget scans the newest 100 links
// client-side instead of the paginated table's window. For an org with more
// than 100 witness links, one expiring outside that scan won't surface here.
const EXPIRING_SCAN_LIMIT = 100;
const EXPIRING_WITHIN_MS = 24 * 60 * 60 * 1000;

function isExpiringSoon(item: WitnessLinkListItem): boolean {
  if (item.status !== "pending") return false;
  const msRemaining = new Date(item.expiresAt).getTime() - Date.now();
  return msRemaining > 0 && msRemaining <= EXPIRING_WITHIN_MS;
}

const WITNESS_AUDIT_ACTIONS: AuditAction[] = [
  "WITNESS_INVITATION_CREATED",
  "WITNESS_ACCESSED",
  "WITNESS_INVITATION_REVOKED",
];

const AUDIT_ACTION_TO_EVENT_TYPE: Partial<Record<AuditAction, ActivityEventType>> = {
  WITNESS_INVITATION_CREATED: "link_generated",
  WITNESS_ACCESSED: "witness_accessed",
  WITNESS_INVITATION_REVOKED: "witness_revoked",
};

function sanitizeCsvCell(value: string): string {
  // Prefix values a spreadsheet app would interpret as a formula (=, +, -, @)
  // with a single quote so they're treated as plain text — same guard as
  // AuditLogPage.tsx / UserManagement.tsx's own export functions.
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function WitnessWorkflow() {
  const { user } = useAuth();
  // Set when arriving via a contract's "Generate Witness Link" action
  // (ContractDetails.tsx / ContractRowActions.tsx) so the panel below can
  // pre-select it instead of leaving the contract dropdown empty.
  const [searchParams] = useSearchParams();
  const initialContractId = searchParams.get("contractId");
  const [page, setPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [selectedInvitation, setSelectedInvitation] = useState<WitnessLinkListItem | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<WitnessLinkListItem | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const linksQuery = useWitnessLinks({ page, limit: PAGE_SIZE });
  // Separate, broader query backing the Expiring Links widget — see the
  // EXPIRING_SCAN_LIMIT comment above for its known blind spot.
  const expiringScanQuery = useWitnessLinks({ page: 1, limit: EXPIRING_SCAN_LIMIT });
  const statsQuery = useWitnessLinkStats();
  const activityQuery = useAuditLogsList(user?.organizationId, {
    action: WITNESS_AUDIT_ACTIONS,
    page: activityPage,
    limit: ACTIVITY_PAGE_SIZE,
  });
  // Only used to resolve contractId -> title for the activity feed's
  // subLabel — same 50-contract cap/caveat as AuditLogPage's own lookup.
  const contractsQuery = useContractsList({
    sortBy: "title",
    sortDirection: "asc",
    page: 1,
    pageSize: 50,
  });
  // Only used to resolve actorUserId -> name for the activity export —
  // same lookup AuditLogPage.tsx builds for its own export/table.
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const revokeWitnessLink = useRevokeWitnessLink();
  const resendWitnessLink = useResendWitnessLink();

  const invitations = linksQuery.data?.items ?? [];
  const expiringLinks = useMemo(
    () => (expiringScanQuery.data?.items ?? []).filter(isExpiringSoon),
    [expiringScanQuery.data],
  );

  const contractsById = useMemo(
    () => new Map((contractsQuery.data?.items ?? []).map((c) => [c.id, c])),
    [contractsQuery.data],
  );
  const usersById = useMemo(
    () => new Map((users ?? []).map((u) => [u.id, u])),
    [users],
  );

  const activityItems: AccessActivityItem[] = useMemo(
    () =>
      (activityQuery.data?.items ?? []).map((entry) => ({
        id: entry.id,
        eventType: AUDIT_ACTION_TO_EVENT_TYPE[entry.action] ?? "link_generated",
        label: AUDIT_ACTION_LABELS[entry.action],
        subLabel: `${
          (entry.contractId && contractsById.get(entry.contractId)?.title) ?? "Unknown contract"
        } · ${entry.targetDisplayName ?? "Unknown witness"}`,
        time: formatRelativeTime(entry.createdAt),
      })),
    [activityQuery.data, contractsById],
  );

  const stats = statsQuery.data;

  // Real counts from GET /users/witness-link/stats — the *NewLast7Days
  // fields are new-occurrence counts (no historical snapshotting exists),
  // so every delta here reads as growth, never a good/bad comparison.
  const kpiItems: KpiCardItem[] = stats
    ? [
        {
          icon: <LinkIcon className="h-4 w-4" />,
          value: stats.active,
          label: "Active Witness Links",
          sublabel: "new this week",
          delta: `+${stats.totalNewLast7Days}`,
          deltaPositive: true,
        },
        {
          icon: <ClockIcon className="h-4 w-4" />,
          value: stats.pending,
          label: "Pending Reviews",
          sublabel: "awaiting witness",
        },
        {
          icon: <CheckCircleIcon className="h-4 w-4" />,
          value: stats.usedThisMonth,
          label: "Completed Reviews",
          sublabel: "this month",
          delta: `+${stats.usedLast7Days}`,
          deltaPositive: true,
        },
        {
          icon: <XCircleIcon className="h-4 w-4" />,
          value: stats.expired,
          label: "Expired Links",
          sublabel: "newly expired this week",
          delta: `+${stats.expiredNewLast7Days}`,
          deltaPositive: true,
        },
      ]
    : [];

  const reviewStages: ReviewStage[] = stats
    ? [
        {
          stage: 1,
          icon: <LinkIcon className="h-4 w-4" />,
          label: "Issued",
          count: stats.total,
          pct: 100,
        },
        {
          stage: 2,
          icon: <CheckCircleIcon className="h-4 w-4" />,
          label: "Used",
          count: stats.used,
          pct: stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0,
        },
        {
          stage: 3,
          icon: <XCircleIcon className="h-4 w-4" />,
          label: "Expired / Revoked",
          count: stats.expired + stats.revoked,
          pct: stats.total > 0 ? Math.round(((stats.expired + stats.revoked) / stats.total) * 100) : 0,
        },
      ]
    : [];

  function handleRefresh() {
    setGeneratedLink(null);
    setRefreshKey((prev) => prev + 1);
    linksQuery.refetch();
    expiringScanQuery.refetch();
    statsQuery.refetch();
    activityQuery.refetch();
  }

  // Exports every witness-activity entry matching the feed's filter, not
  // just the current 5-item page — pages through the list endpoint at its
  // max page size until nothing's left, same approach as AuditLogPage.tsx.
  async function fetchAllWitnessActivity(organizationId: string): Promise<AuditLogEntry[]> {
    const allEntries: AuditLogEntry[] = [];
    let fetchPage = 1;
    let totalPages = 1;

    do {
      const result = await fetchAuditLogList(organizationId, {
        action: WITNESS_AUDIT_ACTIONS,
        page: fetchPage,
        limit: EXPORT_PAGE_SIZE,
      });
      allEntries.push(...result.items);
      totalPages = result.pagination.totalPages;
      fetchPage += 1;
    } while (fetchPage <= totalPages);

    return allEntries;
  }

  async function handleExport() {
    if (!user?.organizationId || isExporting) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const allEntries = await fetchAllWitnessActivity(user.organizationId);

      const headers = ["Timestamp", "Action", "Contract", "Witness", "Actor", "IP Address"];

      const rows = allEntries.map((entry) => {
        const actor = getActorDisplay(entry, usersById);
        const contractTitle =
          (entry.contractId && contractsById.get(entry.contractId)?.title) ?? "Unknown contract";

        return [
          entry.createdAt,
          AUDIT_ACTION_LABELS[entry.action],
          contractTitle,
          entry.targetDisplayName ?? "Unknown witness",
          actor.name,
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
      link.download = "witness-activity.csv";
      link.click();

      URL.revokeObjectURL(url);
    } catch {
      setExportError("Couldn't export witness activity. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function handleRequestRevoke(invitation: WitnessLinkListItem) {
    setRevokeTarget(invitation);
    setRevokeDialogOpen(true);
  }

  function handleConfirmRevoke(invitation: WitnessLinkListItem) {
    // useRevokeWitnessLink already invalidates the shared witness-links and
    // stats query keys on success — those refetch on their own. The audit
    // activity feed is a separate query key (owned by the general audit
    // system), so it's refetched explicitly here.
    revokeWitnessLink.mutate(invitation.id, {
      onSuccess: () => {
        setSelectedInvitation(null);
        activityQuery.refetch();
      },
    });
  }

  function handleResend(invitation: WitnessLinkListItem) {
    // Resends aren't audit-logged (mirrors POST /invitations/:id/resend, see
    // witness.service.ts's resendWitnessLink), so there's no activity feed
    // entry to refetch here — only close the sidebar so the table's own
    // useWitnessLinks refetch (triggered by useResendWitnessLink's query
    // invalidation) is what the admin sees the new expiry/email-sent state in.
    resendWitnessLink.mutate(invitation.id, {
      onSuccess: () => setSelectedInvitation(null),
    });
  }

  // GET /users/witness-link and the revoke endpoint are both Owner/Admin-only
  // server-side (witness.routes.ts) — same reasoning as Audit Logging. This
  // is a client-side guard so an INTERNAL user sees a clear message instead
  // of a table stuck on a failed-fetch error state.
  if (!isAdminRole(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card py-20 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="font-medium text-foreground">Access restricted</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Witness link management is available to the organization Owner and Administrators only.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-10">
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <WitnessWorkflowHeader
          onExport={handleExport}
          isExporting={isExporting}
          exportError={exportError}
          onRefresh={handleRefresh}
        />

        {/* ── KPI stat cards ───────────────────────────────────────────────── */}
        <KpiCards items={kpiItems} />

        {/* ── Generate witness access (inline panel) ───────────────────────── */}
        <GenerateWitnessAccessPanel
          generatedLink={generatedLink}
          onLinkGenerated={setGeneratedLink}
          refreshKey={refreshKey}
          initialContractId={initialContractId}
        />

        {/* ── Active witness invitations ───────────────────────────────────── */}
        <WitnessInvitationsTable
          invitations={invitations}
          isLoading={linksQuery.isLoading}
          isError={linksQuery.isError}
          onRetry={() => linksQuery.refetch()}
          pagination={linksQuery.data?.pagination}
          onPageChange={setPage}
          onRowClick={setSelectedInvitation}
        />

        {/* ── Review progress + access activity tabs ───────────────────────── */}
        <WitnessReviewProgress
          stages={reviewStages}
          activityItems={activityItems}
          activityIsLoading={activityQuery.isLoading}
          activityIsError={activityQuery.isError}
          onActivityRetry={() => activityQuery.refetch()}
          activityPagination={activityQuery.data?.pagination}
          onActivityPageChange={setActivityPage}
        />

        {/* ── Security status ──────────────────────────────────────────────── */}
        <SecurityStatusPanel features={SECURITY_FEATURES} />

        {/* ── Expiring links warning ───────────────────────────────────────── */}
        <ExpiringLinksPanel links={expiringLinks} onRevoke={handleRequestRevoke} />
      </div>

      {/* ── Sidebar + blur overlay ───────────────────────────────────────── */}
      <WitnessAccessDetailsSidebar
        invitation={selectedInvitation}
        onClose={() => setSelectedInvitation(null)}
        onRevoke={handleRequestRevoke}
        onResend={handleResend}
        isResending={resendWitnessLink.isPending}
      />

      {/* ── Revoke confirmation ──────────────────────────────────────────── */}
      <RevokeWitnessLinkDialog
        invitation={revokeTarget}
        open={revokeDialogOpen}
        onOpenChange={setRevokeDialogOpen}
        onConfirm={handleConfirmRevoke}
        isPending={revokeWitnessLink.isPending}
      />
    </>
  );
}
