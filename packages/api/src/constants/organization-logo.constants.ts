export const ORGANIZATION_LOGO_UPLOAD_FIELD_NAME = "file";

export const MAX_ORGANIZATION_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export const ALLOWED_ORGANIZATION_LOGO_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export const ALLOWED_ORGANIZATION_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ORGANIZATION_LOGO_DOWNLOAD_URL_EXPIRES_IN_SECONDS = 15 * 60;
