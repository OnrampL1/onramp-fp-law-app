import { Loader2 } from "lucide-react";
import { SEARCH_CATEGORY_LABELS } from "@/search/searchIndex";
import type { RankedSearchGroup } from "@/search/rank";
import { SearchResultRow } from "./SearchResultRow";

const DROPDOWN_RESULTS_PER_CATEGORY = 3;

interface SearchDropdownProps {
  query: string;
  groups: RankedSearchGroup[];
  isLoadingLive: boolean;
  isLiveError: boolean;
  onSelect: (route: string) => void;
  onViewAll: () => void;
}

export function SearchDropdown({
  query,
  groups,
  isLoadingLive,
  isLiveError,
  onSelect,
  onViewAll,
}: SearchDropdownProps) {
  const hasResults = groups.length > 0;

  return (
    <div className="absolute left-0 top-full z-40 mt-2 w-full min-w-80 rounded-lg border border-border bg-popover shadow-lg">
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {!hasResults && !isLoadingLive && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {groups.map((group) => (
          <div key={group.category} className="mb-1 last:mb-0">
            <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {SEARCH_CATEGORY_LABELS[group.category]}
            </div>
            {group.results.slice(0, DROPDOWN_RESULTS_PER_CATEGORY).map((result) => (
              <SearchResultRow
                key={result.id}
                result={result}
                query={query}
                onSelect={(r) => onSelect(r.route)}
              />
            ))}
          </div>
        ))}

        {isLoadingLive && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Searching users, contracts, and organization…
          </div>
        )}

        {isLiveError && (
          <div className="px-3 py-2 text-xs text-destructive">
            Couldn&apos;t load Users, Contracts, or Organization results.
            Showing pages and settings only.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        className="block w-full rounded-b-lg border-t border-border px-3 py-2.5 text-left text-sm text-primary hover:bg-accent/60"
      >
        View all results
      </button>
    </div>
  );
}
