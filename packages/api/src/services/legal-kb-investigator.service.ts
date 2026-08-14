import {
  answerLegalKbQuestion,
  NoIndexedContentError,
  AiValidationError,
  AiProviderError,
} from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import type { AskLegalKbBody } from "../schemas/legal-kb-investigator.schemas";
import type { AskLegalKbResponseDto } from "../types/legal-kb-investigator.types";

async function ask(
  organizationId: string,
  body: AskLegalKbBody,
): Promise<AskLegalKbResponseDto> {
  try {
    const result = await answerLegalKbQuestion({
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
        "Could not produce a verifiable answer from the Legal Knowledge Base",
        502,
      );
    }
    if (error instanceof AiProviderError) {
      throw createError(
        "Legal Knowledge Base search is temporarily unavailable",
        error.retryable ? 503 : 502,
      );
    }
    throw error;
  }
}

export const legalKbInvestigatorService = { ask };
