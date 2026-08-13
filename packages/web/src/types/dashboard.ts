import type { ContractLegalStatus } from "./contracts";

export type DashboardBusinessStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "COMPLETED"
  | "ARCHIVED";

export interface DashboardContractItem {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: DashboardBusinessStatus;
  legalState: ContractLegalStatus | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  updatedAt: string;
}

export type DashboardLegalStateCounts = Record<
  ContractLegalStatus | "UNSET",
  number
>;

export type DashboardBusinessStatusCounts = Record<
  DashboardBusinessStatus,
  number
>;

export interface DashboardSummary {
  contracts: {
    total: number;
    legalStateCounts: DashboardLegalStateCounts;
    businessStatusCounts: DashboardBusinessStatusCounts;
    expiringSoonCount: number;
    recent: DashboardContractItem[];
    expiringSoon: DashboardContractItem[];
  };
}
