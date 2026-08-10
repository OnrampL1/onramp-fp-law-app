import { getPrismaClient } from "../../db";
import type { TextChunk } from "./chunking";

const prisma = getPrismaClient();

export interface ChunkToStore extends TextChunk {
  embedding: number[];
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
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
    await tx.contractChunk.deleteMany({ where: { contractId } });

    if (chunks.length === 0) return;

    await tx.contractChunk.createMany({
      data: chunks.map((chunk) => ({
        id: crypto.randomUUID(),
        contractId,
        organizationId,
        chunkIndex: chunk.chunkIndex,
        headingPath: chunk.headingPath,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
      })),
    });

    const rows = await tx.contractChunk.findMany({
      where: { contractId },
      select: { id: true, chunkIndex: true },
    });
    const idByChunkIndex = new Map(rows.map((r) => [r.chunkIndex, r.id]));

    for (const chunk of chunks) {
      const id = idByChunkIndex.get(chunk.chunkIndex);
      if (!id) continue;
      await tx.$executeRaw`UPDATE contract_chunks SET embedding = ${toVectorLiteral(chunk.embedding)}::vector WHERE id = ${id}::uuid`;
    }
  });
}
