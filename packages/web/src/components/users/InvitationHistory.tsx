import { History, Mail, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiInvitation } from "@/services/invitations.service";

import { UserRoleBadge, UserStatusBadge } from "./UserBadges";
import { UserManagementPagination } from "./UserManagementPagination";

interface InvitationHistoryPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type InvitationHistoryProps = {
  invitations: ApiInvitation[];
  onResendInvite: (invitationId: string) => void;
  pagination: InvitationHistoryPaginationMeta;
  onPageChange: (page: number) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

// Expired invitations, kept separate from the active roster (UserTable) so
// they never read as active team members — still findable and resendable
// here, per the "expired invitations shouldn't look like active members"
// requirement.
export function InvitationHistory({
  invitations,
  onResendInvite,
  pagination,
  onPageChange,
}: InvitationHistoryProps) {
  if (pagination.total === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">
          Previous invitations
        </h2>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expired</TableHead>
              <TableHead className="w-32 pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id} className="hover:bg-transparent">
                <TableCell className="pl-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{invitation.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <UserRoleBadge role={invitation.role} />
                </TableCell>
                <TableCell>
                  <UserStatusBadge status="expired" />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(invitation.expiresAt)}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onResendInvite(invitation.id)}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Resend
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {pagination.total > 0 && (
          <UserManagementPagination
            pagination={pagination}
            onPageChange={onPageChange}
          />
        )}
      </Card>
    </div>
  );
}
