import {
  ContractExpirationBucket,
  ContractLegalStatus,
  ContractListParams,
  ContractSortDirection,
  ContractSortField,
} from "@/types/contracts";
import { useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

const PAGE_SIZE = 8;
const DEBOUNCE_MS = 300;

export interface UseContractFiltersResult {
  query: string;
  status: ContractLegalStatus | "all";
  tag: string;
  expiration: ContractExpirationBucket | "all";
  sortField: ContractSortField;
  sortDir: ContractSortDirection;
  filtersActive: boolean;
  setQuery: (value: string) => void;
  setStatus: (value: ContractLegalStatus | "all") => void;
  setTag: (value: string) => void;
  setExpiration: (value: ContractExpirationBucket | "all") => void;
  setPage: (value: number) => void;
  toggleSort: (field: ContractSortField) => void;
  resetFilters: () => void;
  queryParams: ContractListParams;
}

export function useContractFilters(): UseContractFiltersResult {
  const [query, setQueryState] = useState("");
  const [status, setStatusState] = useState<ContractLegalStatus | "all">("all");
  const [tag, setTagState] = useState("");
  const [expiration, setExpirationState] = useState<
    ContractExpirationBucket | "all"
  >("all");
  const [sortField, setSortField] = useState<ContractSortField>("updatedAt");
  const [sortDir, setSortDir] = useState<ContractSortDirection>("desc");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(query, DEBOUNCE_MS);
  const debouncedTag = useDebouncedValue(tag, DEBOUNCE_MS);

  const filtersActive =
    query !== "" || status !== "all" || tag !== "" || expiration !== "all";

  function setQuery(value: string) {
    setQueryState(value);
    setPage(1);
  }

  function setStatus(value: ContractLegalStatus | "all") {
    setStatusState(value);
    setPage(1);
  }

  function setTag(value: string) {
    setTagState(value);
    setPage(1);
  }

  function setExpiration(value: ContractExpirationBucket | "all") {
    setExpirationState(value);
    setPage(1);
  }

  function toggleSort(field: ContractSortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function resetFilters() {
    setQueryState("");
    setStatusState("all");
    setTagState("");
    setExpirationState("all");
    setPage(1);
  }

  return {
    query,
    status,
    tag,
    expiration,
    sortField,
    sortDir,
    filtersActive,
    setQuery,
    setStatus,
    setTag,
    setExpiration,
    setPage,
    toggleSort,
    resetFilters,
    queryParams: {
      search: debouncedSearch || undefined,
      status: status === "all" ? undefined : status,
      tag: debouncedTag || undefined,
      expirationBucket: expiration === "all" ? undefined : expiration,
      sortBy: sortField,
      sortDirection: sortDir,
      page,
      pageSize: PAGE_SIZE,
    },
  };
}
