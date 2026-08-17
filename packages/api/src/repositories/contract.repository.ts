import {
  Prisma,
  type AuditAction,
  type AuditActorType,
  type Contract,
  type ContractLegalState,
  type ContractProcessingStatus,
} from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { auditService } from "../services/audit.service";

import {
  ContractListFilters,
  ContractListPagination,
  ContractListSort,
} from "../types/contract.types";
import {
  CONTRACT_CONTENT_SELECT,
  CONTRACT_DETAIL_SELECT,
  CONTRACT_LIST_SELECT,
} from "./selects/contract.select";

const prisma = getPrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

export type ContractListRow = Prisma.ContractGetPayload<{
  select: typeof CONTRACT_LIST_SELECT;
}>;

export type ContractDetailRow = Prisma.ContractGetPayload<{
  select: typeof CONTRACT_DETAIL_SELECT;
}>;

export type ContractContentRow = Prisma.ContractGetPayload<{
  select: typeof CONTRACT_CONTENT_SELECT;
}>;

// ─── Create (upload) ────────────────────────────────────────────────────

export interface CreateUploadedContractInput {
  organizationId: string;
  uploadedByUserId: string;
  title: string;
  counterparty: string;
  tags: string[];
  expirationDate: Date | null;
  fileKey: string;
  fileChecksum: string;
  extractedText: string | null;
  processingStatus: ContractProcessingStatus;
}

/**
 * What the caller decides happened (action, actor, snapshot) — the
 * repository only fills in targetEntityType/targetEntityId/contractId,
 * since it already knows it's the Contract repository and which row it
 * just touched.
 */
export interface ContractAuditEntry {
  action: AuditAction;
  actorType: AuditActorType;
  actorUserId?: string;
  organizationId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const createUploadedContract = async (
  input: CreateUploadedContractInput,
  audit: ContractAuditEntry,
): Promise<Contract> => {
  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.create({
      data: {
        organizationId: input.organizationId,
        uploadedByUserId: input.uploadedByUserId,
        title: input.title,
        counterparty: input.counterparty,
        tags: input.tags,
        expirationDate: input.expirationDate,
        fileKey: input.fileKey,
        fileChecksum: input.fileChecksum,
        extractedText: input.extractedText,
        processingStatus: input.processingStatus,
      },
    });

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType,
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetEntityType: "Contract",
      targetEntityId: contract.id,
      contractId: contract.id,
      oldValue: audit.oldValue as Prisma.InputJsonValue | undefined,
      newValue: audit.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return contract;
  });
};

// ─── Update (metadata edit) ─────────────────────────────────────────────

export interface UpdateContractMetadataFields {
  title: string;
  counterparty: string;
  tags: string[];
  effectiveDate: Date | null;
  expirationDate: Date | null;
  legalState: ContractLegalState | null;
}

/**
 * Optimistic-concurrency update (DDS §1.8): the row is only touched when
 * `version` still matches what the editor loaded. `updateMany` (not
 * `update`) is deliberate — it lets a version/deletedAt mismatch report back
 * as "zero rows changed" instead of throwing, so the caller can tell a real
 * conflict apart from "not found" without a try/catch on a Prisma error
 * code. Returns null on that mismatch; the caller (service layer) is what
 * turns that into a 409.
 */
const updateMetadata = async (
  id: string,
  organizationId: string,
  expectedVersion: number,
  fields: UpdateContractMetadataFields,
  audit: ContractAuditEntry,
): Promise<ContractDetailRow | null> => {
  return prisma.$transaction(async (tx) => {
    const result = await tx.contract.updateMany({
      where: {
        id,
        organizationId,
        version: expectedVersion,
        deletedAt: null,
      },
      data: {
        title: fields.title,
        counterparty: fields.counterparty,
        tags: fields.tags,
        effectiveDate: fields.effectiveDate,
        expirationDate: fields.expirationDate,
        legalState: fields.legalState,
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      return null;
    }

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType,
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetEntityType: "Contract",
      targetEntityId: id,
      contractId: id,
      oldValue: audit.oldValue as Prisma.InputJsonValue | undefined,
      newValue: audit.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return tx.contract.findFirst({
      where: { id, organizationId },
      select: CONTRACT_DETAIL_SELECT,
    });
  });
};

/**
 * Optimistic-concurrency update for the manual Terminate/Reactivate action
 * — same `version`-gated updateMany pattern as updateMetadata, but touching
 * only legalState (title/counterparty/tags/dates are untouched by this
 * action).
 */
const setLegalState = async (
  id: string,
  organizationId: string,
  expectedVersion: number,
  legalState: ContractLegalState,
  audit: ContractAuditEntry,
): Promise<ContractDetailRow | null> => {
  return prisma.$transaction(async (tx) => {
    const result = await tx.contract.updateMany({
      where: {
        id,
        organizationId,
        version: expectedVersion,
        deletedAt: null,
      },
      data: {
        legalState,
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      return null;
    }

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType,
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetEntityType: "Contract",
      targetEntityId: id,
      contractId: id,
      oldValue: audit.oldValue as Prisma.InputJsonValue | undefined,
      newValue: audit.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return tx.contract.findFirst({
      where: { id, organizationId },
      select: CONTRACT_DETAIL_SELECT,
    });
  });
};

/**
 * Best-effort self-heal for a stale `legalState` found at read time (see
 * contract.service.ts refreshLegalState). Deliberately does NOT increment
 * `version` — this isn't a semantic edit a user made, and bumping it would
 * spuriously 409 a concurrent metadata edit/terminate that loaded the same
 * version. Still version-gated so it never clobbers a real concurrent write;
 * if it loses that race, the next read just corrects it again. No audit
 * entry either — this reflects the passage of time, not an actor's action.
 */
const correctLegalState = async (
  id: string,
  organizationId: string,
  expectedVersion: number,
  legalState: ContractLegalState,
): Promise<void> => {
  await prisma.contract.updateMany({
    where: {
      id,
      organizationId,
      version: expectedVersion,
      deletedAt: null,
    },
    data: {
      legalState,
    },
  });
};

// ─── List ───────────────────────────────────────────────────────────────

const buildWhereClause = (
  organizationId: string,
  filters: ContractListFilters,
): Prisma.ContractWhereInput => {
  const where: Prisma.ContractWhereInput = {
    organizationId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { counterparty: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.legalState) {
    where.legalState = filters.legalState;
  }

  if (filters.tag) {
    where.tags = { has: filters.tag };
  }

  if (filters.expirationBucket) {
    const now = new Date();

    switch (filters.expirationBucket) {
      case "expired":
        where.expirationDate = { lt: now };
        break;

      case "expiring_30":
        where.expirationDate = {
          gte: now,
          lte: new Date(now.getTime() + 30 * DAY_MS),
        };
        break;

      case "expiring_90":
        where.expirationDate = {
          gte: now,
          lte: new Date(now.getTime() + 90 * DAY_MS),
        };
        break;

      case "none":
        where.expirationDate = null;
        break;
    }
  }

  return where;
};

const findMany = async (
  organizationId: string,
  filters: ContractListFilters,
  sort: ContractListSort,
  pagination: ContractListPagination,
): Promise<ContractListRow[]> => {
  return prisma.contract.findMany({
    where: buildWhereClause(organizationId, filters),
    select: CONTRACT_LIST_SELECT,
    orderBy: {
      [sort.field]: sort.direction,
    },
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });
};

const count = async (
  organizationId: string,
  filters: ContractListFilters,
): Promise<number> => {
  return prisma.contract.count({
    where: buildWhereClause(organizationId, filters),
  });
};

const findById = async (
  id: string,
  organizationId: string,
): Promise<ContractDetailRow | null> => {
  return prisma.contract.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: CONTRACT_DETAIL_SELECT,
  });
};

const findContentById = async (
  id: string,
  organizationId: string,
): Promise<ContractContentRow | null> => {
  return prisma.contract.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: CONTRACT_CONTENT_SELECT,
  });
};

export const contractRepository = {
  createUploadedContract,
  updateMetadata,
  setLegalState,
  correctLegalState,
  findMany,
  count,
  findById,
  findContentById,
};
