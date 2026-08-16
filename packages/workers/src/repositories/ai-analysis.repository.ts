import { getPrismaClient } from "@starter-kit/shared";
import type { Prisma } from "@prisma/client";

const prisma = getPrismaClient();

type AnalysisType = "SUMMARY" | "RISK" | "CLAUSE_QUERY" | "METADATA";

export interface CompletedAnalysisInput {
  contractId: string;
  createdByUserId: string;
  organizationId: string;
  type: AnalysisType;
  promptUsed: string;
  promptVersion: string;
  schemaVersion: string;
  result: unknown;
  modelVersion: string;
  tokensUsed: number;
}

export async function markAnalysisCompleted(
  input: CompletedAnalysisInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const analysis = await tx.aIAnalysis.create({
      data: {
        contractId: input.contractId,
        createdByUserId: input.createdByUserId,
        type: input.type,
        status: "COMPLETED",
        promptUsed: input.promptUsed,
        promptVersion: input.promptVersion,
        schemaVersion: input.schemaVersion,
        result: input.result as Prisma.InputJsonValue,
        modelVersion: input.modelVersion,
        tokensUsed: input.tokensUsed,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorType: "SYSTEM",
        action: "AI_ANALYSIS_COMPLETED",
        targetEntityType: "AIAnalysis",
        targetEntityId: analysis.id,
        contractId: input.contractId,
        newValue: { type: input.type, status: "COMPLETED" },
      },
    });
  });
}

export interface FailedAnalysisInput {
  contractId: string;
  createdByUserId: string;
  organizationId: string;
  type: AnalysisType;
  promptUsed: string;
  errorMessage: string;
}

export async function markAnalysisFailed(
  input: FailedAnalysisInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const analysis = await tx.aIAnalysis.create({
      data: {
        contractId: input.contractId,
        createdByUserId: input.createdByUserId,
        type: input.type,
        status: "FAILED",
        promptUsed: input.promptUsed,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorType: "SYSTEM",
        action: "AI_ANALYSIS_FAILED",
        targetEntityType: "AIAnalysis",
        targetEntityId: analysis.id,
        contractId: input.contractId,
        newValue: {
          type: input.type,
          status: "FAILED",
          error: input.errorMessage,
        },
      },
    });
  });
}
