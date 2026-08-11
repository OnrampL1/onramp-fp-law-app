import type { EmbeddingProvider, EmbeddingProviderResult } from "./types";

// Deterministic, offline stand-in for a real embedding model — selected via
// AI_PROVIDER_MODE=mock (see ../config). Not a quality embedding: a crude
// hashed bag-of-words projection. Good enough that chunks sharing
// vocabulary with a query rank above unrelated chunks in tests, which is
// all chunking/storage/ranking work needs while iterating offline. Real
// end-to-end smoke tests are a deliberate switch back to AI_PROVIDER_MODE=real.
export const MOCK_EMBEDDING_MODEL = "mock-embedding";
const DIMENSIONS = 1536;

function hashStringToSeed(value: string): number {
  let hash = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wordVectorCache = new Map<string, number[]>();

function wordVector(word: string): number[] {
  const cached = wordVectorCache.get(word);
  if (cached) return cached;

  const rand = mulberry32(hashStringToSeed(word));
  const vector = new Array<number>(DIMENSIONS);
  for (let i = 0; i < DIMENSIONS; i++) {
    vector[i] = rand() * 2 - 1;
  }
  wordVectorCache.set(word, vector);
  return vector;
}

function embedOne(text: string): number[] {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const sum = new Array<number>(DIMENSIONS).fill(0);

  for (const word of words) {
    const vector = wordVector(word);
    for (let i = 0; i < DIMENSIONS; i++) {
      sum[i] += vector[i];
    }
  }

  const magnitude = Math.sqrt(sum.reduce((acc, v) => acc + v * v, 0)) || 1;
  return sum.map((v) => v / magnitude);
}

export async function embedWithMock(
  texts: string[],
): Promise<EmbeddingProviderResult> {
  return {
    embeddings: texts.map(embedOne),
    tokensIn: 0,
  };
}

export const mockEmbeddingProvider: EmbeddingProvider = {
  embed: embedWithMock,
};
