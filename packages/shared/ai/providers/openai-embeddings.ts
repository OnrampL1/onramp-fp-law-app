import OpenAI from "openai";
import { getOpenAIApiKey } from "../config";
import type { EmbeddingProvider, EmbeddingProviderResult } from "./types";

// OpenRouter doesn't serve embeddings, so this talks to OpenAI directly —
// a second, deliberate exception alongside OpenRouter's chat completions,
// not a violation of "one provider" (there was never a rule against a
// second provider when a capability genuinely needs one; see
// AI_ARCHITECTURE.md Section 3.1).
export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";

let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getOpenAIApiKey() });
  }
  return client;
}

export async function embedWithOpenAI(
  texts: string[],
): Promise<EmbeddingProviderResult> {
  const response = await getOpenAIClient().embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: texts,
  });

  return {
    embeddings: response.data.map((d) => d.embedding),
    tokensIn: response.usage?.total_tokens ?? 0,
  };
}

export const openAIEmbeddingProvider: EmbeddingProvider = {
  embed: embedWithOpenAI,
};
