import {
  answerOrganizationBrainQuestion,
  NoIndexedContentError,
  AiValidationError,
  AiProviderError,
} from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import type { AskOrganizationBrainBody } from "../schemas/organization-brain-investigator.schemas";
import type { AskOrganizationBrainResponseDto } from "../types/organization-brain-investigator.types";

async function ask(
  organizationId: string,
  body: AskOrganizationBrainBody,
): Promise<AskOrganizationBrainResponseDto> {
  try {
    const result = await answerOrganizationBrainQuestion({
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
        "Could not produce a verifiable answer from your organization's indexed content",
        502,
      );
    }
    if (error instanceof AiProviderError) {
      throw createError(
        "Organization Brain search is temporarily unavailable",
        error.retryable ? 503 : 502,
      );
    }
    throw error;
  }
}

export const organizationBrainInvestigatorService = { ask };
