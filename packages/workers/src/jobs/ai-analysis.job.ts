import type { Job } from "bullmq";
import {
  getValidatedCompletion,
  resolvePrompt,
  resolveSchema,
  AiProviderError,
  AiValidationError,
  type AIAnalysisJobData,
  type AIAnalysisJobResult,
  type AiMessage,
} from "@starter-kit/shared";
import {
  markAnalysisCompleted,
  markAnalysisFailed,
} from "../repositories/ai-analysis.repository";

export async function processAIAnalysisJob(
  job: Job<AIAnalysisJobData, AIAnalysisJobResult>,
): Promise<AIAnalysisJobResult> {
  const {
    contractId,
    organizationId,
    createdByUserId,
    analysisType,
    promptId,
    schemaId,
    extractedText,
  } = job.data;

  const prompt = resolvePrompt(promptId);
  const { schema, version: schemaVersion } = resolveSchema(schemaId);

  const messages: AiMessage[] = [
    { role: "system", content: prompt.content },
    { role: "user", content: extractedText },
  ];

  try {
    const result = await getValidatedCompletion(
      {
        messages,
        promptId: prompt.promptId,
        promptVersion: prompt.version,
        schemaId,
        schemaVersion,
        organizationId,
      },
      schema,
    );

    await markAnalysisCompleted({
      contractId,
      createdByUserId,
      organizationId,
      type: analysisType,
      promptUsed: prompt.content,
      promptVersion: prompt.version,
      schemaVersion,
      result: result.data,
      modelVersion: result.model,
      tokensUsed: result.tokensIn + result.tokensOut,
    });

    return { status: "AI_COMPLETED" };
  } catch (error) {
    if (error instanceof AiValidationError) {
      await markAnalysisFailed({
        contractId,
        createdByUserId,
        organizationId,
        type: analysisType,
        promptUsed: prompt.content,
        errorMessage: error.message,
      });
      return { status: "AI_FAILED", errorMessage: error.message };
    }

    if (error instanceof AiProviderError && !error.retryable) {
      await markAnalysisFailed({
        contractId,
        createdByUserId,
        organizationId,
        type: analysisType,
        promptUsed: prompt.content,
        errorMessage: error.message,
      });
      return { status: "AI_FAILED", errorMessage: error.message };
    }

    throw error;
  }
}
