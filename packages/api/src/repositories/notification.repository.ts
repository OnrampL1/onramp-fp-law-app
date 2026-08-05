import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";

const prisma = getPrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_WINDOW_DAYS = 30;

const EXPIRING_CONTRACT_SELECT = {
  id: true,
  title: true,
  expirationDate: true,
} satisfies Prisma.ContractSelect;

const RECENT_ANALYSIS_SELECT = {
  id: true,
  contractId: true,
  createdAt: true,
  contract: { select: { title: true } },
} satisfies Prisma.AIAnalysisSelect;

export type ExpiringContractRow = Prisma.ContractGetPayload<{
  select: typeof EXPIRING_CONTRACT_SELECT;
}>;

export type RecentAnalysisRow = Prisma.AIAnalysisGetPayload<{
  select: typeof RECENT_ANALYSIS_SELECT;
}>;

const findExpiringContracts = async (
  organizationId: string,
  limit: number,
): Promise<ExpiringContractRow[]> => {
  const now = new Date();

  return prisma.contract.findMany({
    where: {
      organizationId,
      deletedAt: null,
      expirationDate: {
        gte: now,
        lte: new Date(now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS),
      },
    },
    select: EXPIRING_CONTRACT_SELECT,
    orderBy: { expirationDate: "asc" },
    take: limit,
  });
};

const findRecentCompletedAnalyses = async (
  organizationId: string,
  limit: number,
): Promise<RecentAnalysisRow[]> => {
  return prisma.aIAnalysis.findMany({
    where: {
      status: "COMPLETED",
      contract: { organizationId, deletedAt: null },
    },
    select: RECENT_ANALYSIS_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

export const notificationRepository = {
  findExpiringContracts,
  findRecentCompletedAnalyses,
};
