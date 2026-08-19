import { getPrismaClient, type RiskSchemaV3 } from "@starter-kit/shared";
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

    // RiskFlag always mirrors the *latest* completed RISK analysis for a
    // contract — re-analysis is an existing, supported flow (see
    // getRiskOverview's "latest by createdAt" read pattern), so previous
    // rows for this contract are replaced, not accumulated.
    if (input.type === "RISK") {
      const risk = input.result as RiskSchemaV3;

      await tx.riskFlag.deleteMany({
        where: { contractId: input.contractId },
      });

      if (risk.flags.length > 0) {
        await tx.riskFlag.createMany({
          data: risk.flags.map((flag) => ({
            organizationId: input.organizationId,
            contractId: input.contractId,
            analysisId: analysis.id,
            severity: flag.severity,
            category: flag.category,
            description: flag.description,
            sourceText: flag.sourceText,
          })),
        });
      }
    }

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
