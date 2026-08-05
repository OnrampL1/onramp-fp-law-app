import crypto from "node:crypto";
import path from "node:path";
import type { ContractLegalState } from "@prisma/client";
import { extractionQueue, getPrismaClient } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import { uploadFile } from "@starter-kit/shared";
import {
  contractRepository,
  type ContractDetailRow,
  type ContractListRow,
  type CreateUploadedContractInput,
} from "../repositories/contract.repository";
import type {
  CreateContractMetadataInput,
  UpdateContractMetadataInput,
} from "../schemas/contract.schemas";
import type {
  ContractContentDto,
  ContractDetailDto,
  ContractListFilters,
  ContractListItemDto,
  ContractListPagination,
  ContractListSort,
  ContractUploadResultDto,
  PaginationMeta,
} from "../types/contract.types";

const prisma = getPrismaClient();

// ─── Upload ─────────────────────────────────────────────────────────────

export interface UploadContractInput {
  metadata: CreateContractMetadataInput;
  file: Express.Multer.File | undefined;
  actor: {
    userId: string;
    organizationId: string;
  };
  requestContext: {
    ipAddress?: string;
    userAgent?: string;
  };
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

function validateUploadedFile(file: Express.Multer.File): void {
  if (file.size === 0 || file.buffer.length === 0) {
    throw createError("Contract file cannot be empty", 422);
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

  return `${safeBaseName || "contract"}${extension}`;
}

function createContractFileKey({
  organizationId,
  fileName,
}: {
  organizationId: string;
  fileName: string;
}): string {
  return `contracts/${organizationId}/${crypto.randomUUID()}-${fileName}`;
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

function toContractUploadResultDto(contract: {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: string;
  processingStatus: string;
  legalState: string | null;
  tags: string[];
  expirationDate: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): ContractUploadResultDto {
  return {
    id: contract.id,
    title: contract.title,
    counterparty: contract.counterparty,
    businessStatus:
      contract.businessStatus as ContractUploadResultDto["businessStatus"],
    processingStatus:
      contract.processingStatus as ContractUploadResultDto["processingStatus"],
    legalState: contract.legalState as ContractLegalState | null,
    tags: contract.tags,
    expirationDate: contract.expirationDate?.toISOString().slice(0, 10) ?? null,
    version: contract.version,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
  };
}

async function uploadContract(
  input: UploadContractInput,
): Promise<ContractUploadResultDto> {
  const user = await getActiveOrganizationUser(
    input.actor.userId,
    input.actor.organizationId,
  );

  if (!input.file) {
    throw createError("Contract file is required", 422);
  }

  validateUploadedFile(input.file);

  const fileChecksum = createSha256Checksum(input.file.buffer);
  const sanitizedFileName = sanitizeFileName(input.file.originalname);
  const fileKey = createContractFileKey({
    organizationId: user.organizationId,
    fileName: sanitizedFileName,
  });

  try {
    await uploadFile(fileKey, input.file.buffer, input.file.mimetype);
  } catch {
    throw createError("Could not store contract file", 502);
  }

  const createInput: CreateUploadedContractInput = {
    organizationId: user.organizationId,
    uploadedByUserId: user.id,
    title: input.metadata.title,
    counterparty: input.metadata.counterparty,
    tags: input.metadata.tags,
    expirationDate: input.metadata.expirationDate,
    legalState: input.metadata.legalState,
    fileKey,
    fileChecksum,
    extractedText: null,
    processingStatus: "PENDING_EXTRACTION",
  };

  const contract = await contractRepository.createUploadedContract(
    createInput,
    {
      action: "CONTRACT_UPLOADED",
      actorType: "USER",
      actorUserId: user.id,
      organizationId: user.organizationId,
      newValue: {
        title: createInput.title,
        counterparty: createInput.counterparty,
        tags: createInput.tags,
        expirationDate: createInput.expirationDate?.toISOString() ?? null,
        legalState: createInput.legalState ?? null,
      },
      ipAddress: input.requestContext.ipAddress,
      userAgent: input.requestContext.userAgent,
    },
  );

  try {
    await extractionQueue.add("extract", {
      contractId: contract.id,
      fileKey: contract.fileKey,
    });
  } catch {
    throw createError(
      "Contract was uploaded but could not be queued for processing",
      502,
    );
  }

  return toContractUploadResultDto(contract);
}

// ─── Update (metadata edit) ────────────────────────────────────────────

export interface UpdateContractMetadataActor {
  userId: string;
  organizationId: string;
}

function contractMetadataSnapshot(fields: {
  title: string;
  counterparty: string;
  tags: string[];
  effectiveDate: Date | null;
  expirationDate: Date | null;
  legalState: string | null;
}): Record<string, unknown> {
  return {
    title: fields.title,
    counterparty: fields.counterparty,
    tags: fields.tags,
    effectiveDate: fields.effectiveDate?.toISOString() ?? null,
    expirationDate: fields.expirationDate?.toISOString() ?? null,
    legalState: fields.legalState,
  };
}

async function updateContractMetadata(
  id: string,
  input: UpdateContractMetadataInput,
  actor: UpdateContractMetadataActor,
  requestContext: { ipAddress?: string; userAgent?: string },
): Promise<ContractDetailDto> {
  const user = await getActiveOrganizationUser(
    actor.userId,
    actor.organizationId,
  );

  const existing = await contractRepository.findById(id, user.organizationId);

  if (!existing) {
    throw createError("Contract not found", 404);
  }

  const updated = await contractRepository.updateMetadata(
    id,
    user.organizationId,
    input.version,
    {
      title: input.title,
      counterparty: input.counterparty,
      tags: input.tags,
      effectiveDate: input.effectiveDate,
      expirationDate: input.expirationDate,
      legalState: input.legalState,
    },
    {
      action: "CONTRACT_METADATA_UPDATED",
      actorType: "USER",
      actorUserId: user.id,
      organizationId: user.organizationId,
      oldValue: contractMetadataSnapshot(existing),
      newValue: contractMetadataSnapshot(input),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    },
  );

  if (!updated) {
    throw createError(
      "This contract was updated by someone else. Reload to see the latest version.",
      409,
    );
  }

  return toContractDetailDto(updated);
}

// ─── List ───────────────────────────────────────────────────────────────

function toContractListItemDto(row: ContractListRow): ContractListItemDto {
  return {
    id: row.id,
    title: row.title,
    counterparty: row.counterparty,
    status: row.legalState,
    tags: row.tags,
    effectiveDate: row.effectiveDate
      ? row.effectiveDate.toISOString().slice(0, 10)
      : null,
    expirationDate: row.expirationDate
      ? row.expirationDate.toISOString().slice(0, 10)
      : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listContracts(
  organizationId: string,
  filters: ContractListFilters,
  sort: ContractListSort,
  pagination: ContractListPagination,
): Promise<{ items: ContractListItemDto[]; pagination: PaginationMeta }> {
  const [rows, total] = await Promise.all([
    contractRepository.findMany(organizationId, filters, sort, pagination),
    contractRepository.count(organizationId, filters),
  ]);

  return {
    items: rows.map(toContractListItemDto),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}

// Get by ID
const UUID_PREFIX_LENGTH = 37; // 36-char UUID + 1 hyphen separtaor

function extractFileNameFromKey(fileKey: string): string {
  const baseName = fileKey.split("/").pop() ?? fileKey;
  return baseName.slice(UUID_PREFIX_LENGTH) || baseName;
}

function toContractDetailDto(row: ContractDetailRow): ContractDetailDto {
  return {
    id: row.id,
    title: row.title,
    counterparty: row.counterparty,
    businessStatus: row.businessStatus,
    processingStatus: row.processingStatus,
    processingError: row.processingError,
    legalState: row.legalState,
    tags: row.tags,
    effectiveDate: row.effectiveDate?.toISOString().slice(0, 10) ?? null,
    expirationDate: row.expirationDate?.toISOString().slice(0, 10) ?? null,
    fileName: extractFileNameFromKey(row.fileKey),
    version: row.version,
    uploadedByName: row.uploadedBy.fullName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getContractById(
  id: string,
  organizationId: string,
): Promise<ContractDetailDto> {
  const contract = await contractRepository.findById(id, organizationId);

  if (!contract) {
    throw createError("Contract not found", 404);
  }

  return toContractDetailDto(contract);
}

async function getContractContent(
  id: string,
  organizationId: string,
): Promise<ContractContentDto> {
  const contract = await contractRepository.findContentById(id, organizationId);

  if (!contract) {
    throw createError("Contract not found", 404);
  }

  return {
    processingStatus: contract.processingStatus,
    extractedText: contract.extractedText,
  };
}

export const contractService = {
  uploadContract,
  updateContractMetadata,
  listContracts,
  getContractById,
  getContractContent,
};
