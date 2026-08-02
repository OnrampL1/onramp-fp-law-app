import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import type { AuditLogPaginationMeta } from "../../types/audit";

interface AuditLogPaginationProps {
  pagination: AuditLogPaginationMeta;
  onPageChange: (page: number) => void;
}

export function AuditLogPagination({ pagination, onPageChange }: AuditLogPaginationProps) {
  const { page, limit, total, totalPages } = pagination;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
        </span>{" "}
        of <span className="font-medium text-foreground">{total}</span> events
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="px-2 text-sm text-muted-foreground">
          Page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
