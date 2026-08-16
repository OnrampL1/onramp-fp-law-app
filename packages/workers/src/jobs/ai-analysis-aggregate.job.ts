import type { Job } from "bullmq";
import {
  getPrismaClient,
  metadataSchemaV1,
  type AIAnalysisAggregateJobData,
  type AIAnalysisAggregateJobResult,
  type AIAnalysisJobResult,
} from "@starter-kit/shared";
import { applyExtractedMetadata } from "../repositories/contract-processing.repository";

const prisma = getPrismaClient();

export async function processAIAnalysisAggregateJob(
  job: Job<AIAnalysisAggregateJobData, AIAnalysisAggregateJobResult>,
): Promise<AIAnalysisAggregateJobResult> {
  const { contractId, organizationId } = job.data;

  const childValues = await job.getChildrenValues<AIAnalysisJobResult>();
  const results = Object.values(childValues);

  const anyCompleted = results.some(
    (result) => result.status === "AI_COMPLETED",
  );
  const status = anyCompleted ? "AI_COMPLETED" : "AI_FAILED";
  const processingError = anyCompleted
    ? null
    : (results.find((result) => result.errorMessage)?.errorMessage ??
      "AI analysis failed");

  await prisma.contract.update({
    where: { id: contractId, organizationId },
    data: { processingStatus: status, processingError },
  });

  // If a METADATA analysis completed, apply it now that every sibling
  // analysis has settled — one coordination point for everything the AI
  // figured out about this contract, rather than a second trigger racing
  // this one. Re-validated against the schema here (not just trusted as
  // persisted JSON), same defense-in-depth already used by
  // getRiskOverview/getSummaryOverview.
  const metadataAnalysis = await prisma.aIAnalysis.findFirst({
    where: { contractId, type: "METADATA", status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
  });

  if (metadataAnalysis?.result) {
    const parsed = metadataSchemaV1.safeParse(metadataAnalysis.result);
    if (parsed.success) {
      await applyExtractedMetadata(contractId, parsed.data);
    }
  }

  return { status };
}
