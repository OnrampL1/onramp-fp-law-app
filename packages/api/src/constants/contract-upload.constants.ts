export const MAX_CONTRACT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const CONTRACT_UPLOAD_FIELD_NAME = "file";

export const ALLOWED_CONTRACT_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export const ALLOWED_CONTRACT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const MAX_CONTRACT_TITLE_LENGTH = 500;
export const MAX_CONTRACT_COUNTERPARTY_LENGTH = 500;
export const MAX_CONTRACT_TAG_LENGTH = 50;
export const MAX_CONTRACT_TAGS = 20;
