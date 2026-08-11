import {
  Prisma,
  type AuditAction,
  type AuditActorType,
  type OrganizationBrainItemSource,
  type OrganizationBrainItemType,
} from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { auditService } from "../services/audit.service";
import type {
  OrganizationBrainItemListFilters,
  OrganizationBrainItemListPagination,
} from "../types/organization-brain.types";
import {
  ORGANIZATION_BRAIN_ITEM_DETAIL_SELECT,
  ORGANIZATION_BRAIN_ITEM_LIST_SELECT,
} from "./selects/organization-brain.select";

const prisma = getPrismaClient();

export type OrganizationBrainItemListRow =
  Prisma.OrganizationBrainItemGetPayload<{
    select: typeof ORGANIZATION_BRAIN_ITEM_LIST_SELECT;
  }>;

export type OrganizationBrainItemDetailRow =
  Prisma.OrganizationBrainItemGetPayload<{
    select: typeof ORGANIZATION_BRAIN_ITEM_DETAIL_SELECT;
  }>;

export interface CreateOrganizationBrainItemInput {
  organizationId: string;
  createdByUserId: string;
  title: string;
  type: OrganizationBrainItemType;
  source: OrganizationBrainItemSource;
  storageKey: string;
  fileName: string | null;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

export interface OrganizationBrainAuditEntry {
  action: AuditAction;
  actorType?: AuditActorType;
  actorUserId?: string;
  organizationId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

function buildWhereClause(
  organizationId: string,
  filters: OrganizationBrainItemListFilters,
): Prisma.OrganizationBrainItemWhereInput {
  const where: Prisma.OrganizationBrainItemWhereInput = {
    organizationId,
    deletedAt: null,
  };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.search) {
    where.title = {
      contains: filters.search,
      mode: "insensitive",
    };
  }

  return where;
}

async function create(
  input: CreateOrganizationBrainItemInput,
  audit: OrganizationBrainAuditEntry,
): Promise<OrganizationBrainItemListRow> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.organizationBrainItem.create({
      data: {
        organizationId: input.organizationId,
        createdByUserId: input.createdByUserId,
        title: input.title,
        type: input.type,
        source: input.source,
        storageKey: input.storageKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksum: input.checksum,
      },
      select: ORGANIZATION_BRAIN_ITEM_LIST_SELECT,
    });

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType ?? "USER",
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetEntityType: "OrganizationBrainItem",
      targetEntityId: item.id,
      newValue: audit.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return item;
  });
}

async function findMany(
  organizationId: string,
  filters: OrganizationBrainItemListFilters,
  pagination: OrganizationBrainItemListPagination,
): Promise<OrganizationBrainItemListRow[]> {
  return prisma.organizationBrainItem.findMany({
    where: buildWhereClause(organizationId, filters),
    select: ORGANIZATION_BRAIN_ITEM_LIST_SELECT,
    orderBy: { createdAt: "desc" },
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });
}

async function count(
  organizationId: string,
  filters: OrganizationBrainItemListFilters,
): Promise<number> {
  return prisma.organizationBrainItem.count({
    where: buildWhereClause(organizationId, filters),
  });
}

async function findById(
  id: string,
  organizationId: string,
): Promise<OrganizationBrainItemDetailRow | null> {
  return prisma.organizationBrainItem.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    select: ORGANIZATION_BRAIN_ITEM_DETAIL_SELECT,
  });
}

async function softDelete(
  id: string,
  organizationId: string,
  audit: OrganizationBrainAuditEntry,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const result = await tx.organizationBrainItem.updateMany({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count !== 1) {
      return false;
    }

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType ?? "USER",
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetEntityType: "OrganizationBrainItem",
      targetEntityId: id,
      oldValue: audit.oldValue as Prisma.InputJsonValue | undefined,
      newValue: audit.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return true;
  });
}

export const organizationBrainRepository = {
  create,
  findMany,
  count,
  findById,
  softDelete,
};
