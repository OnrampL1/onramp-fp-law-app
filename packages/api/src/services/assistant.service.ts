import { runAssistant, AiValidationError, AiProviderError } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import { assistantToolsService } from "./assistant-tools.service";
import type { AskAssistantBody } from "../schemas/assistant.schemas";
import type { AskAssistantResponseDto } from "../types/assistant.types";

// Same error-mapping shape as contractInvestigatorService.ask /
// organizationBrainInvestigatorService.ask / legalKbInvestigatorService.ask.
// No NoIndexedContentError case here, unlike those three: runAssistant()
// never throws it directly - a tool that would throw it (e.g.
// searchLegalKnowledge against an empty corpus) has that error caught and
// turned into a per-step failure inside executePlan() (Batch 1), which the
// synthesis step then explains in prose rather than surfacing as an HTTP
// error. There is nothing left for this layer to special-case for that.
async function ask(
  organizationId: string,
  body: AskAssistantBody,
): Promise<AskAssistantResponseDto> {
  try {
    const result = await runAssistant({
      organizationId,
      question: body.question,
      history: body.history ?? [],
      implementations: assistantToolsService,
    });

    return {
      answer: result.answer,
      sources: result.sources.map((source) => ({
        id: source.id,
        capability: source.capability,
        label: source.label,
        excerpt: source.excerpt,
        contractId: source.contractId,
      })),
      confidence: result.confidence,
    };
  } catch (error) {
    if (error instanceof AiValidationError) {
      throw createError(
        "The Assistant could not produce a verifiable answer",
        502,
      );
    }
    if (error instanceof AiProviderError) {
      throw createError(
        "The Assistant is temporarily unavailable",
        error.retryable ? 503 : 502,
      );
    }
    throw error;
  }
}

export const assistantService = { ask };
