import { getPrismaClient } from "../db";
import { DEFAULT_JOB_OPTIONS, getFlowProducer } from "./client";
import { QUEUE_NAMES, type AIAnalysisJobData } from "./types";

const prisma = getPrismaClient();

const ANALYSIS_TYPES: AIAnalysisJobData["analysisType"][] = ["SUMMARY", "RISK"];

export interface EnqueueAnalysisInput {
  contractId: string;
  organizationId: string;
  createdByUserId: string;
  extractedText: string;
}

// Enqueues SUMMARY + RISK as children of one aggregate parent job, instead of
// two independent jobs. The parent (packages/workers' ai-analysis-aggregate
// job) only runs once both children have settled, and is the single place
// that writes Contract.processingStatus — avoiding the last-write-wins race
// two independent jobs would otherwise have.
export async function enqueueContractAnalysis(
  input: EnqueueAnalysisInput,
): Promise<void> {
  await prisma.contract.update({
    where: { id: input.contractId, organizationId: input.organizationId },
    data: { processingStatus: "AI_PENDING" },
  });

  await getFlowProducer().add(
    {
      name: "aggregate",
      queueName: QUEUE_NAMES.AI_ANALYSIS_AGGREGATE,
      data: {
        contractId: input.contractId,
        organizationId: input.organizationId,
      },
      children: ANALYSIS_TYPES.map((analysisType) => ({
        name: "analyze",
        queueName: QUEUE_NAMES.AI_ANALYSIS,
        data: {
          contractId: input.contractId,
          organizationId: input.organizationId,
          createdByUserId: input.createdByUserId,
          analysisType,
          promptId: analysisType.toLowerCase(),
          schemaId: analysisType.toLowerCase(),
          extractedText: input.extractedText,
        },
        opts: {
          // Without this, a child that exhausts its retries and truly fails
          // (not the handled-terminal-failure case, which resolves normally)
          // would leave the parent stuck in "waiting-children" forever.
          ignoreDependencyOnFailure: true,
        },
      })),
    },
    {
      queuesOptions: {
        [QUEUE_NAMES.AI_ANALYSIS]: { defaultJobOptions: DEFAULT_JOB_OPTIONS },
        [QUEUE_NAMES.AI_ANALYSIS_AGGREGATE]: {
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        },
      },
    },
  );
}
