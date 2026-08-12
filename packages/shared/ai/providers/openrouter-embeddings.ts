import OpenAI from "openai";
import { getOpenRouterApiKey } from "../config";
import type { EmbeddingProvider, EmbeddingProviderResult } from "./types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// OpenRouter serves a real /embeddings endpoint (OpenAI-compatible request
// and response shape), so embeddings go through the same provider and the
// same OPENROUTER_API_KEY as chat completions — no second provider or key
// needed. This corrects an earlier assumption in this codebase that
// OpenRouter didn't serve embeddings at all.
//
// Model id is provider-prefixed like every other OpenRouter model
// reference (see getDefaultAiModel's "openai/gpt-4o-mini" default).
// Deliberately still OpenAI's text-embedding-3-small under the hood, not a
// different model — its 1536-dimension output is what contract_chunks and
// organization_brain_chunks' `vector(1536)` columns are sized for;
// changing the underlying model would require a schema change too.
export const OPENROUTER_EMBEDDING_MODEL = "openai/text-embedding-3-small";

let client: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: getOpenRouterApiKey(),
      baseURL: OPENROUTER_BASE_URL,
    });
  }
  return client;
}

export async function embedWithOpenRouter(
  texts: string[],
): Promise<EmbeddingProviderResult> {
  const response = await getOpenRouterClient().embeddings.create({
    model: OPENROUTER_EMBEDDING_MODEL,
    input: texts,
  });

  return {
    embeddings: response.data.map((d) => d.embedding),
    tokensIn: response.usage?.total_tokens ?? 0,
  };
}

export const openRouterEmbeddingProvider: EmbeddingProvider = {
  embed: embedWithOpenRouter,
};
