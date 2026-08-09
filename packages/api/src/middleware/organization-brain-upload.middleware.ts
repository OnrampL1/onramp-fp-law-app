import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { createError } from "./error-handler";
import {
  ALLOWED_ORGANIZATION_BRAIN_EXTENSIONS,
  ALLOWED_ORGANIZATION_BRAIN_MIME_TYPES,
  MAX_ORGANIZATION_BRAIN_FILE_SIZE_BYTES,
  ORGANIZATION_BRAIN_UPLOAD_FIELD_NAME,
} from "../constants/organization-brain.constants";

function hasAllowedExtension(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();

  return ALLOWED_ORGANIZATION_BRAIN_EXTENSIONS.some(
    (allowedExtension) => allowedExtension === extension,
  );
}

function hasAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_ORGANIZATION_BRAIN_MIME_TYPES.some(
    (allowedMimeType) => allowedMimeType === mimeType,
  );
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ORGANIZATION_BRAIN_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!hasAllowedExtension(file.originalname)) {
      callback(createError("Unsupported organization brain file type", 422));
      return;
    }

    if (!hasAllowedMimeType(file.mimetype)) {
      callback(createError("Unsupported organization brain file type", 422));
      return;
    }

    callback(null, true);
  },
});

const parseSingleOrganizationBrainFile = upload.single(
  ORGANIZATION_BRAIN_UPLOAD_FIELD_NAME,
);

export function parseOrganizationBrainUploadFile(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  parseSingleOrganizationBrainFile(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(createError("Organization brain file is too large", 422));
        return;
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        next(
          createError("Only one organization brain file may be uploaded", 422),
        );
        return;
      }

      next(createError("Invalid organization brain upload", 422));
      return;
    }

    next(error);
  });
}
