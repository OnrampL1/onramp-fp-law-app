import {
  answerContractQuestion,
  NoIndexedContentError,
  AiValidationError,
  AiProviderError,
} from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import { contractRepository } from "../repositories/contract.repository";
import type { AskInvestigatorBody } from "../schemas/contract-investigator.schemas";
import type { AskInvestigatorResponseDto } from "../types/contract-investigator.types";

async function ask(
  contractId: string,
  organizationId: string,
  body: AskInvestigatorBody,
): Promise<AskInvestigatorResponseDto> {
  const contract = await contractRepository.findById(contractId, organizationId);
  if (!contract) {
    throw createError("Contract not found", 404);
  }

  try {
    const result = await answerContractQuestion({
      contractId,
      organizationId,
      question: body.question,
      history: body.history ?? [],
    });

    return {
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
      chunksRetrieved: result.chunksRetrieved,
    };
  } catch (error) {
    if (error instanceof NoIndexedContentError) {
      throw createError(error.message, 409);
    }
    if (error instanceof AiValidationError) {
      throw createError(
        "Clause Investigator could not produce a verifiable answer",
        502,
      );
    }
    if (error instanceof AiProviderError) {
      throw createError(
        "Clause Investigator is temporarily unavailable",
        error.retryable ? 503 : 502,
      );
    }
    throw error;
  }
}

export const contractInvestigatorService = { ask };
