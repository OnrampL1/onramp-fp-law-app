import {
  Prisma,
  type AIAnalysisType,
  type AuditActorType,
} from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { auditService } from "../services/audit.service";
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

export type CreateAIAnalysisStatus = "COMPLETED" | "FAILED";

export interface CreateAIAnalysisInput {
  contractId: string;
  createdByUserId: string;
  type: AIAnalysisType;
  status: CreateAIAnalysisStatus;
  promptUsed: string;
  promptVersion?: string;
  schemaVersion?: string;
  result?: Prisma.InputJsonValue;
  modelVersion?: string;
  tokensUsed?: number;
}

export interface AIAnalysisAuditEntry {
  actorType: AuditActorType;
  actorUserId?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
}

const create = async (
  input: CreateAIAnalysisInput,
  audit: AIAnalysisAuditEntry,
) => {
  return prisma.$transaction(async (tx) => {
    const analysis = await tx.aIAnalysis.create({
      data: {
        contractId: input.contractId,
        createdByUserId: input.createdByUserId,
        type: input.type,
        status: input.status,
        promptUsed: input.promptUsed,
        promptVersion: input.promptVersion,
        schemaVersion: input.schemaVersion,
        result: input.result,
        modelVersion: input.modelVersion,
        tokensUsed: input.tokensUsed,
      },
    });

    await auditService.logEvent(tx, {
      organizationId: audit.organizationId,
      actorType: audit.actorType,
      actorUserId: audit.actorUserId,
      action:
        input.status === "COMPLETED"
          ? "AI_ANALYSIS_COMPLETED"
          : "AI_ANALYSIS_FAILED",
      targetEntityType: "AIAnalysis",
      targetEntityId: analysis.id,
      contractId: input.contractId,
      newValue: { type: input.type, status: input.status },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });

    return analysis;
  });
};

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
  create,
  findMany,
  count,
  findById,
  findLatestByType,
};
