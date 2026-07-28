import type {
  ContractBusinessStatus,
  ContractLegalState,
  ContractProcessingStatus,
} from "@prisma/client";

export type ContractSortField =
  | "title"
  | "counterparty"
  | "legalState"
  | "effectiveDate"
  | "expirationDate"
  | "updatedAt";

export type SortDirection = "asc" | "desc";

export type ExpirationBucket =
  | "expiring_30"
  | "expiring_90"
  | "expired"
  | "none";

export interface ContractListFilters {
  search?: string;
  legalState?: ContractLegalState;
  tag?: string;
  expirationBucket?: ExpirationBucket;
}

export interface ContractListSort {
  field: ContractSortField;
  direction: SortDirection;
}

export interface ContractListPagination {
  page: number;
  pageSize: number;
}

export interface ContractListItemDto {
  id: string;
  title: string;
  counterparty: string;
  status: ContractLegalState | null;
  tags: string[];
  effectiveDate: string | null;
  expirationDate: string | null;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ContractUploadResultDto {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: ContractBusinessStatus;
  processingStatus: ContractProcessingStatus;
  legalState: ContractLegalState | null;
  tags: string[];
  expirationDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
