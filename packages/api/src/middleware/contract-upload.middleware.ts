import path from "node:path";
import multer from "multer";
import { createError } from "./error-handler";
import {
  ALLOWED_CONTRACT_EXTENSIONS,
  ALLOWED_CONTRACT_MIME_TYPES,
  CONTRACT_UPLOAD_FIELD_NAME,
  MAX_CONTRACT_FILE_SIZE_BYTES,
} from "../constants/contract-upload.constants";

function hasAllowedExtension(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();

  return ALLOWED_CONTRACT_EXTENSIONS.some(
    (allowedExtension) => allowedExtension === extension,
  );
}

function hasAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_CONTRACT_MIME_TYPES.some(
    (allowedMimeType) => allowedMimeType === mimeType,
  );
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CONTRACT_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!hasAllowedExtension(file.originalname)) {
      callback(createError("Unsupported contract file type", 422));
      return;
    }

    if (!hasAllowedMimeType(file.mimetype)) {
      callback(createError("Unsupported contract file type", 422));
      return;
    }

    callback(null, true);
  },
});

export const parseContractUploadFile = upload.single(
  CONTRACT_UPLOAD_FIELD_NAME,
);
