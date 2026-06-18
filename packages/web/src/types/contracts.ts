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
