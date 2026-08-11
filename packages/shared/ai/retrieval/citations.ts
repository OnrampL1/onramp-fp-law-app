import type { RetrievedChunk } from "./search";

export interface CitedSource {
  chunkId: string;
  excerpt: string;
}

export interface CitationVerificationResult {
  valid: boolean;
  invalidSources: CitedSource[];
  reason?: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// Deliberately strict: an excerpt is a claimed quote, not a paraphrase.
// Requiring an exact (whitespace/case-normalized) substring match is what
// makes "never show a fabricated citation" (AI_ARCHITECTURE.md Section 6)
// actually enforceable rather than aspirational — a looser fuzzy-match
// would let a plausible-sounding but invented excerpt through.
function excerptResolvesToContent(excerpt: string, content: string): boolean {
  const normalizedExcerpt = normalize(excerpt);
  if (normalizedExcerpt.length === 0) return false;
  return normalize(content).includes(normalizedExcerpt);
}

// Every claim in a generated answer must resolve to an actually-retrieved
// chunk (Section 6) — both that the cited chunk was genuinely part of the
// retrieved set (not a hallucinated or cross-contract id) and that the
// cited excerpt genuinely appears in that chunk's text (not invented).
// Pure and AI-call-free by design, so it's fully testable without a real
// or mock completion call — the retrieved set already encodes every
// contract/organization scoping guarantee upstream retrieval enforced.
export function verifyCitations(
  sources: CitedSource[],
  retrievedChunks: RetrievedChunk[],
): CitationVerificationResult {
  const chunkById = new Map(retrievedChunks.map((chunk) => [chunk.id, chunk]));
  const invalidSources: CitedSource[] = [];

  for (const source of sources) {
    const chunk = chunkById.get(source.chunkId);
    if (!chunk || !excerptResolvesToContent(source.excerpt, chunk.content)) {
      invalidSources.push(source);
    }
  }

  return {
    valid: invalidSources.length === 0,
    invalidSources,
    reason:
      invalidSources.length > 0
        ? `${invalidSources.length} of ${sources.length} cited source(s) do not resolve to retrieved chunk content`
        : undefined,
  };
}
