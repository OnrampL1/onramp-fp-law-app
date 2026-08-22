import crypto from "node:crypto";
import path from "node:path";
import {
  getFileStream,
  uploadFile,
  deleteFile,
  getPrismaClient,
  organizationBrainEmbeddingsQueue,
} from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import {
  organizationBrainRepository,
  type CreateOrganizationBrainItemInput,
  type OrganizationBrainItemDetailRow,
  type OrganizationBrainItemListRow,
} from "../repositories/organization-brain.repository";
import type {
  CreateOrganizationBrainPasteInput,
  CreateOrganizationBrainUploadInput,
} from "../schemas/organization-brain.schemas";
import type {
  OrganizationBrainFileStreamDto,
  OrganizationBrainItemCreateResultDto,
  OrganizationBrainItemDetailDto,
  OrganizationBrainItemListFilters,
  OrganizationBrainItemListItemDto,
  OrganizationBrainItemListPagination,
  OrganizationBrainItemListPaginationMeta,
} from "../types/organization-brain.types";

const prisma = getPrismaClient();

const UUID_PREFIX_LENGTH = 37;

export interface OrganizationBrainActor {
  userId: string;
  organizationId: string;
}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateOrganizationBrainUploadRequest {
  metadata: CreateOrganizationBrainUploadInput;
  file: Express.Multer.File | undefined;
  actor: OrganizationBrainActor;
  requestContext: RequestContext;
}

export interface CreateOrganizationBrainPasteRequest {
  input: CreateOrganizationBrainPasteInput;
  actor: OrganizationBrainActor;
  requestContext: RequestContext;
}

async function getActiveOrganizationUser(
  userId: string,
  organizationId: string,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    include: { organization: true },
  });

  if (!user) {
    throw createError("Authenticated user was not found", 401);
  }

  if (user.status !== "ACTIVE") {
    throw createError("This account is not active", 403);
  }

  if (user.organization.status !== "ACTIVE") {
    throw createError("Organization is not active", 403);
  }

  return user;
}

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

function hasZipSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 2).toString("utf8") === "PK";
}

function looksLikePlainText(buffer: Buffer): boolean {
  return !buffer.includes(0);
}

function validateUploadedFile(file: Express.Multer.File): void {
  if (file.size === 0 || file.buffer.length === 0) {
    throw createError("Organization brain file cannot be empty", 422);
  }

  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".pdf" && !hasPdfSignature(file.buffer)) {
    throw createError("Uploaded PDF file is invalid", 422);
  }

  if (extension === ".docx" && !hasZipSignature(file.buffer)) {
    throw createError("Uploaded DOCX file is invalid", 422);
  }

  if (extension === ".txt" && !looksLikePlainText(file.buffer)) {
    throw createError("Uploaded TXT file is invalid", 422);
  }
}

function createSha256Checksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sanitizeFileName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, extension);

  const safeBaseName = baseName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${safeBaseName || "organization-brain"}${extension}`;
}

function createPasteFileName(title: string): string {
  const safeTitle = title
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${safeTitle || "organization-brain"}.txt`;
}

function createOrganizationBrainStorageKey({
  organizationId,
  fileName,
}: {
  organizationId: string;
  fileName: string;
}): string {
  return `organization-brain/${organizationId}/${crypto.randomUUID()}-${fileName}`;
}

function extractFileNameFromKey(storageKey: string): string {
  const baseName = storageKey.split("/").pop() ?? storageKey;
  return baseName.slice(UUID_PREFIX_LENGTH) || baseName;
}

function toListItemDto(
  row: OrganizationBrainItemListRow,
): OrganizationBrainItemListItemDto {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    source: row.source,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdByName: row.createdBy.fullName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createAttachmentContentDisposition(fileName: string): string {
  const asciiFileName = fileName.replace(/["\\\r\n]/g, "_");

  return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function toDetailDto(
  row: OrganizationBrainItemDetailRow,
): OrganizationBrainItemDetailDto {
  const fileName = row.fileName ?? extractFileNameFromKey(row.storageKey);

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    source: row.source,
    fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdByName: row.createdBy.fullName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    extractionError: row.extractionError,
  };
}

async function persistOrganizationBrainItem(
  input: CreateOrganizationBrainItemInput,
  requestContext: RequestContext,
): Promise<OrganizationBrainItemCreateResultDto> {
  const item = await organizationBrainRepository.create(input, {
    action: "ORGANIZATION_BRAIN_ITEM_CREATED",
    actorType: "USER",
    actorUserId: input.createdByUserId,
    organizationId: input.organizationId,
    newValue: {
      title: input.title,
      type: input.type,
      source: input.source,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
    },
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return toListItemDto(item);
}

async function createFromUpload({
  metadata,
  file,
  actor,
  requestContext,
}: CreateOrganizationBrainUploadRequest): Promise<OrganizationBrainItemCreateResultDto> {
  const user = await getActiveOrganizationUser(
    actor.userId,
    actor.organizationId,
  );

  if (!file) {
    throw createError("Organization brain file is required", 422);
  }

  validateUploadedFile(file);

  const sanitizedFileName = sanitizeFileName(file.originalname);
  const storageKey = createOrganizationBrainStorageKey({
    organizationId: user.organizationId,
    fileName: sanitizedFileName,
  });
  const checksum = createSha256Checksum(file.buffer);

  try {
    await uploadFile(storageKey, file.buffer, file.mimetype);
  } catch {
    throw createError("Could not store organization brain file", 502);
  }

  const item = await persistOrganizationBrainItem(
    {
      organizationId: user.organizationId,
      createdByUserId: user.id,
      title: metadata.title,
      type: metadata.type,
      source: "UPLOAD",
      storageKey,
      fileName: sanitizedFileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      checksum,
    },
    requestContext,
  );

  await organizationBrainEmbeddingsQueue.add("extract-chunk-and-embed", {
    organizationBrainItemId: item.id,
    organizationId: user.organizationId,
    storageKey,
  });

  return item;
}

async function createFromPaste({
  input,
  actor,
  requestContext,
}: CreateOrganizationBrainPasteRequest): Promise<OrganizationBrainItemCreateResultDto> {
  const user = await getActiveOrganizationUser(
    actor.userId,
    actor.organizationId,
  );

  const content = input.content.trim();
  const buffer = Buffer.from(content, "utf8");
  const fileName = createPasteFileName(input.title);
  const storageKey = createOrganizationBrainStorageKey({
    organizationId: user.organizationId,
    fileName,
  });
  const checksum = createSha256Checksum(buffer);

  try {
    await uploadFile(storageKey, buffer, "text/plain");
  } catch {
    throw createError("Could not store organization brain content", 502);
  }

  const item = await persistOrganizationBrainItem(
    {
      organizationId: user.organizationId,
      createdByUserId: user.id,
      title: input.title,
      type: input.type,
      source: "PASTE",
      storageKey,
      fileName,
      mimeType: "text/plain",
      sizeBytes: buffer.length,
      checksum,
    },
    requestContext,
  );

  await organizationBrainEmbeddingsQueue.add("extract-chunk-and-embed", {
    organizationBrainItemId: item.id,
    organizationId: user.organizationId,
    storageKey,
  });

  return item;
}

async function listItems(
  organizationId: string,
  filters: OrganizationBrainItemListFilters,
  pagination: OrganizationBrainItemListPagination,
): Promise<{
  items: OrganizationBrainItemListItemDto[];
  pagination: OrganizationBrainItemListPaginationMeta;
}> {
  const [rows, total] = await Promise.all([
    organizationBrainRepository.findMany(organizationId, filters, pagination),
    organizationBrainRepository.count(organizationId, filters),
  ]);

  return {
    items: rows.map(toListItemDto),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}

async function getById(
  id: string,
  organizationId: string,
): Promise<OrganizationBrainItemDetailDto> {
  const item = await organizationBrainRepository.findById(id, organizationId);

  if (!item) {
    throw createError("Organization brain item not found", 404);
  }

  return toDetailDto(item);
}

async function getFileStreamById(
  id: string,
  organizationId: string,
): Promise<OrganizationBrainFileStreamDto> {
  const item = await organizationBrainRepository.findById(id, organizationId);

  if (!item) {
    throw createError("Organization brain item not found", 404);
  }

  const fileName = item.fileName ?? extractFileNameFromKey(item.storageKey);
  const { body, contentType, contentLength } = await getFileStream(
    item.storageKey,
  );

  return {
    body,
    contentType: contentType ?? item.mimeType,
    contentLength,
    fileName,
  };
}

async function deleteById(
  id: string,
  actor: OrganizationBrainActor,
  requestContext: RequestContext,
): Promise<void> {
  const user = await getActiveOrganizationUser(
    actor.userId,
    actor.organizationId,
  );

  const item = await organizationBrainRepository.findById(
    id,
    user.organizationId,
  );

  if (!item) {
    throw createError("Organization brain item not found", 404);
  }

  try {
    await deleteFile(item.storageKey);
  } catch {
    throw createError("Could not delete organization brain file", 502);
  }

  const deleted = await organizationBrainRepository.softDelete(
    id,
    user.organizationId,
    {
      action: "ORGANIZATION_BRAIN_ITEM_DELETED",
      actorType: "USER",
      actorUserId: user.id,
      organizationId: user.organizationId,
      oldValue: {
        title: item.title,
        type: item.type,
        source: item.source,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        checksum: item.checksum,
      },
      newValue: { deletedAt: new Date().toISOString() },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    },
  );

  if (!deleted) {
    throw createError("Organization brain item not found", 404);
  }
}

export const organizationBrainService = {
  createFromUpload,
  createFromPaste,
  listItems,
  getById,
  getFileStreamById,
  deleteById,
};
