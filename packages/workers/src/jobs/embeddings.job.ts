import type { Job } from "bullmq";
import {
  chunkContractText,
  generateEmbeddings,
  replaceContractChunks,
  getMaxChunksPerContract,
  getPrismaClient,
  type EmbeddingsJobData,
  type EmbeddingsJobResult,
} from "@starter-kit/shared";

const prisma = getPrismaClient();

export async function processEmbeddingsJob(
  job: Job<EmbeddingsJobData, EmbeddingsJobResult>,
): Promise<EmbeddingsJobResult> {
  const { contractId, organizationId } = job.data;

  const contract = await prisma.contract.findUniqueOrThrow({
    where: { id: contractId },
    select: { extractedText: true },
  });

  if (!contract.extractedText) {
    console.warn(
      `[embeddings] Contract ${contractId} has no extracted text; skipping chunking`,
    );
    return { status: "SKIPPED", chunkCount: 0 };
  }

  const chunks = chunkContractText(contract.extractedText);
  const maxChunks = getMaxChunksPerContract();

  // Checked before any embedding call fires — the whole point of the
  // ceiling is stopping spend before it happens, not after.
  if (chunks.length > maxChunks) {
    console.error(
      `[embeddings] Contract ${contractId} produced ${chunks.length} chunks, over the ${maxChunks} ceiling — aborting before any embedding calls`,
    );
    return { status: "CEILING_EXCEEDED", chunkCount: chunks.length };
  }

  if (chunks.length === 0) {
    console.info(`[embeddings] Contract ${contractId} produced no chunks`);
    await replaceContractChunks(contractId, organizationId, []);
    return { status: "COMPLETED", chunkCount: 0 };
  }

  const { embeddings } = await generateEmbeddings({
    texts: chunks.map((chunk) => chunk.content),
    organizationId,
  });

  await replaceContractChunks(
    contractId,
    organizationId,
    chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] ?? [] })),
  );

  console.info(`[embeddings] Stored ${chunks.length} chunks for contract ${contractId}`);
  return { status: "COMPLETED", chunkCount: chunks.length };
}
