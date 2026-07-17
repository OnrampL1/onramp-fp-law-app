import { cn } from "@/lib/utils";
import { useContractsList } from "@/hooks/useContractsList";
import { useContractFilters } from "@/hooks/useContractFilters";
import type { ContractSortField, ContractSortDirection } from "@/types/contracts";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSearch,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContractsToolbar } from "./ContractsToolbar";
import { ContractsPagination } from "./ContractsPagination";
import { ContractRow } from "./ContractRow";

export function ContractsTable() {
  const filters = useContractFilters();
  const { data, isLoading, isFetching, isError, refetch } = useContractsList(
    filters.queryParams,
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const isRefetching = isFetching && !isLoading;

  return (
    <Card className="overflow-hidden p-0">
      <ContractsToolbar
        query={filters.query}
        status={filters.status}
        tag={filters.tag}
        expiration={filters.expiration}
        filtersActive={filters.filtersActive}
        onQueryChange={filters.setQuery}
        onStatusChange={filters.setStatus}
        onTagChange={filters.setTag}
        onExpirationChange={filters.setExpiration}
        onReset={filters.resetFilters}
      />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead
                label="Contract Name"
                sortKey="title"
                active={filters.sortField}
                dir={filters.sortDir}
                onClick={filters.toggleSort}
              />
              <SortableHead
                label="Counterparty"
                sortKey="counterparty"
                active={filters.sortField}
                dir={filters.sortDir}
                onClick={filters.toggleSort}
              />
              <SortableHead
                label="Status"
                sortKey="status"
                active={filters.sortField}
                dir={filters.sortDir}
                onClick={filters.toggleSort}
              />
              <SortableHead
                label="Effective Date"
                sortKey="effectiveDate"
                active={filters.sortField}
                dir={filters.sortDir}
                onClick={filters.toggleSort}
              />
              <SortableHead
                label="Expiration Date"
                sortKey="expirationDate"
                active={filters.sortField}
                dir={filters.sortDir}
                onClick={filters.toggleSort}
              />
              <SortableHead
                label="Last Updated"
                sortKey="updatedAt"
                active={filters.sortField}
                dir={filters.sortDir}
                onClick={filters.toggleSort}
              />
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(isRefetching && "opacity-60")}>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-14 text-center text-sm text-muted-foreground">
                  Loading contracts...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                    <AlertCircle className="size-6 text-destructive" />
                    <p className="text-sm text-muted-foreground">
                      We couldn't load contracts. Please try again.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  <EmptyState
                    onReset={filters.resetFilters}
                    hasFilters={filters.filtersActive}
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => <ContractRow key={c.id} contract={c} />)
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <ContractsPagination pagination={pagination} onPageChange={filters.setPage} />
      )}
    </Card>
  );
}

function SortableHead({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: ContractSortField;
  active: ContractSortField;
  dir: ContractSortDirection;
  onClick: (k: ContractSortField) => void;
}) {
  const isActive = active === sortKey;
  return (
    <TableHead>
      <button
        onClick={() => onClick(sortKey)}
        className={cn(
          "flex items-center gap-1.5 text-left font-medium transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

function EmptyState({
  onReset,
  hasFilters,
}: {
  onReset: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <FileSearch className="size-6" />
      </div>
      <div>
        <p className="font-medium text-foreground">No contracts found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Upload your first contract to get started."}
        </p>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="size-4" />
          Reset filters
        </Button>
      )}
    </div>
  );
}
