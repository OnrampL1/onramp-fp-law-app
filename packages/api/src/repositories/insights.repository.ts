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

async function getContractsByCategory(
  organizationId: string,
  category: RiskCategory,
): Promise<DashboardContractRow[]> {
  const where: Prisma.ContractWhereInput = {
    organizationId,
    deletedAt: null,
    riskFlags: { some: { category } },
  };

  return prisma.contract.findMany({
    where,
    select: DASHBOARD_CONTRACT_SELECT,
    orderBy: { updatedAt: "desc" },
  });
}

export const insightsRepository = {
  getCategoryContractPairs,
  getContractsByCategory,
};
