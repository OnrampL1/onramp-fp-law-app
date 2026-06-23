import {
  ACCEPTED_CONTRACT_FILE_EXTENSIONS,
  ACCEPTED_CONTRACT_MIME_TYPES,
  MAX_CONTRACT_FILE_SIZE_BYTES,
  type ContractFileValidationResult,
} from "../types/contracts";

export function getFileExtension(fileName: string): string {
  const extensionStart = fileName.lastIndexOf(".");

  if (extensionStart === -1) {
    return "";
  }

  return fileName.slice(extensionStart).toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateContractFile(
  file: File | null | undefined,
): ContractFileValidationResult {
  if (!file) {
    return {
      isValid: false,
      error: {
        code: "missing-file",
        message: "Select a contract file to upload.",
      },
    };
  }

  const extension = getFileExtension(file.name);
  const hasAcceptedExtension = ACCEPTED_CONTRACT_FILE_EXTENSIONS.some(
    (acceptedExtension) => acceptedExtension === extension,
  );

  const hasAcceptedMimeType =
    file.type.length === 0 ||
    ACCEPTED_CONTRACT_MIME_TYPES.some(
      (acceptedMimeType) => acceptedMimeType === file.type,
    );

  if (!hasAcceptedExtension || !hasAcceptedMimeType) {
    return {
      isValid: false,
      error: {
        code: "unsupported-file-type",
        message: "Upload a PDF, DOC, DOCX, or TXT contract file.",
      },
    };
  }

  if (file.size > MAX_CONTRACT_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: {
        code: "file-too-large",
        message: `File size must be ${formatFileSize(
          MAX_CONTRACT_FILE_SIZE_BYTES,
        )} or less.`,
      },
    };
  }

  return {
    isValid: true,
    file: {
      file,
      name: file.name,
      size: file.size,
      type: file.type || "Unknown",
      extension,
    },
  };
}
