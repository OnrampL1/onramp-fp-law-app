import { getPrismaClient } from "../../db";
import type { RetrievedChunk } from "./search";

const prisma = getPrismaClient();

export interface CitedSource {
  chunkId: string;
  excerpt: string;
}

export interface CitationVerificationResult {
  valid: boolean;
  invalidSources: CitedSource[];
  reason?: string;
}

// Alef-hamza forms (أ/إ/آ/ٱ) are standard orthographic variants of bare
// alef (ا) in Arabic — the same letter written with/without a hamza seat
// depending on scraping source or transcription convention, not a
// different letter. Folding them together is Unicode/orthographic
// canonicalization, not fuzzy matching: it never changes which words are
// being compared, only how one letter is spelled.
const ALEF_HAMZA_VARIANTS = /[أإآٱ]/g;

// A single space (or run of whitespace) immediately before a punctuation
// mark is a scraping artifact of the source documents (e.g. "breach ."),
// not a content difference — the model naturally renders "breach." without
// the stray space. Stripped for both Latin and Arabic punctuation.
const WHITESPACE_BEFORE_PUNCTUATION = /\s+([.,;:!?،؛؟])/g;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(ALEF_HAMZA_VARIANTS, "ا")
    .replace(WHITESPACE_BEFORE_PUNCTUATION, "$1")
    .replace(/\s+/g, " ")
    .trim();
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

export interface ArticleExistenceResult {
  valid: boolean;
  invalidArticleNumbers: string[];
  reason?: string;
}

// Same "المادة N" detection shape as search.ts's
// extractArticleNumberFromQuery, but matched globally (every occurrence in
// a body of prose, not just the first) — a generated answer can
// legitimately reference several articles, unlike a search question.
const ARABIC_ARTICLE_WORD = "المادة";
const ARABIC_BIS_WORD = "مكرر";
const ANSWER_ARTICLE_NUMBER_PATTERN = new RegExp(
  `${ARABIC_ARTICLE_WORD}\\s*(\\d+(?:\\s*-\\s*(?:\\d+|${ARABIC_BIS_WORD}))?)`,
  "g",
);

// Exported for direct unit testing of the detection regex in isolation.
export function extractArticleNumbersFromText(text: string): string[] {
  const numbers = new Set<string>();
  for (const match of text.matchAll(ANSWER_ARTICLE_NUMBER_PATTERN)) {
    numbers.add(match[1].replace(/\s+/g, ""));
  }
  return [...numbers];
}

// Additive on top of verifyCitations(), not a replacement: a Legal KB
// answer's prose can name an article number ("Article 654 of the Code of
// Obligations and Contracts states...") that verifyCitations() has no way
// to check, since it only verifies that a cited excerpt's *text* genuinely
// appears in a retrieved chunk — it says nothing about whether an article
// number merely *mentioned* in prose is real.
//
// Deliberately source-scoped, not corpus-wide: Batch 4's cross-source
// ambiguity fix established that article_number is only unique *within*
// one LegalSource, not across all five (e.g. "Article 654" is a different,
// unrelated article in the Code of Obligations and Contracts than in the
// Code of Commerce). Checking "does this number exist anywhere in the
// corpus" would let an answer attribute a real article number to the wrong
// cited instrument and still pass — checking it only against the
// LegalSource(s) actually cited in this answer is what catches that.
export async function verifyArticleExistence(
  answerText: string,
  sources: CitedSource[],
  retrievedChunks: RetrievedChunk[],
): Promise<ArticleExistenceResult> {
  const mentionedNumbers = extractArticleNumbersFromText(answerText);
  if (mentionedNumbers.length === 0) {
    return { valid: true, invalidArticleNumbers: [] };
  }

  const chunkById = new Map(retrievedChunks.map((chunk) => [chunk.id, chunk]));
  const citedSourceIds = [
    ...new Set(
      sources
        .map((source) => chunkById.get(source.chunkId)?.sourceId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (citedSourceIds.length === 0) {
    return {
      valid: false,
      invalidArticleNumbers: mentionedNumbers,
      reason: `Answer references article number(s) ${mentionedNumbers.join(", ")} but cites no source to verify them against`,
    };
  }

  const existingRows = await prisma.$queryRaw<{ article_number: string }[]>`
    SELECT DISTINCT article_number
    FROM legal_chunks
    WHERE legal_source_id = ANY(${citedSourceIds}::uuid[])
      AND article_number = ANY(${mentionedNumbers}::text[])
  `;
  const existingNumbers = new Set(existingRows.map((row) => row.article_number));

  const invalidArticleNumbers = mentionedNumbers.filter(
    (number) => !existingNumbers.has(number),
  );

  return {
    valid: invalidArticleNumbers.length === 0,
    invalidArticleNumbers,
    reason:
      invalidArticleNumbers.length > 0
        ? `Answer references article number(s) not found in the cited source(s): ${invalidArticleNumbers.join(", ")}`
        : undefined,
  };
}
