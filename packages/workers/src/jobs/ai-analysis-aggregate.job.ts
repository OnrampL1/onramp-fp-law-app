import type { Job } from "bullmq";
import {
  getPrismaClient,
  type AIAnalysisAggregateJobData,
  type AIAnalysisAggregateJobResult,
  type AIAnalysisJobResult,
} from "@starter-kit/shared";

const prisma = getPrismaClient();

export async function processAIAnalysisAggregateJob(
  job: Job<AIAnalysisAggregateJobData, AIAnalysisAggregateJobResult>,
): Promise<AIAnalysisAggregateJobResult> {
  const { contractId, organizationId } = job.data;

  const childValues = await job.getChildrenValues<AIAnalysisJobResult>();
  const results = Object.values(childValues);

  const anyCompleted = results.some((result) => result.status === "AI_COMPLETED");
  const status = anyCompleted ? "AI_COMPLETED" : "AI_FAILED";
  const processingError = anyCompleted
    ? null
    : (results.find((result) => result.errorMessage)?.errorMessage ??
      "AI analysis failed");

  await prisma.contract.update({
    where: { id: contractId, organizationId },
    data: { processingStatus: status, processingError },
  });

  return { status };
}
