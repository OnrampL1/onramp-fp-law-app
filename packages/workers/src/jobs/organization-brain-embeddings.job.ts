import path from "node:path";
import type { Job } from "bullmq";
import {
  downloadFile,
  chunkContractText,
  generateEmbeddings,
  replaceOrganizationBrainItemChunks,
  getMaxChunksPerOrganizationBrainItem,
  type OrganizationBrainEmbeddingsJobData,
  type OrganizationBrainEmbeddingsJobResult,
} from "@starter-kit/shared";
import { extractText, TerminalExtractionError } from "../lib/text-extraction";
import {
  markOrganizationBrainItemExtractionCompleted,
  markOrganizationBrainItemExtractionFailed,
} from "../repositories/organization-brain-processing.repository";

export async function processOrganizationBrainEmbeddingsJob(
  job: Job<
    OrganizationBrainEmbeddingsJobData,
    OrganizationBrainEmbeddingsJobResult
  >,
): Promise<OrganizationBrainEmbeddingsJobResult> {
  const { organizationBrainItemId, organizationId, storageKey } = job.data;

  const buffer = await downloadFile(storageKey);
  const extension = path.extname(storageKey);

  let text: string;
  try {
    ({ text } = await extractText(buffer, extension));
  } catch (error) {
    if (error instanceof TerminalExtractionError) {
      console.error(
        `[organization-brain-embeddings] Extraction failed for item ${organizationBrainItemId}: ${error.message}`,
      );
      await markOrganizationBrainItemExtractionFailed(
        organizationBrainItemId,
        organizationId,
        error.message,
      );
      return { status: "EXTRACTION_FAILED", chunkCount: 0 };
    }
    throw error;
  }

  await markOrganizationBrainItemExtractionCompleted(
    organizationBrainItemId,
    organizationId,
    text,
  );

  const chunks = chunkContractText(text);
  const maxChunks = getMaxChunksPerOrganizationBrainItem();

  // Checked before any embedding call fires - the whole point of the
  // ceiling is stopping spend before it happens, not after.
  if (chunks.length > maxChunks) {
    console.error(
      `[organization-brain-embeddings] Item ${organizationBrainItemId} produced ${chunks.length} chunks, over the ${maxChunks} ceiling — aborting before any embedding calls`,
    );
    return { status: "CEILING_EXCEEDED", chunkCount: chunks.length };
  }

  if (chunks.length === 0) {
    await replaceOrganizationBrainItemChunks(
      organizationBrainItemId,
      organizationId,
      [],
    );
    return { status: "COMPLETED", chunkCount: 0 };
  }

  const { embeddings } = await generateEmbeddings({
    texts: chunks.map((chunk) => chunk.content),
    organizationId,
  });

  await replaceOrganizationBrainItemChunks(
    organizationBrainItemId,
    organizationId,
    chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] ?? [] })),
  );

  console.info(
    `[organization-brain-embeddings] Stored ${chunks.length} chunks for item ${organizationBrainItemId}`,
  );
  return { status: "COMPLETED", chunkCount: chunks.length };
}
