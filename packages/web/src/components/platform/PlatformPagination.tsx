import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import type { PaginationMeta } from "@/types/platform-organization";

interface PlatformPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PlatformPagination({
  pagination,
  onPageChange,
}: PlatformPaginationProps) {
  const { page, limit, total, totalPages } = pagination;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
        </span>{" "}
        of <span className="font-medium text-foreground">{total}</span>
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
        {Array.from({ length: totalPages }).map((_, i) => (
          <Button
            key={i}
            variant={page === i + 1 ? "default" : "outline"}
            size="icon"
            className="size-9"
            onClick={() => onPageChange(i + 1)}
            aria-current={page === i + 1 ? "page" : undefined}
          >
            {i + 1}
          </Button>
        ))}
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
