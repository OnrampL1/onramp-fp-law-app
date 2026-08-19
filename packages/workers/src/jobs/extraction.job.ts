import type { Job } from "bullmq";
import {
  downloadFile,
  embeddingsQueue,
  enqueueContractAnalysis,
  type ExtractionJobData,
  type ExtractionJobResult,
} from "@starter-kit/shared";
import path from "node:path";
import { extractText, TerminalExtractionError } from "../lib/text-extraction";
import {
  markExtractionCompleted,
  markExtractionFailed,
} from "../repositories/contract-processing.repository";

export async function processExtractionJob(
  job: Job<ExtractionJobData, ExtractionJobResult>,
): Promise<ExtractionJobResult> {
  const { contractId, fileKey } = job.data;

  const buffer = await downloadFile(fileKey);
  const extension = path.extname(fileKey);

  try {
    const { text } = await extractText(buffer, extension);
    const contract = await markExtractionCompleted(contractId, text);

    // Clause Investigator (Phase 3): chunk + embed the contract now that its
    // text exists. Reuses the EMBEDDINGS queue/worker that already existed
    // (previously wired to a dead-end job) rather than adding a new one.
    await embeddingsQueue.add("chunk-and-embed", {
      contractId: contract.id,
      organizationId: contract.organizationId,
    });

    await enqueueContractAnalysis({
      contractId: contract.id,
      organizationId: contract.organizationId,
      createdByUserId: contract.uploadedByUserId,
      extractedText: text,
    });

    return { status: "EXTRACTION_COMPLETED" };
  } catch (error) {
    if (error instanceof TerminalExtractionError) {
      await markExtractionFailed(contractId, error.message);
      return { status: "EXTRACTION_FAILED" };
    }
    throw error;
  }
}
