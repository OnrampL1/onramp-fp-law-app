import { getPrismaClient } from "../../db";
import { getAiProviderMode, getDefaultAiModel } from "../config";
import type { AiCompletionRequest, AiCompletionResult } from "../types";
import { openRouterProvider } from "./openrouter";
import { classifyProviderError } from "./errors";
import { openRouterEmbeddingProvider, OPENROUTER_EMBEDDING_MODEL } from "./openrouter-embeddings";
import { mockEmbeddingProvider, MOCK_EMBEDDING_MODEL } from "./mock-embeddings";
import { mockCompletionProvider } from "./mock-completion";
import type { CompletionProvider, EmbeddingProvider } from "./types";

export { AiProviderError } from "./errors";
export type {
  EmbeddingProvider,
  EmbeddingProviderResult,
  CompletionProvider,
  CompletionProviderResult,
} from "./types";
export { FORCE_INVALID_CITATION_MARKER } from "./mock-completion";

const prisma = getPrismaClient();
const MOCK_COMPLETION_MODEL = "mock-completion";

export async function getCompletion(
  request: AiCompletionRequest,
): Promise<AiCompletionResult> {
  const mode = getAiProviderMode();
  const provider: CompletionProvider =
    mode === "mock" ? mockCompletionProvider : openRouterProvider;
  const model =
    mode === "mock" ? MOCK_COMPLETION_MODEL : (request.model ?? getDefaultAiModel());
  const providerName = mode === "mock" ? "mock" : "openrouter";
  const startedAt = Date.now();

  try {
    const result = await provider.complete(
      request.messages,
      model,
      request.temperature,
      request.maxTokens,
    );
    const latencyMs = Date.now() - startedAt;

    const log = await prisma.aICallLog.create({
      data: {
        organizationId: request.organizationId,
        provider: providerName,
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
        provider: providerName,
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

export interface EmbeddingRequest {
  texts: string[];
  organizationId: string;
}

export interface EmbeddingResult {
  embeddings: number[][];
  tokensIn: number;
  callLogId: string;
}

// The embedding-side choke point, mirroring getCompletion() above: mode
// selection and AiCallLog observability happen here once, so neither the
// chunking pipeline nor any future caller has to remember to log a call
// itself (AI_ARCHITECTURE.md Section 13).
export async function generateEmbeddings(
  request: EmbeddingRequest,
): Promise<EmbeddingResult> {
  const mode = getAiProviderMode();
  const provider: EmbeddingProvider =
    mode === "mock" ? mockEmbeddingProvider : openRouterEmbeddingProvider;
  const model = mode === "mock" ? MOCK_EMBEDDING_MODEL : OPENROUTER_EMBEDDING_MODEL;
  const providerName = mode === "mock" ? "mock" : "openrouter";
  const startedAt = Date.now();

  try {
    const { embeddings, tokensIn } = await provider.embed(request.texts);
    const latencyMs = Date.now() - startedAt;

    const log = await prisma.aICallLog.create({
      data: {
        organizationId: request.organizationId,
        provider: providerName,
        model,
        tokensIn,
        latencyMs,
        status: "SUCCESS",
      },
    });

    return { embeddings, tokensIn, callLogId: log.id };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const providerError = classifyProviderError(error);

    await prisma.aICallLog.create({
      data: {
        organizationId: request.organizationId,
        provider: providerName,
        model,
        latencyMs,
        status: "PROVIDER_ERROR",
        errorMessage: providerError.message,
      },
    });

    throw providerError;
  }
}
