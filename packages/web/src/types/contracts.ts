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

export const CONTRACT_LEGAL_STATE_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" },
] as const;

export type AcceptedContractFileExtension =
  (typeof ACCEPTED_CONTRACT_FILE_EXTENSIONS)[number];

export type AcceptedContractMimeType =
  (typeof ACCEPTED_CONTRACT_MIME_TYPES)[number];

export type ContractLegalState =
  (typeof CONTRACT_LEGAL_STATE_OPTIONS)[number]["value"];

export interface ContractMetadata {
  title: string;
  counterparty: string;
  tags: string[];
  expirationDate: string;
  legalState: ContractLegalState | "";
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
