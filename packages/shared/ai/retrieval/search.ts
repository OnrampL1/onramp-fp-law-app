import { getPrismaClient } from "../../db";
import { generateEmbeddings } from "../providers";
import { optimizeContext } from "../context";

const prisma = getPrismaClient();

export interface RetrievedChunk {
  id: string;
  chunkIndex: number;
  headingPath: string | null;
  content: string;
  score: number;
}

// Reciprocal Rank Fusion: combines two ranked lists (vector similarity,
// full-text relevance) without needing their scores on a comparable scale —
// cosine similarity and ts_rank aren't otherwise commensurable. K=60 is the
// standard RRF constant from the literature, not a tuned value.
const RRF_K = 60;
const CANDIDATES_PER_METHOD = 20;
const DEFAULT_RESULT_LIMIT = 8;

interface CandidateRow {
  id: string;
  chunk_index: number;
  heading_path: string | null;
  content: string;
}

async function vectorCandidates(
  contractId: string,
  organizationId: string,
  queryEmbedding: number[],
  limit: number,
): Promise<CandidateRow[]> {
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;
  return prisma.$queryRaw<CandidateRow[]>`
    SELECT id, chunk_index, heading_path, content
    FROM contract_chunks
    WHERE contract_id = ${contractId}::uuid
      AND organization_id = ${organizationId}::uuid
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;
}

async function fullTextCandidates(
  contractId: string,
  organizationId: string,
  query: string,
  limit: number,
): Promise<CandidateRow[]> {
  return prisma.$queryRaw<CandidateRow[]>`
    SELECT id, chunk_index, heading_path, content
    FROM contract_chunks
    WHERE contract_id = ${contractId}::uuid
      AND organization_id = ${organizationId}::uuid
      AND content_tsv @@ websearch_to_tsquery('english', ${query})
    ORDER BY ts_rank(content_tsv, websearch_to_tsquery('english', ${query})) DESC
    LIMIT ${limit}
  `;
}

function fuseRankings(
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

  const { embeddings } = await generateEmbeddings({
    texts: [params.query],
    organizationId: params.organizationId,
  });
  const queryEmbedding = embeddings[0];
  if (!queryEmbedding) return [];

  const [vectorRows, fullTextRows] = await Promise.all([
    vectorCandidates(params.contractId, params.organizationId, queryEmbedding, CANDIDATES_PER_METHOD),
    fullTextCandidates(params.contractId, params.organizationId, params.query, CANDIDATES_PER_METHOD),
  ]);

  const results = fuseRankings(vectorRows, fullTextRows)
    .slice(0, limit)
    .map(({ row, score }) => ({
      id: row.id,
      chunkIndex: row.chunk_index,
      headingPath: row.heading_path,
      content: row.content,
      score,
    }));

  return optimizeContext(results);
}
