import crypto from "node:crypto";
import path from "node:path";
import type { Contract, ContractLegalState } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import { uploadFile } from "../lib/storage";
import {
  contractsRepository,
  type CreateUploadedContractInput,
} from "../repositories/contracts.repository";
import type { CreateContractMetadataInput } from "../schemas/contracts.schemas";

const prisma = getPrismaClient();

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

export class ContractsService {
  async uploadContract(input: UploadContractInput): Promise<Contract> {
    const user = await this.getActiveOrganizationUser(
      input.actor.userId,
      input.actor.organizationId,
    );

    if (!input.file) {
      throw createError("Contract file is required", 422);
    }

    this.validateUploadedFile(input.file);

    const fileChecksum = createSha256Checksum(input.file.buffer);
    const sanitizedFileName = sanitizeFileName(input.file.originalname);
    const fileKey = createContractFileKey({
      organizationId: user.organizationId,
      fileName: sanitizedFileName,
    });

    await uploadFile(fileKey, input.file.buffer, input.file.mimetype);

    const createInput: CreateUploadedContractInput = {
      organizationId: user.organizationId,
      uploadedByUserId: user.id,
      title: input.metadata.title,
      counterparty: input.metadata.counterparty,
      tags: input.metadata.tags,
      expirationDate: input.metadata.expirationDate,
      legalState: input.metadata.legalState as ContractLegalState | undefined,
      fileKey,
      fileChecksum,
      extractedText: null,
      processingStatus: "PENDING_EXTRACTION",
      ipAddress: input.requestContext.ipAddress,
      userAgent: input.requestContext.userAgent,
    };

    return contractsRepository.createUploadedContract(createInput);
  }

  private async getActiveOrganizationUser(
    userId: string,
    organizationId: string,
  ) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
      include: {
        organization: true,
      },
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

  private validateUploadedFile(file: Express.Multer.File): void {
    if (file.size === 0 || file.buffer.length === 0) {
      throw createError("Contract file cannot be empty", 422);
    }

    const extension = path.extname(file.originalname).toLowerCase();

    if (extension === ".pdf" && !hasPdfSignature(file.buffer)) {
      throw createError("Uploaded PDF file is invalid", 422);
    }

    if (extension === ".doc" && !hasOleDocumentSignature(file.buffer)) {
      throw createError("Uploaded DOC file is invalid", 422);
    }

    if (extension === ".docx" && !hasZipSignature(file.buffer)) {
      throw createError("Uploaded DOCX file is invalid", 422);
    }

    if (extension === ".txt" && !looksLikePlainText(file.buffer)) {
      throw createError("Uploaded TXT file is invalid", 422);
    }
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

function hasOleDocumentSignature(buffer: Buffer): boolean {
  const oleSignature = Buffer.from([
    0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
  ]);

  return buffer.subarray(0, oleSignature.length).equals(oleSignature);
}

function hasZipSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 2).toString("utf8") === "PK";
}

function looksLikePlainText(buffer: Buffer): boolean {
  return !buffer.includes(0);
}

export const contractsService = new ContractsService();
