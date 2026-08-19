import type { AiMessage } from "../types";

export interface EmbeddingProviderResult {
  embeddings: number[][];
  tokensIn: number;
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<EmbeddingProviderResult>;
}

export interface CompletionProviderResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
}

export interface CompletionProvider {
  complete(
    messages: AiMessage[],
    model: string,
    temperature?: number,
    maxTokens?: number,
  ): Promise<CompletionProviderResult>;
}
