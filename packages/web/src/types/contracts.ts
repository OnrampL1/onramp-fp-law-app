export const ACCEPTED_CONTRACT_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
] as const;

export const ACCEPTED_CONTRACT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const MAX_CONTRACT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const MIN_PASTED_CONTRACT_TEXT_LENGTH = 40;

export const CONTRACT_TYPE_OPTIONS = [
  { value: "msa", label: "Master Services Agreement" },
  { value: "nda", label: "Non-Disclosure Agreement" },
  { value: "saas", label: "SaaS Subscription" },
  { value: "employment", label: "Employment Agreement" },
  { value: "lease", label: "Lease Agreement" },
  { value: "vendor", label: "Vendor / Supply" },
  { value: "other", label: "Other" },
] as const;

export const CONTRACT_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
] as const;

export type AcceptedContractFileExtension =
  (typeof ACCEPTED_CONTRACT_FILE_EXTENSIONS)[number];

export type AcceptedContractMimeType =
  (typeof ACCEPTED_CONTRACT_MIME_TYPES)[number];

export type ContractType = (typeof CONTRACT_TYPE_OPTIONS)[number]["value"];

export type ContractStatus = (typeof CONTRACT_STATUS_OPTIONS)[number]["value"];

export interface ContractMetadata {
  title: string;
  counterparty: string;
  contractType: ContractType | "";
  tags: string[];
  effectiveDate: string;
  expirationDate: string;
  status: ContractStatus;
}

export interface SelectedContractFile {
  file: File;
  name: string;
  size: number;
  type: string;
  extension: string;
}

export type ContractFileValidationErrorCode =
  | "missing-file"
  | "unsupported-file-type"
  | "file-too-large";

export interface ContractFileValidationError {
  code: ContractFileValidationErrorCode;
  message: string;
}

export type ContractFileValidationResult =
  | {
      isValid: true;
      file: SelectedContractFile;
    }
  | {
      isValid: false;
      error: ContractFileValidationError;
    };

export const CONTRACT_LEGAL_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
] as const;

export type ContractLegalStatus = (typeof CONTRACT_LEGAL_STATUSES)[number];

export type ContractExpirationBucket =
  | "expiring_30"
  | "expiring_90"
  | "expired"
  | "none";

export type ContractSortField =
  | "title"
  | "counterparty"
  | "status"
  | "effectiveDate"
  | "expirationDate"
  | "updatedAt";

export type ContractSortDirection = "asc" | "desc";

export interface ContractListItem {
  id: string;
  title: string;
  counterparty: string;
  status: ContractLegalStatus | null;
  tags: string[];
  effectiveDate: string | null;
  expirationDate: string | null;
  updatedAt: string;
}

export interface ContractListPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ContractListParams {
  search?: string;
  status?: ContractLegalStatus;
  tag?: string;
  expirationBucket?: ContractExpirationBucket;
  sortBy: ContractSortField;
  sortDirection: ContractSortDirection;
  page: number;
  pageSize: number;
}

export interface ContractListResult {
  items: ContractListItem[];
  pagination: ContractListPaginationMeta;
}
