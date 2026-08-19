import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { createError } from "./error-handler";
import {
  ALLOWED_ORGANIZATION_LOGO_EXTENSIONS,
  ALLOWED_ORGANIZATION_LOGO_MIME_TYPES,
  MAX_ORGANIZATION_LOGO_FILE_SIZE_BYTES,
  ORGANIZATION_LOGO_UPLOAD_FIELD_NAME,
} from "../constants/organization-logo.constants";

function hasAllowedExtension(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();

  return ALLOWED_ORGANIZATION_LOGO_EXTENSIONS.some(
    (allowedExtension) => allowedExtension === extension,
  );
}

function hasAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_ORGANIZATION_LOGO_MIME_TYPES.some(
    (allowedMimeType) => allowedMimeType === mimeType,
  );
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ORGANIZATION_LOGO_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!hasAllowedExtension(file.originalname)) {
      callback(createError("Unsupported organization logo file type", 422));
      return;
    }

    if (!hasAllowedMimeType(file.mimetype)) {
      callback(createError("Unsupported organization logo file type", 422));
      return;
    }

    callback(null, true);
  },
});

const parseSingleOrganizationLogoFile = upload.single(
  ORGANIZATION_LOGO_UPLOAD_FIELD_NAME,
);

export function parseOrganizationLogoUploadFile(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  parseSingleOrganizationLogoFile(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(createError("Organization logo file is too large", 422));
        return;
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        next(createError("Only one organization logo file may be uploaded", 422));
        return;
      }

      next(createError("Invalid organization logo upload", 422));
      return;
    }

    next(error);
  });
}
