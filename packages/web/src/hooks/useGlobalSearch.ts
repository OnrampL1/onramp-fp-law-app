import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "./useDebouncedValue";
import { fetchGlobalSearchResults } from "@/services/search.service";
import { rankAndGroup, type RankedSearchGroup } from "@/search/rank";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export interface UseGlobalSearchResult {
  query: string;
  setQuery: (value: string) => void;
  isActive: boolean;
  groups: RankedSearchGroup[];
  isLoadingLive: boolean;
  isLiveError: boolean;
}

// Shared by the header dropdown and the "View all results" modal so both
// stay in sync off one in-flight request instead of duplicating it.
export function useGlobalSearch(): UseGlobalSearchResult {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const isActive = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const liveResults = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => fetchGlobalSearchResults(debouncedQuery),
    enabled: isActive,
    staleTime: 30_000,
  });

  // Static matches don't depend on the network, so they're available
  // immediately; live categories (Users/Contracts/Organization) merge in
  // once the request resolves. Until then, only static groups render.
  const groups = useMemo(() => {
    if (!isActive) return [];
    return rankAndGroup(debouncedQuery, liveResults.data ?? []);
  }, [isActive, debouncedQuery, liveResults.data]);

  return {
    query,
    setQuery,
    isActive,
    groups,
    isLoadingLive: isActive && liveResults.isLoading,
    isLiveError: isActive && liveResults.isError,
  };
}
