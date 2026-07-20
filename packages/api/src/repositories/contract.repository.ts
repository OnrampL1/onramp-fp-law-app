import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";

import {
  ContractListFilters,
  ContractListPagination,
  ContractListSort,
} from "../types/contract.types";
import { CONTRACT_LIST_SELECT } from "./selects/contract.select";

const prisma = getPrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

export type ContractListRow = Prisma.ContractGetPayload<{
  select: typeof CONTRACT_LIST_SELECT;
}>;

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

export const contractRepository = {
  findMany,
  count,
};
