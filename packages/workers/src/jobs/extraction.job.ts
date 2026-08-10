import type { Job } from "bullmq";
import {
  downloadFile,
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
