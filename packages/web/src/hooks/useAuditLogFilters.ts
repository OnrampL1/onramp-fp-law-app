import { useState } from "react";
import type { AuditAction, AuditLogListParams } from "../types/audit";

const PAGE_SIZE = 20;

export interface UseAuditLogFiltersResult {
  actorUserId: string | "all";
  action: AuditAction | "all";
  contractId: string | "all";
  dateFrom: string;
  dateTo: string;
  page: number;
  filtersActive: boolean;
  setActorUserId: (value: string | "all") => void;
  setAction: (value: AuditAction | "all") => void;
  setContractId: (value: string | "all") => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  setPage: (value: number) => void;
  resetFilters: () => void;
  queryParams: AuditLogListParams;
}

export function useAuditLogFilters(): UseAuditLogFiltersResult {
  const [actorUserId, setActorUserIdState] = useState<string | "all">("all");
  const [action, setActionState] = useState<AuditAction | "all">("all");
  const [contractId, setContractIdState] = useState<string | "all">("all");
  const [dateFrom, setDateFromState] = useState("");
  const [dateTo, setDateToState] = useState("");
  const [page, setPage] = useState(1);

  const filtersActive =
    actorUserId !== "all" ||
    action !== "all" ||
    contractId !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  function setActorUserId(value: string | "all") {
    setActorUserIdState(value);
    setPage(1);
  }

  function setAction(value: AuditAction | "all") {
    setActionState(value);
    setPage(1);
  }

  function setContractId(value: string | "all") {
    setContractIdState(value);
    setPage(1);
  }

  function setDateFrom(value: string) {
    setDateFromState(value);
    setPage(1);
  }

  function setDateTo(value: string) {
    setDateToState(value);
    setPage(1);
  }

  function resetFilters() {
    setActorUserIdState("all");
    setActionState("all");
    setContractIdState("all");
    setDateFromState("");
    setDateToState("");
    setPage(1);
  }

  return {
    actorUserId,
    action,
    contractId,
    dateFrom,
    dateTo,
    page,
    filtersActive,
    setActorUserId,
    setAction,
    setContractId,
    setDateFrom,
    setDateTo,
    setPage,
    resetFilters,
    queryParams: {
      actorUserId: actorUserId === "all" ? undefined : actorUserId,
      action: action === "all" ? undefined : action,
      contractId: contractId === "all" ? undefined : contractId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: PAGE_SIZE,
    },
  };
}
