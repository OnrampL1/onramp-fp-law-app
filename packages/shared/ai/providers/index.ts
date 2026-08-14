import { getPrismaClient } from "../../db";
import { getAiProviderMode, getDefaultAiModel } from "../config";
import type { AiCompletionRequest, AiCompletionResult } from "../types";
import { openRouterProvider } from "./openrouter";
import { classifyProviderError } from "./errors";
import { openRouterEmbeddingProvider, OPENROUTER_EMBEDDING_MODEL } from "./openrouter-embeddings";
import { mockEmbeddingProvider, MOCK_EMBEDDING_MODEL } from "./mock-embeddings";
import { mockCompletionProvider } from "./mock-completion";
import { batchTextsByTokenLimit } from "./token-counting";
import type { CompletionProvider, EmbeddingProvider } from "./types";

export { AiProviderError } from "./errors";
export type {
  EmbeddingProvider,
  EmbeddingProviderResult,
  CompletionProvider,
  CompletionProviderResult,
} from "./types";
export {
  FORCE_INVALID_CITATION_MARKER,
  FORCE_ARTICLE_MENTION_MARKER,
} from "./mock-completion";
export {
  countTokens,
  batchTextsByTokenLimit,
  MAX_TOKENS_PER_EMBEDDING_REQUEST,
} from "./token-counting";

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
  // Nullable to cover Legal Knowledge Base ingestion (Phase 6): unlike a
  // contract or organization-brain item, embedding a legal source's chunks
  // isn't done on behalf of any single asking organization — it's a
  // background operator-triggered ingestion of a globally-shared corpus, so
  // there is no organization to attribute the AiCallLog to. AICallLog.
  // organizationId is already nullable in the schema for exactly this kind
  // of system-level call; every other caller (contract/org-brain retrieval)
  // continues to pass a real organizationId unchanged.
  organizationId: string | null;
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
//
// Internally batches request.texts by real token count before any provider
// call fires (see token-counting.ts) — a single call can cover far more
// text than one provider request allows. This was discovered, not assumed:
// Legal KB's proof-source run hit a real OpenRouter 400 ("maximum request
// size is 300000 tokens per request") on a batch the chars/4 heuristic
// estimated at ~170,000 tokens, because that heuristic badly undercounts
// Arabic's real BPE token density. Batching lives here rather than in any
// one caller (contracts/org-brain/legal-kb) because every caller sends an
// unbounded-size texts[] and none of them should have to know about the
// provider's request-size limit.
//
// Each batch is its own provider call and its own AiCallLog row, so
// cost/latency/errors stay attributable to the call that actually produced
// them. If a batch fails, the error propagates uncaught — embeddings
// already accumulated from earlier batches in this invocation are
// discarded, never returned, so a caller can never receive (and therefore
// never persist) a partial result. BullMQ's normal attempt/backoff retries
// the whole job from scratch in that case, which is safe (if wasteful)
// since nothing was persisted from the partial attempt.
export async function generateEmbeddings(
  request: EmbeddingRequest,
): Promise<EmbeddingResult> {
  if (request.texts.length === 0) {
    return { embeddings: [], tokensIn: 0, callLogId: "" };
  }

  const mode = getAiProviderMode();
  const provider: EmbeddingProvider =
    mode === "mock" ? mockEmbeddingProvider : openRouterEmbeddingProvider;
  const model = mode === "mock" ? MOCK_EMBEDDING_MODEL : OPENROUTER_EMBEDDING_MODEL;
  const providerName = mode === "mock" ? "mock" : "openrouter";

  const batches = batchTextsByTokenLimit(request.texts);

  const embeddings: number[][] = [];
  let tokensIn = 0;
  let callLogId = "";

  for (const batch of batches) {
    const startedAt = Date.now();

    try {
      const result = await provider.embed(batch);
      const latencyMs = Date.now() - startedAt;

      const log = await prisma.aICallLog.create({
        data: {
          organizationId: request.organizationId,
          provider: providerName,
          model,
          tokensIn: result.tokensIn,
          latencyMs,
          status: "SUCCESS",
        },
      });

      embeddings.push(...result.embeddings);
      tokensIn += result.tokensIn;
      callLogId = log.id;
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

  return { embeddings, tokensIn, callLogId };
}
