export const ACCEPTED_CONTRACT_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
] as const;

export const ACCEPTED_CONTRACT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const MAX_CONTRACT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const MIN_PASTED_CONTRACT_TEXT_LENGTH = 40;

export type AcceptedContractFileExtension =
  (typeof ACCEPTED_CONTRACT_FILE_EXTENSIONS)[number];

export type AcceptedContractMimeType =
  (typeof ACCEPTED_CONTRACT_MIME_TYPES)[number];

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
  version: number;
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

export interface ContractDetailResponse {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: "DRAFT" | "UNDER_REVIEW" | "COMPLETED" | "ARCHIVED";
  processingStatus:
    | "PENDING_EXTRACTION"
    | "EXTRACTION_COMPLETED"
    | "EXTRACTION_FAILED"
    | "AI_PENDING"
    | "AI_COMPLETED"
    | "AI_FAILED";
  processingError: string | null;
  legalState: ContractLegalStatus | null;
  tags: string[];
  effectiveDate: string | null;
  expirationDate: string | null;
  fileName: string;
  version: number;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

// Full-replace payload for PUT /contracts/:id/metadata — every field is
// resent with its current value (touched or not), plus the `version` the
// form was loaded with so the API can detect a concurrent edit (DDS §1.8).
export interface UpdateContractMetadataPayload {
  title: string;
  counterparty: string;
  tags: string[];
  effectiveDate: string; // "" or "YYYY-MM-DD"
  expirationDate: string; // "" or "YYYY-MM-DD"
  version: number;
}

export interface ContractContentResponse {
  processingStatus: ContractDetailResponse["processingStatus"];
  extractedText: string | null;
  version: number;
}

export interface SetContractLegalStatePayload {
  action: "terminate" | "reactivate";
  version: number;
}

export interface UpdateContractContentPayload {
  extractedText: string;
  version: number;
}

export interface DeleteContractPayload {
  version: number;
}
