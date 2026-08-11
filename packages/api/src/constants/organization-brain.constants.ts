export const ORGANIZATION_BRAIN_UPLOAD_FIELD_NAME = "file";

export const MAX_ORGANIZATION_BRAIN_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_ORGANIZATION_BRAIN_PASTE_CONTENT_LENGTH = 500_000;

export const MAX_ORGANIZATION_BRAIN_TITLE_LENGTH = 500;
export const MAX_ORGANIZATION_BRAIN_SEARCH_LENGTH = 200;

export const ALLOWED_ORGANIZATION_BRAIN_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
] as const;

export const ALLOWED_ORGANIZATION_BRAIN_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;
