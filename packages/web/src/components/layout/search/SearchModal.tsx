import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SEARCH_CATEGORY_LABELS } from "@/search/searchIndex";
import type { RankedSearchGroup, RankedSearchResult } from "@/search/rank";
import { SearchResultRow } from "./SearchResultRow";

// The live endpoint caps each category at 20 rows server-side
// (RESULTS_PER_CATEGORY in search.service.ts) — a category landing exactly
// on that count might have more that didn't make it back, so it gets a
// caveat instead of a hard "N results" claim. Static-index categories never
// realistically approach this, so they never show the caveat.
const LIVE_RESULTS_CAP = 20;

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  groups: RankedSearchGroup[];
  isLoadingLive: boolean;
  isLiveError: boolean;
}

export function SearchModal({
  open,
  onOpenChange,
  query,
  onQueryChange,
  groups,
  isLoadingLive,
  isLiveError,
}: SearchModalProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const flatResults = useMemo(
    () => groups.flatMap((group) => group.results),
    [groups],
  );

  // Keep the highlighted row in range as results change out from under the
  // current index (new query, live results arriving, etc.).
  useEffect(() => {
    setActiveIndex(0);
  }, [flatResults.length > 0 ? flatResults[0]?.id : null, groups.length]);

  useEffect(() => {
    if (!open) return undefined;
    // Popup mount happens before the input exists in the DOM this tick.
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  function selectResult(result: RankedSearchResult) {
    navigate(result.route);
    onOpenChange(false);
    // Mirrors the dropdown's own onSelect (Header.tsx) — otherwise the
    // header search box is left holding the query after navigating away,
    // which reads as the search still being "open".
    onQueryChange("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = flatResults[activeIndex];
      if (target) selectResult(target);
    }
    // Esc is handled by the Dialog primitive itself.
  }

  let rowOffset = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] overflow-hidden p-0">
        <DialogTitle className="sr-only">Search Clausio</DialogTitle>
        <DialogDescription className="sr-only">
          Search pages, settings, users, contracts, and your organization.
        </DialogDescription>

        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search contracts, clauses, counterparties..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Global search"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {groups.length === 0 && !isLoadingLive && query.trim().length >= 2 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Keep typing to search…
            </div>
          )}

          {groups.map((group) => {
            const startIndex = rowOffset;
            rowOffset += group.results.length;
            const atCap = group.results.length >= LIVE_RESULTS_CAP;

            return (
              <div key={group.category} className="mb-1 last:mb-0">
                <div className="flex items-baseline justify-between px-3 py-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {SEARCH_CATEGORY_LABELS[group.category]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.results.length}
                    {atCap ? "+" : ""} result
                    {group.results.length === 1 && !atCap ? "" : "s"}
                  </span>
                </div>
                {group.results.map((result, i) => (
                  <SearchResultRow
                    key={result.id}
                    result={result}
                    query={query}
                    active={startIndex + i === activeIndex}
                    onSelect={selectResult}
                  />
                ))}
              </div>
            );
          })}

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

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>↑↓ to navigate · Enter to open · Esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
