import { get_encoding, type Tiktoken } from "tiktoken";

// cl100k_base is the BPE encoding behind every current OpenAI embedding
// model (text-embedding-3-small/-large, and the older ada-002) — there is
// no embedding-specific encoding to pick between. Loaded once and kept for
// the process lifetime rather than freed per call: this module is used from
// a long-running worker process, and re-loading the encoding's vocabulary
// table on every request would be wasted work.
let encoding: Tiktoken | null = null;

function getEncoding(): Tiktoken {
  if (!encoding) {
    encoding = get_encoding("cl100k_base");
  }
  return encoding;
}

// Real token count, not the chars/4 heuristic chunking.ts uses for
// chunk-sizing decisions. That heuristic is calibrated for English and
// undercounts non-Latin scripts badly — Arabic legal text measured at
// roughly 1.5 chars/token here, not 4 — which is exactly what let Legal
// KB's proof-source batch quietly exceed OpenRouter's real per-request
// token cap despite looking safely under it by the heuristic. Batch-sizing
// decisions need the real count; chunk-sizing (chunking.ts) is a separate,
// deliberately cheaper concern and is untouched by this.
export function countTokens(text: string): number {
  return getEncoding().encode(text).length;
}

// Comfortably under OpenRouter's real 300,000-tokens-per-request cap
// (confirmed via a live 400 response against the proof source), not right
// up against it — token counts here are pre-call estimates from our own
// tokenizer, and the provider is free to count slightly differently.
export const MAX_TOKENS_PER_EMBEDDING_REQUEST = 250_000;

// Greedily groups texts into token-budgeted batches, preserving input
// order (callers rely on batch-concatenation order matching the original
// texts order to re-associate embeddings with their source chunks). A
// single text that alone exceeds the budget still gets its own batch
// rather than being dropped or erroring here — chunking.ts already caps
// individual chunks at ~800 tokens by design, so this should never fire in
// practice; it's a fallback, not a validated path.
export function batchTextsByTokenLimit(
  texts: string[],
  maxTokensPerBatch: number = MAX_TOKENS_PER_EMBEDDING_REQUEST,
): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const text of texts) {
    const tokens = countTokens(text);
    if (current.length > 0 && currentTokens + tokens > maxTokensPerBatch) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(text);
    currentTokens += tokens;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}
