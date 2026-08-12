import { getPrismaClient } from "../../db";
import type { TextChunk } from "./chunking";

const prisma = getPrismaClient();

export interface ChunkToStore extends TextChunk {
  embedding: number[];
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// The shared shape behind every corpus's chunk-replace function
// (AI_ROADMAP.md Section 4 — one implementation, parameterized by corpus
// type). Each corpus supplies its own type-safe Prisma calls via `ops`;
// this function owns only the algorithm: delete-then-insert-then-embed in
// one transaction, idempotent on retry via replace-not-upsert.
interface ChunkPersistenceOps {
  deleteExisting(): Promise<unknown>;
  createRows(chunks: ChunkToStore[]): Promise<unknown>;
  findIdsByChunkIndex(): Promise<{ id: string; chunkIndex: number }[]>;
  updateEmbedding(id: string, vectorLiteral: string): Promise<unknown>;
}

async function replaceChunks(
  ops: ChunkPersistenceOps,
  chunks: ChunkToStore[],
): Promise<void> {
  await ops.deleteExisting();

  if (chunks.length === 0) return;

  await ops.createRows(chunks);

  const rows = await ops.findIdsByChunkIndex();
  const idByChunkIndex = new Map(rows.map((r) => [r.chunkIndex, r.id]));

  for (const chunk of chunks) {
    const id = idByChunkIndex.get(chunk.chunkIndex);
    if (!id) continue;
    await ops.updateEmbedding(id, toVectorLiteral(chunk.embedding));
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
        updateEmbedding: (id, vectorLiteral) =>
          tx.$executeRaw`UPDATE contract_chunks SET embedding = ${vectorLiteral}::vector WHERE id = ${id}::uuid`,
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
        updateEmbedding: (id, vectorLiteral) =>
          tx.$executeRaw`UPDATE organization_brain_chunks SET embedding = ${vectorLiteral}::vector WHERE id = ${id}::uuid`,
      },
      chunks,
    );
  });
}
