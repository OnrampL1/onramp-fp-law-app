import { Prisma, type AIAnalysisType } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import {
  AI_ANALYSIS_DETAIL_SELECT,
  AI_ANALYSIS_LIST_SELECT,
} from "./selects/ai-analysis.select";

const prisma = getPrismaClient();

export type AIAnalysisListRow = Prisma.AIAnalysisGetPayload<{
  select: typeof AI_ANALYSIS_LIST_SELECT;
}>;

export type AIAnalysisDetailRow = Prisma.AIAnalysisGetPayload<{
  select: typeof AI_ANALYSIS_DETAIL_SELECT;
}>;

const findMany = async (
  contractId: string,
  organizationId: string,
  pagination: { page: number; pageSize: number },
): Promise<AIAnalysisListRow[]> => {
  return prisma.aIAnalysis.findMany({
    where: { contractId, contract: { organizationId } },
    select: AI_ANALYSIS_LIST_SELECT,
    orderBy: { createdAt: "desc" },
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });
};

const count = async (
  contractId: string,
  organizationId: string,
): Promise<number> => {
  return prisma.aIAnalysis.count({
    where: { contractId, contract: { organizationId } },
  });
};

const findById = async (
  id: string,
  contractId: string,
  organizationId: string,
): Promise<AIAnalysisDetailRow | null> => {
  return prisma.aIAnalysis.findFirst({
    where: { id, contractId, contract: { organizationId } },
    select: AI_ANALYSIS_DETAIL_SELECT,
  });
};

const findLatestByType = async (
  contractId: string,
  organizationId: string,
  type: AIAnalysisType,
): Promise<AIAnalysisDetailRow | null> => {
  return prisma.aIAnalysis.findFirst({
    where: {
      contractId,
      contract: { organizationId },
      type,
      status: "COMPLETED",
    },
    select: AI_ANALYSIS_DETAIL_SELECT,
    orderBy: { createdAt: "desc" },
  });
};

export const aiAnalysisRepository = {
  findMany,
  count,
  findById,
  findLatestByType,
};
