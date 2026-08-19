import type { LegalStatus, LegalLicenseStatus } from "@prisma/client";
import { getPrismaClient } from "../../db";
import type { TextChunk } from "./chunking";

const prisma = getPrismaClient();

export interface ChunkToStore extends TextChunk {
  embedding: number[];
}

// LegalChunk carries extra per-chunk metadata neither ContractChunk nor
// OrganizationBrainChunk have, so this extends ChunkToStore locally rather
// than widening the shared interface for every corpus. articleNumber/
// amendingInstrument/amendmentEffectiveDate are per-article (every chunk
// from the same article carries the same values); legalStatus/
// licenseStatus are denormalized from the parent LegalSource (same
// reasoning as organizationId on ContractChunk — schema.prisma's own
// comment on LegalChunk).
export interface LegalChunkToStore extends ChunkToStore {
  articleNumber: string | null;
  amendingInstrument: string | null;
  amendmentEffectiveDate: Date | null;
  legalStatus: LegalStatus;
  licenseStatus: LegalLicenseStatus;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

interface RawExecutor {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
}

// One UPDATE ... FROM (VALUES ...) per replaceChunks() call instead of one
// UPDATE per row. The per-row version worked fine at contract/org-brain
// scale (tens to ~150 chunks) but a real Legal KB source (~1,110 chunks)
// blew past Prisma's default 5s interactive-transaction timeout doing
// 1,110 sequential round-trips inside one transaction — discovered via a
// real proof-source run, not anticipated. tableName is always one of the
// three hardcoded literals below, never user input, so building it into
// the query string (rather than through a placeholder) doesn't reopen SQL
// injection; every actual data value (ids, vector literals) still goes
// through $executeRawUnsafe's positional parameters, which Prisma
// parameterizes at the protocol level like any other raw query.
async function bulkUpdateEmbeddings(
  tx: RawExecutor,
  tableName: string,
  rows: { id: string; vectorLiteral: string }[],
): Promise<void> {
  const valuesSql = rows
    .map((_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::vector)`)
    .join(", ");
  const params = rows.flatMap((row) => [row.id, row.vectorLiteral]);

  await tx.$executeRawUnsafe(
    `UPDATE ${tableName} AS t SET embedding = v.embedding FROM (VALUES ${valuesSql}) AS v(id, embedding) WHERE t.id = v.id`,
    ...params,
  );
}

// The shared shape behind every corpus's chunk-replace function
// (AI_ROADMAP.md Section 4 — one implementation, parameterized by corpus
// type). Each corpus supplies its own type-safe Prisma calls via `ops`;
// this function owns only the algorithm: delete-then-insert-then-embed in
// one transaction, idempotent on retry via replace-not-upsert.
// Generic over the chunk type so a corpus with extra per-chunk fields (e.g.
// LegalChunkToStore) can supply a createRows that actually sees those
// fields, without widening ChunkToStore itself for every corpus. Defaults
// to ChunkToStore so the two existing call sites are unaffected.
interface ChunkPersistenceOps<T extends ChunkToStore = ChunkToStore> {
  deleteExisting(): Promise<unknown>;
  createRows(chunks: T[]): Promise<unknown>;
  findIdsByChunkIndex(): Promise<{ id: string; chunkIndex: number }[]>;
  updateEmbeddings(rows: { id: string; vectorLiteral: string }[]): Promise<unknown>;
}

async function replaceChunks<T extends ChunkToStore>(
  ops: ChunkPersistenceOps<T>,
  chunks: T[],
): Promise<void> {
  await ops.deleteExisting();

  if (chunks.length === 0) return;

  await ops.createRows(chunks);

  const rows = await ops.findIdsByChunkIndex();
  const idByChunkIndex = new Map(rows.map((r) => [r.chunkIndex, r.id]));

  const updates: { id: string; vectorLiteral: string }[] = [];
  for (const chunk of chunks) {
    const id = idByChunkIndex.get(chunk.chunkIndex);
    if (!id) continue;
    updates.push({ id, vectorLiteral: toVectorLiteral(chunk.embedding) });
  }

  if (updates.length > 0) {
    await ops.updateEmbeddings(updates);
  }
}

// Prisma's generated types exclude the embedding column entirely (it's an
// Unsupported("vector(1536)") field), so it's written via a raw UPDATE
// after the rest of the row exists. Replaces (delete-then-insert) rather
// than upserts, so re-running this for the same contract — a manual
// re-trigger, or this job simply being retried — is naturally idempotent
// without fighting the (contractId, chunkIndex) unique constraint.
export async function replaceContractChunks(
  contractId: string,
  organizationId: string,
  chunks: ChunkToStore[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await replaceChunks(
      {
        deleteExisting: () =>
          tx.contractChunk.deleteMany({ where: { contractId } }),
        createRows: (chunksToCreate) =>
          tx.contractChunk.createMany({
            data: chunksToCreate.map((chunk) => ({
              id: crypto.randomUUID(),
              contractId,
              organizationId,
              chunkIndex: chunk.chunkIndex,
              headingPath: chunk.headingPath,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
            })),
          }),
        findIdsByChunkIndex: () =>
          tx.contractChunk.findMany({
            where: { contractId },
            select: { id: true, chunkIndex: true },
          }),
        updateEmbeddings: (rows) => bulkUpdateEmbeddings(tx, "contract_chunks", rows),
      },
      chunks,
    );
  });
}

// Same algorithm as replaceContractChunks, targeting OrganizationBrainChunk
// instead (Phase 5). Only the Prisma delegate, the parent id field, and the
// raw table name differ.
export async function replaceOrganizationBrainItemChunks(
  organizationBrainItemId: string,
  organizationId: string,
  chunks: ChunkToStore[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await replaceChunks(
      {
        deleteExisting: () =>
          tx.organizationBrainChunk.deleteMany({
            where: { organizationBrainItemId },
          }),
        createRows: (chunksToCreate) =>
          tx.organizationBrainChunk.createMany({
            data: chunksToCreate.map((chunk) => ({
              id: crypto.randomUUID(),
              organizationBrainItemId,
              organizationId,
              chunkIndex: chunk.chunkIndex,
              headingPath: chunk.headingPath,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
            })),
          }),
        findIdsByChunkIndex: () =>
          tx.organizationBrainChunk.findMany({
            where: { organizationBrainItemId },
            select: { id: true, chunkIndex: true },
          }),
        updateEmbeddings: (rows) => bulkUpdateEmbeddings(tx, "organization_brain_chunks", rows),
      },
      chunks,
    );
  });
}

// Same algorithm again, targeting LegalChunk (Phase 6). No organizationId —
// the Legal Knowledge Base is a structurally global corpus (Domain Review
// Decision 2: no org filter anywhere in this table), so unlike the two
// functions above there is no owning-organization id to attach to each row
// at all, not even one being passed through unchanged.
export async function replaceLegalSourceChunks(
  legalSourceId: string,
  chunks: LegalChunkToStore[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await replaceChunks(
      {
        deleteExisting: () =>
          tx.legalChunk.deleteMany({ where: { legalSourceId } }),
        createRows: (chunksToCreate) =>
          tx.legalChunk.createMany({
            data: chunksToCreate.map((chunk) => ({
              id: crypto.randomUUID(),
              legalSourceId,
              chunkIndex: chunk.chunkIndex,
              headingPath: chunk.headingPath,
              articleNumber: chunk.articleNumber,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
              amendingInstrument: chunk.amendingInstrument,
              amendmentEffectiveDate: chunk.amendmentEffectiveDate,
              legalStatus: chunk.legalStatus,
              licenseStatus: chunk.licenseStatus,
            })),
          }),
        findIdsByChunkIndex: () =>
          tx.legalChunk.findMany({
            where: { legalSourceId },
            select: { id: true, chunkIndex: true },
          }),
        updateEmbeddings: (rows) => bulkUpdateEmbeddings(tx, "legal_chunks", rows),
      },
      chunks,
    );
  });
}
