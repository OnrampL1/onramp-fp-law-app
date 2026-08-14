import { Prisma, type AuditAction, type AuditActorType } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { auditService } from "../services/audit.service";
import { CONTRACT_NOTE_SELECT } from "./selects/contract-note.select";
import type { ContractNoteListPagination } from "../types/contract-note.types";

const prisma = getPrismaClient();

export type ContractNoteRow = Prisma.ContractNoteGetPayload<{
  select: typeof CONTRACT_NOTE_SELECT;
}>;

export interface ContractNoteAuditEntry {
  action: AuditAction;
  actorType?: AuditActorType;
  actorUserId?: string;
  organizationId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const create = async (
  contractId: string,
  authorId: string,
  content: string,
  audit: ContractNoteAuditEntry,
): Promise<ContractNoteRow> => {
  return prisma.$transaction(async (tx) => {
    const note = await tx.contractNote.create({
      data: { contractId, authorId, content },
      select: CONTRACT_NOTE_SELECT,
    });

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType ?? "USER",
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetEntityType: "ContractNote",
      targetEntityId: note.id,
      contractId,
      newValue: audit.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return note;
  });
};

const findMany = async (
  contractId: string,
  organizationId: string,
  pagination: ContractNoteListPagination,
): Promise<ContractNoteRow[]> => {
  return prisma.contractNote.findMany({
    where: { contractId, contract: { organizationId }, deletedAt: null },
    select: CONTRACT_NOTE_SELECT,
    orderBy: { createdAt: "asc" },
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });
};

const count = async (
  contractId: string,
  organizationId: string,
): Promise<number> => {
  return prisma.contractNote.count({
    where: { contractId, contract: { organizationId }, deletedAt: null },
  });
};

const findById = async (
  id: string,
  contractId: string,
  organizationId: string,
): Promise<ContractNoteRow | null> => {
  return prisma.contractNote.findFirst({
    where: { id, contractId, contract: { organizationId }, deletedAt: null },
    select: CONTRACT_NOTE_SELECT,
  });
};

// organizationId is enforced directly in this query's where clause, not
// only via the findById ownership check that precedes it in the service —
// ContractNote has no organizationId column of its own, so this is the
// only thing standing between a crafted contractId and a cross-org write.
const update = async (
  id: string,
  contractId: string,
  organizationId: string,
  content: string,
  audit: ContractNoteAuditEntry,
): Promise<ContractNoteRow | null> => {
  return prisma.$transaction(async (tx) => {
    const result = await tx.contractNote.updateMany({
      where: {
        id,
        contractId,
        contract: { organizationId },
        deletedAt: null,
      },
      data: { content },
    });

    if (result.count !== 1) {
      return null;
    }

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType ?? "USER",
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetEntityType: "ContractNote",
      targetEntityId: id,
      contractId,
      oldValue: audit.oldValue as Prisma.InputJsonValue | undefined,
      newValue: audit.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return tx.contractNote.findFirst({
      where: { id, contractId },
      select: CONTRACT_NOTE_SELECT,
    });
  });
};

const softDelete = async (
  id: string,
  contractId: string,
  organizationId: string,
  audit: ContractNoteAuditEntry,
): Promise<boolean> => {
  return prisma.$transaction(async (tx) => {
    const result = await tx.contractNote.updateMany({
      where: {
        id,
        contractId,
        contract: { organizationId },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    if (result.count !== 1) {
      return false;
    }

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType ?? "USER",
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetEntityType: "ContractNote",
      targetEntityId: id,
      contractId,
      oldValue: audit.oldValue as Prisma.InputJsonValue | undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return true;
  });
};

export const contractNoteRepository = {
  create,
  findMany,
  count,
  findById,
  update,
  softDelete,
};
