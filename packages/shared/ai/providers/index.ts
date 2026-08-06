import { getPrismaClient } from "../../db";
import { getDefaultAiModel } from "../config";
import type { AiCompletionRequest, AiCompletionResult } from "../types";
import { callOpenRouter } from "./openrouter";
import { classifyProviderError } from "./errors";

export { AiProviderError } from "./errors";

const prisma = getPrismaClient();

export async function getCompletion(
  request: AiCompletionRequest,
): Promise<AiCompletionResult> {
  const model = request.model ?? getDefaultAiModel();
  const startedAt = Date.now();

  try {
    const result = await callOpenRouter(
      request.messages,
      model,
      request.temperature,
      request.maxTokens,
    );
    const latencyMs = Date.now() - startedAt;

    const log = await prisma.aICallLog.create({
      data: {
        organizationId: request.organizationId,
        provider: "openrouter",
        model,
        promptId: request.promptId,
        promptVersion: request.promptVersion,
        schemaId: request.schemaId,
        schemaVersion: request.schemaVersion,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs,
        status: "SUCCESS",
      },
    });

    return {
      content: result.content,
      model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      latencyMs,
      callLogId: log.id,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const providerError = classifyProviderError(error);

    await prisma.aICallLog.create({
      data: {
        organizationId: request.organizationId,
        provider: "openrouter",
        model,
        promptId: request.promptId,
        promptVersion: request.promptVersion,
        schemaId: request.schemaId,
        schemaVersion: request.schemaVersion,
        latencyMs,
        status: "PROVIDER_ERROR",
        errorMessage: providerError.message,
      },
    });

    throw providerError;
  }
}

export async function markValidationFailed(
  callLogId: string,
  errorMessage: string,
): Promise<void> {
  await prisma.aICallLog.update({
    where: { id: callLogId },
    data: {
      status: "VALIDATION_FAILED",
      errorMessage,
    },
  });
}
