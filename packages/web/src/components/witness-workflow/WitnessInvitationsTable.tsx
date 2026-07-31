import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { AlertCircle, MailCheck, Mail } from "lucide-react";
import { WitnessStatusBadge } from "./WitnessStatusBadge";
import { WitnessLinksPagination } from "./WitnessLinksPagination";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { WitnessLinkListItem, WitnessLinkListPaginationMeta } from "@/types/witness";

interface WitnessInvitationsTableProps {
  invitations: WitnessLinkListItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  pagination?: WitnessLinkListPaginationMeta;
  onPageChange: (page: number) => void;
  onRowClick: (invitation: WitnessLinkListItem) => void;
}

const TABLE_HEADERS = [
  "Contract",
  "Witness",
  "Issued By",
  "Created",
  "Expires",
  "Status",
  "Email",
  "Last Activity",
] as const;

/**
 * Table of all witness invitations for the organization, backed by
 * GET /users/witness-link. Clicking any row opens WitnessAccessDetailsSidebar.
 * Desktop: full 8-column table. Mobile: stacked card list.
 */
export function WitnessInvitationsTable({
  invitations,
  isLoading,
  isError,
  onRetry,
  pagination,
  onPageChange,
  onRowClick,
}: WitnessInvitationsTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Witness Invitations</CardTitle>
            <CardDescription>All witness access links across your contracts.</CardDescription>
          </div>
          {pagination && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {pagination.total} Invitation{pagination.total === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Desktop table ── */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={TABLE_HEADERS.length} className="py-14 text-center text-sm text-muted-foreground">
                    Loading witness invitations...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={TABLE_HEADERS.length}>
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                      <AlertCircle className="size-6 text-destructive" />
                      <p className="text-sm text-muted-foreground">
                        We couldn't load witness invitations. Please try again.
                      </p>
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_HEADERS.length} className="py-14 text-center text-sm text-muted-foreground">
                    No witness invitations yet. Generate one above.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <InvitationRow
                    key={inv.id}
                    invitation={inv}
                    onClick={() => onRowClick(inv)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ── */}
        <ul className="divide-y divide-border lg:hidden">
          {isLoading ? (
            <li className="py-14 text-center text-sm text-muted-foreground">Loading witness invitations...</li>
          ) : isError ? (
            <li className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <p className="text-sm text-muted-foreground">We couldn't load witness invitations. Please try again.</p>
              <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
            </li>
          ) : invitations.length === 0 ? (
            <li className="py-14 text-center text-sm text-muted-foreground">No witness invitations yet.</li>
          ) : (
            invitations.map((inv) => (
              <InvitationCard
                key={inv.id}
                invitation={inv}
                onClick={() => onRowClick(inv)}
              />
            ))
          )}
        </ul>

        {pagination && pagination.total > 0 && (
          <WitnessLinksPagination pagination={pagination} onPageChange={onPageChange} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Email status ─────────────────────────────────────────────────────────────

function EmailStatus({ emailSentAt }: { emailSentAt: string | null }) {
  if (!emailSentAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Mail className="size-3.5" />
        Not sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
      <MailCheck className="size-3.5" />
      Sent
    </span>
  );
}

// ─── Desktop row ──────────────────────────────────────────────────────────────

interface RowProps {
  invitation: WitnessLinkListItem;
  onClick: () => void;
}

function InvitationRow({ invitation: inv, onClick }: RowProps) {
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{inv.contractTitle}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{inv.contractId.slice(0, 8)}…</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{inv.witnessName ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{inv.witnessEmail}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{inv.issuedBy.fullName}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatDate(inv.createdAt)}</td>
      <td className="px-4 py-3">
        <p className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(inv.expiresAt)}</p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(inv.expiresAt)}</p>
      </td>
      <td className="px-4 py-3"><WitnessStatusBadge status={inv.status} /></td>
      <td className="whitespace-nowrap px-4 py-3"><EmailStatus emailSentAt={inv.emailSentAt} /></td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
        {inv.usedAt ? `Used ${formatRelativeTime(inv.usedAt)}` : "Not yet used"}
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function InvitationCard({ invitation: inv, onClick }: RowProps) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="flex cursor-pointer flex-col gap-2 px-4 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{inv.contractTitle}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{inv.contractId.slice(0, 8)}…</p>
        </div>
        <WitnessStatusBadge status={inv.status} />
      </div>
      <div className="text-sm text-foreground">
        {inv.witnessName ?? "—"}
        <span className="ml-1 text-xs text-muted-foreground">({inv.witnessEmail})</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>By {inv.issuedBy.fullName}</span>
        <span>Expires {formatRelativeTime(inv.expiresAt)}</span>
        <EmailStatus emailSentAt={inv.emailSentAt} />
        <span>{inv.usedAt ? `Used ${formatRelativeTime(inv.usedAt)}` : "Not yet used"}</span>
      </div>
    </li>
  );
}
