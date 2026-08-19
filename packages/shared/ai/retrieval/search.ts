import { Prisma } from "@prisma/client";
import { getPrismaClient } from "../../db";
import { generateEmbeddings } from "../providers";
import { optimizeContext } from "../context";
import { getLegalKbLicenseMode, getAllowedLegalLicenseStatuses } from "../config";
import { LEGAL_KB_PRODUCTION_CLEARANCES } from "./legal-kb-production-clearances";

const prisma = getPrismaClient();

export interface RetrievedChunk {
  id: string;
  sourceId: string;
  chunkIndex: number;
  headingPath: string | null;
  content: string;
  score: number;
  // Legal KB only — Contract/Organization Brain chunks have no article
  // number and their candidate rows never select one, so this stays
  // undefined (not present on the object at all, not merely null) for
  // those corpora rather than forcing a meaningless field onto their
  // shape. See formatSourceBlocks() in investigator.ts for the one place
  // this is read.
  articleNumber?: string | null;
}

// Reciprocal Rank Fusion: combines two ranked lists (vector similarity,
// full-text relevance) without needing their scores on a comparable scale —
// cosine similarity and ts_rank aren't otherwise commensurable. K=60 is the
// standard RRF constant from the literature, not a tuned value.
const RRF_K = 60;
const CANDIDATES_PER_METHOD = 20;
const DEFAULT_RESULT_LIMIT = 8;
// A given article_number is normally one chunk, but isn't guaranteed to be
// (a long article could in principle split across chunk_index values, or —
// unlikely but not impossible — collide across two different sources) —
// capped small since this is an exact lookup, not a ranked candidate pool.
const DIRECT_ARTICLE_LOOKUP_LIMIT = 5;

interface CandidateRow {
  id: string;
  source_id: string;
  chunk_index: number;
  heading_path: string | null;
  content: string;
  // Only ever selected by Legal KB's candidate queries (legal_chunks has
  // the column; contract_chunks/organization_brain_chunks don't) — absent
  // on the object entirely for the other two corpora's rows, not merely
  // null. See hybridSearch()'s mapping below.
  article_number?: string | null;
}

// Exported for direct unit testing — the RRF dedup/scoring math (a chunk
// found by both methods must outscore one found by only one, at any rank
// combination) is the one part of this pipeline with real off-by-one risk.
export function fuseRankings(
  vectorRows: CandidateRow[],
  fullTextRows: CandidateRow[],
): { row: CandidateRow; score: number }[] {
  const fused = new Map<string, { row: CandidateRow; score: number }>();

  const addRanked = (rows: CandidateRow[]) => {
    rows.forEach((row, rank) => {
      const contribution = 1 / (RRF_K + rank + 1);
      const existing = fused.get(row.id);
      fused.set(row.id, {
        row: existing?.row ?? row,
        score: (existing?.score ?? 0) + contribution,
      });
    });
  };

  addRanked(vectorRows);
  addRanked(fullTextRows);

  return [...fused.values()].sort((a, b) => b.score - a.score);
}

// The shared shape behind every corpus's hybrid search (AI_ROADMAP.md
// Section 4). Each corpus supplies its own org/parent-scoped, type-safe
// $queryRaw calls via `fetcher`; this function owns only the algorithm:
// embed the query once, fetch both candidate sets in parallel, fuse via
// RRF, then optimizeContext.
interface CandidateFetcher {
  vectorCandidates(
    queryEmbedding: number[],
    limit: number,
  ): Promise<CandidateRow[]>;
  fullTextCandidates(query: string, limit: number): Promise<CandidateRow[]>;
}

async function hybridSearch(
  fetcher: CandidateFetcher,
  // Nullable for Legal KB: a structurally global, non-org-owned corpus has
  // no organizationId to attribute the query-time AiCallLog to — same
  // nullability and reasoning as EmbeddingRequest.organizationId in
  // providers/index.ts, which this passes straight through to.
  organizationId: string | null,
  query: string,
  limit: number,
): Promise<RetrievedChunk[]> {
  const { embeddings } = await generateEmbeddings({
    texts: [query],
    organizationId,
  });
  const queryEmbedding = embeddings[0];
  if (!queryEmbedding) return [];

  const [vectorRows, fullTextRows] = await Promise.all([
    fetcher.vectorCandidates(queryEmbedding, CANDIDATES_PER_METHOD),
    fetcher.fullTextCandidates(query, CANDIDATES_PER_METHOD),
  ]);

  const results = fuseRankings(vectorRows, fullTextRows)
    .slice(0, limit)
    .map(({ row, score }) => ({
      id: row.id,
      sourceId: row.source_id,
      chunkIndex: row.chunk_index,
      headingPath: row.heading_path,
      content: row.content,
      score,
      // Conditional, not `row.article_number ?? null`: Contract/
      // Organization Brain rows never have this key at all, and this
      // keeps it genuinely absent on their RetrievedChunk objects rather
      // than present-but-always-null.
      ...(row.article_number !== undefined ? { articleNumber: row.article_number } : {}),
    }));

  return optimizeContext(results);
}

export interface SearchParams {
  contractId: string;
  organizationId: string;
  query: string;
  limit?: number;
}

// Hybrid retrieval (AI_ARCHITECTURE.md Section 6): vector similarity alone
// misses defined terms and exact legal phrases that need keyword matching,
// not just semantic similarity — hence fusing with full-text search rather
// than using either alone. Both legs are org- and contract-scoped in the
// query itself (Section 14), not filtered after the fact.
export async function searchContractChunks(
  params: SearchParams,
): Promise<RetrievedChunk[]> {
  const limit = params.limit ?? DEFAULT_RESULT_LIMIT;

  return hybridSearch(
    {
      vectorCandidates: (queryEmbedding, candidateLimit) => {
        const vectorLiteral = `[${queryEmbedding.join(",")}]`;
        return prisma.$queryRaw<CandidateRow[]>`
          SELECT id, contract_id AS source_id, chunk_index, heading_path, content
          FROM contract_chunks
          WHERE contract_id = ${params.contractId}::uuid
            AND organization_id = ${params.organizationId}::uuid
            AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vectorLiteral}::vector
          LIMIT ${candidateLimit}
        `;
      },
      fullTextCandidates: (query, candidateLimit) =>
        prisma.$queryRaw<CandidateRow[]>`
          SELECT id, contract_id AS source_id, chunk_index, heading_path, content
          FROM contract_chunks
          WHERE contract_id = ${params.contractId}::uuid
            AND organization_id = ${params.organizationId}::uuid
            AND content_tsv @@ websearch_to_tsquery('english', ${query})
          ORDER BY ts_rank(content_tsv, websearch_to_tsquery('english', ${query})) DESC
          LIMIT ${candidateLimit}
        `,
    },
    params.organizationId,
    params.query,
    limit,
  );
}

export interface OrganizationBrainSearchParams {
  organizationId: string;
  query: string;
  limit?: number;
}

// Same hybrid retrieval as searchContractChunks, but scoped to the whole
// organization's brain corpus rather than one document — a query can
// legitimately match chunks from several different OrganizationBrainItems
// in one search (finding the org's most relevant template/policy/clause for
// a topic, not answering about one pre-known document). That's exactly why
// RetrievedChunk.sourceId exists: the caller needs to know which item each
// result came from. Organization-scoped directly in the query itself —
// never fetched globally and filtered after — per the frozen requirement.
export async function searchOrganizationBrainChunks(
  params: OrganizationBrainSearchParams,
): Promise<RetrievedChunk[]> {
  const limit = params.limit ?? DEFAULT_RESULT_LIMIT;

  return hybridSearch(
    {
      vectorCandidates: (queryEmbedding, candidateLimit) => {
        const vectorLiteral = `[${queryEmbedding.join(",")}]`;
        return prisma.$queryRaw<CandidateRow[]>`
          SELECT id, organization_brain_item_id AS source_id, chunk_index, heading_path, content
          FROM organization_brain_chunks
          WHERE organization_id = ${params.organizationId}::uuid
            AND embedding IS NOT NULL
          ORDER BY embedding <=> ${vectorLiteral}::vector
          LIMIT ${candidateLimit}
        `;
      },
      fullTextCandidates: (query, candidateLimit) =>
        prisma.$queryRaw<CandidateRow[]>`
          SELECT id, organization_brain_item_id AS source_id, chunk_index, heading_path, content
          FROM organization_brain_chunks
          WHERE organization_id = ${params.organizationId}::uuid
            AND content_tsv @@ websearch_to_tsquery('english', ${query})
          ORDER BY ts_rank(content_tsv, websearch_to_tsquery('english', ${query})) DESC
          LIMIT ${candidateLimit}
        `,
    },
    params.organizationId,
    params.query,
    limit,
  );
}

export interface LegalKbSearchParams {
  query: string;
  limit?: number;
}

// The legal-scope WHERE-clause fragment shared by both candidate legs:
// legal_status is always restricted to IN_FORCE (repealed/unknown-status
// text is never a good answer to "what does the law say"), license_status
// is restricted to whatever the current LEGAL_KB_LICENSE_MODE allows
// (config/index.ts), and — production mode only — a CLEARED_FOR_PRODUCTION
// row must also have its legalSourceId in the checked-in production
// clearances registry (legal-kb-production-clearances.ts's doc comment
// explains why licenseStatus alone isn't trusted as the single gate).
// Development mode has no registry restriction: it needs to see everything
// ingested, including not-yet-reviewed sources, precisely so they can be
// reviewed.
function legalScopeSql(): Prisma.Sql {
  const allowedStatuses = getAllowedLegalLicenseStatuses();
  const base = Prisma.sql`legal_status = 'IN_FORCE'::"LegalStatus" AND license_status = ANY(${allowedStatuses}::"LegalLicenseStatus"[])`;

  if (getLegalKbLicenseMode() !== "production") return base;

  return Prisma.sql`${base} AND legal_source_id = ANY(${[...LEGAL_KB_PRODUCTION_CLEARANCES]}::uuid[])`;
}

// Exported (not just used internally by searchLegalKbChunks below) so the
// Batch 3 manual Arabic full-text quality harness
// (packages/shared/scripts/legal-kb-search-debug.ts) can fetch and print
// vectorCandidates and fullTextCandidates separately, before RRF fusion —
// judging whether a full-text-only match is actually relevant requires
// seeing the un-fused lists, not just the final top-K.
export function legalKbCandidateFetcher(): CandidateFetcher {
  return {
    vectorCandidates: (queryEmbedding, candidateLimit) => {
      const vectorLiteral = `[${queryEmbedding.join(",")}]`;
      return prisma.$queryRaw<CandidateRow[]>`
        SELECT id, legal_source_id AS source_id, chunk_index, heading_path, content, article_number
        FROM legal_chunks
        WHERE ${legalScopeSql()}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${candidateLimit}
      `;
    },
    // 'simple' config, not 'english': content_tsv (Batch 1's migration) is
    // itself generated via to_tsvector('simple', ...), since this corpus is
    // predominantly Arabic — 'english' stemming/stopwords would silently
    // mismatch the generated column's own tokenization.
    fullTextCandidates: (query, candidateLimit) =>
      prisma.$queryRaw<CandidateRow[]>`
        SELECT id, legal_source_id AS source_id, chunk_index, heading_path, content, article_number
        FROM legal_chunks
        WHERE ${legalScopeSql()}
          AND content_tsv @@ websearch_to_tsquery('simple', ${query})
        ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple', ${query})) DESC
        LIMIT ${candidateLimit}
      `,
  };
}

// "What does Article N say" is an exact-match problem, not a semantic one —
// vector similarity was never going to reliably retrieve a specific article
// by number (confirmed empirically: real questions asking about Article 654
// or Article 763 came back with semantically-related-but-wrong articles).
// Batch 1's migration added the article_number index anticipating exactly
// this; this is the first thing to use it.
//
// Reuses the same "المادة N" detection shape already proven in
// legal-source-flatview-parser.ts's ARTICLE_HEADING_PATTERN — deliberately
// the flat-view parser's pattern, not the plainer tree-view one in
// legal-source-scraper.ts, because Labour Law's real ingested data already
// has sub-numbered articles ("12-1") and "bis"-style labels ("12-مكرر") that
// a plain \d+ pattern would miss.
const ARABIC_ARTICLE_WORD = "المادة";
const ARABIC_BIS_WORD = "مكرر";
const QUESTION_ARTICLE_NUMBER_PATTERN = new RegExp(
  `${ARABIC_ARTICLE_WORD}\\s*(\\d+(?:\\s*-\\s*(?:\\d+|${ARABIC_BIS_WORD}))?)`,
);

// Exported for direct unit testing of the detection regex in isolation from
// the database-touching search path.
export function extractArticleNumberFromQuery(query: string): string | null {
  const match = query.match(QUESTION_ARTICLE_NUMBER_PATTERN);
  if (!match) return null;
  return match[1].replace(/\s+/g, "");
}

// Live-database verification of the article-number lookup (Batch 4
// acceptance re-check, 2026-08-14) surfaced a real bug: article_number is
// only unique *within* a source, not across all five — "Article 654" exists
// in both the Code of Obligations and Contracts and the Code of Commerce,
// as two unrelated articles. An unscoped lookup returned both at the same
// guaranteed-inclusion priority even though the question named one specific
// instrument. This is a small, deliberately non-exhaustive table of
// short-form Arabic aliases a real person would plausibly type for one of
// the five ingested instruments — not an NLP system, just enough to
// disambiguate the common case. Matched against `LegalSource.title`
// (`ILIKE '%...%'`), which holds both the English and Arabic name for every
// ingested source (confirmed against the real DB rows).
const INSTRUMENT_ALIASES: { pattern: RegExp; titleContains: string }[] = [
  { pattern: /قانون\s*الموجبات(\s*و\s*العقود)?/, titleContains: "الموجبات والعقود" },
  { pattern: /قانون\s*التجارة(\s*البرية)?/, titleContains: "التجارة" },
  { pattern: /قانون\s*العمل/, titleContains: "العمل" },
  { pattern: /(حق\s*المؤلف|الملكية\s*(الادبية|الفكرية))/, titleContains: "الادبية والفنية" },
  {
    // Law 81/2018 has no common short name the way the others do — matched
    // by its own number/date, plus its actual subject-matter name, which is
    // at least as plausible as "قانون 81" for a real user to type.
    pattern: /(المعاملات\s*الالكترونية|قانون\s*(رقم\s*)?81\b|81\s*\/\s*2018)/,
    titleContains: "الالكترونية",
  },
];

function resolveInstrumentAlias(query: string): string | null {
  const match = INSTRUMENT_ALIASES.find((alias) => alias.pattern.test(query));
  return match ? match.titleContains : null;
}

// Same legalScopeSql() filter as the two hybrid-search legs — a direct
// article-number lookup is an additional candidate source, not a bypass of
// legal_status/license_status gating. article_number is stored as the full
// label (schema.prisma's doc comment on LegalChunk.articleNumber), so this
// is a plain equality match, not a numeric comparison. When the question
// names a specific instrument, the lookup is scoped to just that source via
// a subquery (not a JOIN — legal_sources also has legal_status/
// license_status columns, and joining would make legalScopeSql()'s
// unqualified column references ambiguous).
function articleNumberCandidates(
  articleNumber: string,
  instrumentTitleContains: string | null,
): Promise<CandidateRow[]> {
  const instrumentFilter = instrumentTitleContains
    ? Prisma.sql`AND legal_source_id IN (SELECT id FROM legal_sources WHERE title ILIKE ${`%${instrumentTitleContains}%`})`
    : Prisma.empty;

  return prisma.$queryRaw<CandidateRow[]>`
    SELECT id, legal_source_id AS source_id, chunk_index, heading_path, content, article_number
    FROM legal_chunks
    WHERE ${legalScopeSql()}
      AND article_number = ${articleNumber}
      ${instrumentFilter}
    ORDER BY chunk_index
    LIMIT ${DIRECT_ARTICLE_LOOKUP_LIMIT}
  `;
}

// Same hybrid retrieval as the two functions above, but structurally
// global: no organizationId anywhere in this function or its WHERE
// clauses, not even filtered to a wildcard — the Lebanese Legal Knowledge
// Base is one shared corpus across every organization (Domain Review
// Decision 2), not scoped to whichever org happens to be asking. There is
// therefore no owning organization to attribute the query-time embedding
// call to either; hybridSearch is called with organizationId: null, same
// as the ingestion job.
//
// When the question names a specific article number, that article is
// guaranteed a slot (prepended ahead of the RRF-ranked results, not fused
// into their scoring) rather than left to vector/full-text's best guess —
// the normal hybrid search still runs unconditionally alongside it, so the
// rest of the result set is unaffected. No article number detected: this
// degrades to exactly the pre-existing hybridSearch call.
//
// article_number is only unique *within* a source, not across the corpus —
// "Article 654" is a different article in the Code of Obligations and
// Contracts than in the Code of Commerce. If the question names an
// instrument (resolveInstrumentAlias()), the lookup is scoped to that one
// source and the match is authoritative. If it doesn't, and the number
// turns out to exist in more than one source, there is no principled way to
// pick a winner — presenting one candidate at guaranteed-inclusion priority
// would be an unverified guess dressed up as a certain match, which is
// worse than not boosting anything. That case falls back to hybrid search
// alone, silently from the caller's perspective (no error, no partial/wrong
// boost) — same "unchanged path" degradation as no article number at all.
export async function searchLegalKbChunks(
  params: LegalKbSearchParams,
): Promise<RetrievedChunk[]> {
  const limit = params.limit ?? DEFAULT_RESULT_LIMIT;
  const articleNumber = extractArticleNumberFromQuery(params.query);
  const instrumentTitleContains = articleNumber ? resolveInstrumentAlias(params.query) : null;

  const [hybridResults, directRows] = await Promise.all([
    hybridSearch(legalKbCandidateFetcher(), null, params.query, limit),
    articleNumber
      ? articleNumberCandidates(articleNumber, instrumentTitleContains)
      : Promise.resolve<CandidateRow[]>([]),
  ]);

  if (directRows.length === 0) return hybridResults;

  // An instrument-scoped lookup can only ever match one source by
  // construction, so this only ever trips when no instrument was named.
  // Checked unconditionally anyway (not just "when !instrumentTitleContains")
  // as defense-in-depth against the alias table itself being wrong someday.
  const distinctSources = new Set(directRows.map((r) => r.source_id));
  if (distinctSources.size > 1) {
    return hybridResults;
  }

  // Number.POSITIVE_INFINITY, not a high finite score: an exact,
  // unambiguous article-number match isn't "ranked highly" by the same RRF
  // math as the rest of the list, it's a guaranteed inclusion — the score
  // exists only because RetrievedChunk requires one.
  const directResults: RetrievedChunk[] = directRows.map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    chunkIndex: row.chunk_index,
    headingPath: row.heading_path,
    content: row.content,
    score: Number.POSITIVE_INFINITY,
    // This function's own WHERE clause already filtered on
    // article_number = ${articleNumber}, so row.article_number is always
    // set here — always populated, not conditional like hybridSearch()'s
    // mapping (which also serves Contract/Organization Brain rows).
    articleNumber: row.article_number ?? null,
  }));

  const directIds = new Set(directResults.map((r) => r.id));
  const merged = [...directResults, ...hybridResults.filter((r) => !directIds.has(r.id))];
  return merged.slice(0, limit);
}
