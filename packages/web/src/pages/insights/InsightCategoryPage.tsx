import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BusinessStatusBadge, StatusBadge } from "@/components/ui/badges";
import { AlertCircle, ArrowLeft, FileText, type LucideIcon } from "lucide-react";
import { LEGAL_STATE_LABELS } from "@/components/dashboard/RecentContractsTable";
import { InsightCategoryPagination } from "@/components/insights/InsightCategoryPagination";
import { useInsightCategoryContracts } from "@/hooks/useInsights";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { RiskCategory } from "@/types/insights";

interface InsightCategoryPageProps {
  category: RiskCategory;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function InsightCategoryPage({
  category,
  title,
  description,
  icon: Icon,
}: InsightCategoryPageProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useInsightCategoryContracts(
    category,
    page,
  );
  const contracts = data?.contracts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          render={
            <Link to="/dashboard">
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </Link>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isLoading
              ? "Loading…"
              : `${contracts.length} contract${contracts.length === 1 ? "" : "s"}`}
          </CardTitle>
          <CardDescription>
            Every contract in your portfolio with at least one flagged finding
            in this category.
          </CardDescription>
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
                    Loading contracts...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="size-6 text-destructive" />
                      <p className="text-sm text-muted-foreground">
                        We couldn't load these contracts.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                      >
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No contracts currently flagged in this category.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="max-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                          <FileText className="size-4" />
                        </div>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Link
                                to={`/contracts/${contract.id}`}
                                className="min-w-0 truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                              >
                                {contract.title}
                              </Link>
                            }
                          />
                          <TooltipContent side="top" align="start">
                            {contract.title}
                          </TooltipContent>
                        </Tooltip>
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
                      <BusinessStatusBadge status={contract.businessStatus} />
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

        {data && data.pagination.total > 0 ? (
          <InsightCategoryPagination
            pagination={data.pagination}
            onPageChange={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
