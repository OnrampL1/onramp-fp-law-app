import { getValidatedCompletion, AiValidationError } from "../schemas";
import { resolvePrompt, resolveSchema } from "../registry";
import { getInvestigatorHistoryTurnLimit, getInvestigatorMaxTokens } from "../config";
import type { AiMessage } from "../types";
import type { InvestigatorTurn } from "../retrieval/investigator";
import type { AssistantAnswerV1 } from "../schemas/assistant-answer/v1";
import type { ToolName } from "../tools/definitions";
import type { AggregatedAssistantContext, AssistantEvidenceUnit } from "./assistant-aggregation";

const MAX_SYNTHESIS_ATTEMPTS = 2;

export interface AssistantSource {
  id: string;
  tool: ToolName;
  capability: string;
  label: string;
  excerpt: string;
  contractId?: string;
}

export interface SynthesizeAssistantAnswerInput {
  organizationId: string;
  question: string;
  history?: InvestigatorTurn[];
  aggregated: AggregatedAssistantContext;
}

export interface AssistantSynthesisResult {
  answer: string;
  sources: AssistantSource[];
  confidence?: number;
  callLogId: string;
}

function formatEvidenceBlocks(evidence: AssistantEvidenceUnit[]): string {
  if (evidence.length === 0) {
    return "";
  }
  const blocks = evidence
    .map((unit) => {
      const contractTag = unit.contractId ? ` contractId=${unit.contractId}` : "";
      return `[EVIDENCE id=${unit.id} capability=${JSON.stringify(unit.capability)}${contractTag}]\n${unit.content}\n[/EVIDENCE]`;
    })
    .join("\n\n");
  return `Evidence gathered:\n\n${blocks}`;
}

function formatContractsFound(
  contracts: AggregatedAssistantContext["contractsFound"],
): string {
  if (contracts.length === 0) {
    return "";
  }
  const rows = contracts
    .map(
      (c) =>
        `- id=${c.id} | ${c.title} | counterparty: ${c.counterparty} | legalState: ${c.legalState ?? "unknown"} | tags: ${c.tags.join(", ") || "none"} | expires: ${c.expirationDate ?? "none"}`,
    )
    .join("\n");
  return `Contracts found (reference data, not a citable source):\n\n${rows}`;
}

function formatUnavailableTools(
  failedTools: AggregatedAssistantContext["failedTools"],
): string {
  if (failedTools.length === 0) {
    return "";
  }
  const rows = failedTools.map((f) => `- ${f.tool} was unavailable`).join("\n");
  return `The following capabilities were attempted but did not return a usable result:\n\n${rows}`;
}

// Exported for direct unit testing, same rationale as
// retrieval/investigator.ts's buildMessages / agents/assistant-planner.ts's
// buildPlannerMessages.
export function buildSynthesisMessages(
  systemPrompt: string,
  history: InvestigatorTurn[],
  question: string,
  aggregated: AggregatedAssistantContext,
): AiMessage[] {
  const messages: AiMessage[] = [{ role: "system", content: systemPrompt }];

  for (const turn of history) {
    messages.push({ role: "user", content: turn.question });
    messages.push({ role: "assistant", content: turn.answer });
  }

  const sections = [
    formatEvidenceBlocks(aggregated.evidence),
    formatContractsFound(aggregated.contractsFound),
    formatUnavailableTools(aggregated.failedTools),
  ].filter(Boolean);

  const context = sections.length > 0 ? sections.join("\n\n") : "No evidence was gathered for this question.";

  messages.push({
    role: "user",
    content: `${context}\n\nQuestion: ${question}\n\nReminder: respond with ONLY the JSON object described in the system prompt - no prose before or after it, no markdown code fences.`,
  });

  return messages;
}

// Additive check, not a second citation-verification system: every other
// tool already ran its own verifyCitations() (or, for getContractAnalysis,
// has no free-text excerpt to fabricate at all - its evidence is read
// directly from stored analysis rows). What this function checks is
// narrower and specific to this one extra hop: did the synthesis step cite
// an evidence id it was actually given, the same "additive, not a
// duplicate of excerpt verification" shape as Legal KB's
// verifyArticleExistence (PHASE6_IMPLEMENTATION_PLAN.md Section 10).
export function verifyEvidenceReferences(
  citedIds: string[],
  evidence: AssistantEvidenceUnit[],
): { valid: boolean; reason?: string } {
  const knownIds = new Set(evidence.map((unit) => unit.id));
  const unknown = citedIds.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    return {
      valid: false,
      reason: `Cited unknown evidence id(s): ${unknown.join(", ")}`,
    };
  }
  return { valid: true };
}

function enrichAssistantSource(
  id: string,
  evidence: AssistantEvidenceUnit[],
): AssistantSource {
  const unit = evidence.find((e) => e.id === id);
  // Unreachable in practice - verifyEvidenceReferences() already rejected
  // any id not present in `evidence` before this function is called.
  if (!unit) {
    throw new Error(`Cannot enrich unknown evidence id "${id}"`);
  }
  return {
    id: unit.id,
    tool: unit.tool,
    capability: unit.capability,
    label: unit.label,
    excerpt: unit.content,
    contractId: unit.contractId,
  };
}

// One final provider layer call, synthesizing an answer from the
// aggregated, optimized context (AI_ARCHITECTURE.md Section 7) - never a
// loop, never re-invoked to gather more evidence. A malformed completion or
// a reference to an evidence id that was never provided is retried once,
// the same MAX_GENERATION_ATTEMPTS-style discipline used everywhere else
// structured output is required from the model.
export async function synthesizeAssistantAnswer(
  input: SynthesizeAssistantAnswerInput,
): Promise<AssistantSynthesisResult> {
  const prompt = resolvePrompt("assistant-synthesis");
  const { schema, version: schemaVersion } = resolveSchema("assistant-answer");
  const historyLimit = getInvestigatorHistoryTurnLimit();
  const limitedHistory = (input.history ?? []).slice(-historyLimit);

  let lastError: AiValidationError | undefined;

  for (let attempt = 1; attempt <= MAX_SYNTHESIS_ATTEMPTS; attempt++) {
    const messages = buildSynthesisMessages(
      prompt.content,
      limitedHistory,
      input.question,
      input.aggregated,
    );

    let result;
    try {
      result = await getValidatedCompletion(
        {
          messages,
          promptId: prompt.promptId,
          promptVersion: prompt.version,
          schemaId: "assistant-answer",
          schemaVersion,
          organizationId: input.organizationId,
          maxTokens: getInvestigatorMaxTokens(),
        },
        schema,
      );
    } catch (error) {
      if (error instanceof AiValidationError) {
        lastError = error;
        if (attempt === MAX_SYNTHESIS_ATTEMPTS) {
          throw error;
        }
        continue;
      }
      throw error;
    }

    const data = result.data as AssistantAnswerV1;
    const verification = verifyEvidenceReferences(
      data.sources.map((s) => s.id),
      input.aggregated.evidence,
    );

    if (!verification.valid) {
      if (attempt === MAX_SYNTHESIS_ATTEMPTS) {
        throw new AiValidationError(
          `Evidence reference verification failed after ${MAX_SYNTHESIS_ATTEMPTS} attempt(s): ${verification.reason}`,
          result.callLogId,
        );
      }
      continue;
    }

    // Dedupe by id, keeping first occurrence - the model can legitimately
    // cite the same evidence id more than once (grounding several separate
    // sentences in one source), which is fine for the answer's prose but
    // would otherwise surface as literal duplicate entries in the returned
    // `sources` list. verifyEvidenceReferences() above checks that every
    // cited id is real; this only removes repeats of an id already known
    // to be valid, so it never needs its own retry path.
    const uniqueCitedIds = [...new Set(data.sources.map((s) => s.id))];

    return {
      answer: data.answer,
      sources: uniqueCitedIds.map((id) => enrichAssistantSource(id, input.aggregated.evidence)),
      confidence: data.confidence,
      callLogId: result.callLogId,
    };
  }

  // Unreachable: the loop above always returns or throws.
  throw lastError ?? new AiValidationError("Failed to produce a valid synthesis", "");
}
