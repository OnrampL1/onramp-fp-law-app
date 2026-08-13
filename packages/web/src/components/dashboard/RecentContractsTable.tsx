import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, FileText } from "lucide-react";
import { StatusBadge } from "../ui/badges";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { DashboardContractItem } from "@/types/dashboard";
import type { ContractLegalStatus } from "@/types/contracts";

const LEGAL_STATE_LABELS = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
} as const satisfies Record<
  ContractLegalStatus,
  "Draft" | "Active" | "Expired" | "Terminated"
>;

const BUSINESS_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under review",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

interface RecentContractsProps {
  contracts: DashboardContractItem[] | undefined;
  isLoading?: boolean;
}

export function RecentContracts({
  contracts,
  isLoading = false,
}: RecentContractsProps) {
  const navigate = useNavigate();
  const items = contracts ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Recent Contracts</CardTitle>
          <CardDescription>
            Latest updates across your contract portfolio
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => navigate("/contracts")}
        >
          View all
          <ArrowRight className="size-4" />
        </Button>
      </CardHeader>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Contract Name</TableHead>
              <TableHead>Counterparty</TableHead>
              <TableHead>Legal State</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Expiration Date</TableHead>
              <TableHead className="text-right">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Loading recent contracts...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No contracts have been uploaded yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/contracts/${contract.id}`}
                          className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                        >
                          {contract.title}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {contract.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {contract.counterparty}
                  </TableCell>

                  <TableCell>
                    {contract.legalState ? (
                      <StatusBadge
                        status={LEGAL_STATE_LABELS[contract.legalState]}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      {BUSINESS_STATUS_LABELS[contract.businessStatus]}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {formatDate(contract.expirationDate)}
                  </TableCell>

                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatRelativeTime(contract.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
