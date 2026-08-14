import type {
  ContractBusinessStatus,
  ContractLegalState,
} from "@prisma/client";

export interface DashboardContractItemDto {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: ContractBusinessStatus;
  legalState: ContractLegalState | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  updatedAt: string;
}

export type DashboardLegalStateCounts = Record<
  ContractLegalState | "UNSET",
  number
>;

export type DashboardBusinessStatusCounts = Record<
  ContractBusinessStatus,
  number
>;

export interface DashboardSummaryDto {
  contracts: {
    total: number;
    legalStateCounts: DashboardLegalStateCounts;
    businessStatusCounts: DashboardBusinessStatusCounts;
    expiringSoonCount: number;
    recent: DashboardContractItemDto[];
    expiringSoon: DashboardContractItemDto[];
  };
}
