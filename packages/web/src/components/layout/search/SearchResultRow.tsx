import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { RankedSearchResult } from "@/search/rank";
import { HighlightMatch } from "./HighlightMatch";

interface SearchResultRowProps {
  result: RankedSearchResult;
  query: string;
  active?: boolean;
  onSelect: (result: RankedSearchResult) => void;
}

export const SearchResultRow = forwardRef<HTMLButtonElement, SearchResultRowProps>(
  function SearchResultRow({ result, query, active, onSelect }, ref) {
    const Icon = result.icon;

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onSelect(result)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
          active ? "bg-accent" : "hover:bg-accent/60",
        )}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-foreground">
            <HighlightMatch text={result.name} query={query} />
          </div>
          {result.subtext && (
            <div className="truncate text-xs text-muted-foreground">
              {result.subtext}
            </div>
          )}
        </div>
        {result.status === "comingSoon" && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Coming Soon
          </span>
        )}
      </button>
    );
  },
);
