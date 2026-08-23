import type { Prisma, RiskCategory } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import {
  DASHBOARD_CONTRACT_SELECT,
  type DashboardContractRow,
} from "./dashboard.repository";

const prisma = getPrismaClient();

export interface CategoryContractPair {
  category: RiskCategory;
  contractId: string;
}

async function getCategoryContractPairs(
  organizationId: string,
): Promise<CategoryContractPair[]> {
  const rows = await prisma.riskFlag.groupBy({
    by: ["category", "contractId"] as const,
    where: {
      organizationId,
      contract: { deletedAt: null },
    },
  });

  return rows;
}

function buildCategoryWhereClause(
  organizationId: string,
  category: RiskCategory,
): Prisma.ContractWhereInput {
  return {
    organizationId,
    deletedAt: null,
    riskFlags: { some: { category } },
  };
}

async function getContractsByCategory(
  organizationId: string,
  category: RiskCategory,
  pagination: { page: number; pageSize: number },
): Promise<DashboardContractRow[]> {
  return prisma.contract.findMany({
    where: buildCategoryWhereClause(organizationId, category),
    select: DASHBOARD_CONTRACT_SELECT,
    orderBy: { updatedAt: "desc" },
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });
}

async function countContractsByCategory(
  organizationId: string,
  category: RiskCategory,
): Promise<number> {
  return prisma.contract.count({
    where: buildCategoryWhereClause(organizationId, category),
  });
}

export const insightsRepository = {
  getCategoryContractPairs,
  getContractsByCategory,
  countContractsByCategory,
};
