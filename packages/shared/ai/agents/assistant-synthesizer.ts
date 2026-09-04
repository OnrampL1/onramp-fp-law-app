import { getValidatedCompletion, AiValidationError } from "../schemas";
import { markValidationFailed } from "../providers";
import { resolvePrompt, resolveSchema } from "../registry";
import { getInvestigatorHistoryTurnLimit, getInvestigatorMaxTokens } from "../config";
import type { AiMessage } from "../types";
import type { InvestigatorTurn } from "../retrieval/investigator";
import type { AssistantAnswerV1 } from "../schemas/assistant-answer/v1";
import type { ToolName } from "../tools/definitions";
import type {
  AggregatedAssistantContext,
  AssistantEvidenceUnit,
  AssistantSubAnswer,
} from "./assistant-aggregation";

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

// Background context only - deliberately has no [EVIDENCE id=...] tag, so
// there is nothing here for the model to cite. See AssistantSubAnswer's own
// comment for why: without this split, a sub-tool's full answer was the
// path of least resistance for a citation, producing a "source" that just
// re-quoted the whole answer back at the user.
function formatSubAnswers(subAnswers: AssistantSubAnswer[]): string {
  if (subAnswers.length === 0) {
    return "";
  }
  const rows = subAnswers
    .map((s) => `- [${s.capability}]${s.contractId ? ` (contract ${s.contractId})` : ""}: ${s.text}`)
    .join("\n");
  return `Prior capability answers (background context only - these are NOT citable, they have no id; cite the EVIDENCE blocks above instead for any specific quote or claim):\n\n${rows}`;
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
  // notIndexed is the one failure reason worth revealing verbatim (already
  // a plain, specific sentence - see NoIndexedContentError's message) so
  // synthesis rule 12 can state it plainly instead of guessing at a generic
  // decline. Every other failure keeps the generic phrasing - this is a
  // narrow special case, not a change to how failures are reported overall.
  const rows = failedTools
    .map((f) => (f.notIndexed ? `- ${f.tool}: ${f.error}` : `- ${f.tool} was unavailable`))
    .join("\n");
  return `The following capabilities were attempted but did not return a usable result:\n\n${rows}`;
}

// Distinct from formatUnavailableTools above: these tools ran successfully
// and correctly found nothing, which is real, positive information (e.g.
// "no active contracts expire in the next 90 days") - not a gap to
// apologize for. Without this block, an empty-but-successful search was
// indistinguishable to the model from a question nothing was ever
// searched for at all (observed live - see AssistantEmptyResult's comment
// in assistant-aggregation.ts).
function formatEmptyResults(
  emptyResults: AggregatedAssistantContext["emptyResults"],
): string {
  if (emptyResults.length === 0) {
    return "";
  }
  const rows = emptyResults.map((r) => `- ${r.note}`).join("\n");
  return `Searches that ran successfully and found nothing (this is a real answer, not missing information):\n\n${rows}`;
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
    formatSubAnswers(aggregated.subAnswers),
    formatContractsFound(aggregated.contractsFound),
    formatEmptyResults(aggregated.emptyResults),
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
//
// Three-way split, not a plain valid/invalid check - observed live: the
// model sometimes cites a real `contractsFound` id (visible in the prompt,
// explicitly marked "reference data, not a citable source") as if it were
// an evidence source. That id is real, not a hallucination - treating it
// the same as a genuinely unknown id meant a harmless formatting slip
// exhausted the retry budget and surfaced as a full request failure to the
// user (observed: two independent "which contracts..." questions,
// otherwise perfectly answerable, 502'd this way). A cited contractsFound
// id is now silently dropped from the final sources instead of triggering
// a retry; only a truly unknown id (neither evidence nor a found contract)
// is still treated as an unverifiable claim worth rejecting.
export interface CitedIdResolution {
  keptIds: string[];
  unknownIds: string[];
}

export function resolveCitedIds(
  citedIds: string[],
  aggregated: Pick<AggregatedAssistantContext, "evidence" | "contractsFound">,
): CitedIdResolution {
  const evidenceIds = new Set(aggregated.evidence.map((unit) => unit.id));
  const contractIds = new Set(aggregated.contractsFound.map((c) => c.id));

  const keptIds: string[] = [];
  const unknownIds: string[] = [];

  for (const id of citedIds) {
    if (evidenceIds.has(id)) {
      keptIds.push(id);
    } else if (!contractIds.has(id)) {
      unknownIds.push(id);
    }
    // else: a real contractsFound id cited as a source - dropped silently.
  }

  return { keptIds, unknownIds };
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

  // Guaranteed fallback once every synthesis attempt fails to produce a
  // verifiable answer (malformed completion, or a citation referencing an
  // evidence id that was never provided) - never the unverified content
  // itself, just a normal answer-shaped decline instead of a thrown error.
  // Matches the exact wording the prompt itself already uses for a
  // model-declared "nothing grounded this" case (assistant-synthesis/v2.md
  // rule 14), so the fallback is indistinguishable in tone from a normal
  // decline.
  const verificationFailedAnswer = (
    callLogId: string,
  ): AssistantSynthesisResult => ({
    answer: "I couldn't find enough grounded information to answer that reliably.",
    sources: [],
    confidence: 0,
    callLogId,
  });

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
      // getValidatedCompletion() already calls markValidationFailed() itself
      // before throwing, so there's nothing further to record here - just
      // fall back once attempts run out.
      if (error instanceof AiValidationError) {
        if (attempt === MAX_SYNTHESIS_ATTEMPTS) {
          return verificationFailedAnswer(error.callLogId);
        }
        continue;
      }
      throw error;
    }

    const data = result.data as AssistantAnswerV1;
    const resolution = resolveCitedIds(
      data.sources.map((s) => s.id),
      input.aggregated,
    );

    if (resolution.unknownIds.length > 0) {
      if (attempt === MAX_SYNTHESIS_ATTEMPTS) {
        await markValidationFailed(
          result.callLogId,
          `Cited unknown evidence id(s) after ${MAX_SYNTHESIS_ATTEMPTS} attempt(s): ${resolution.unknownIds.join(", ")}`,
        );
        return verificationFailedAnswer(result.callLogId);
      }
      continue;
    }

    // Dedupe by id, keeping first occurrence - the model can legitimately
    // cite the same evidence id more than once (grounding several separate
    // sentences in one source), which is fine for the answer's prose but
    // would otherwise surface as literal duplicate entries in the returned
    // `sources` list. resolveCitedIds() above already dropped any
    // unusable ids; this only removes repeats of an id already known good.
    const uniqueCitedIds = [...new Set(resolution.keptIds)];

    return {
      answer: data.answer,
      sources: uniqueCitedIds.map((id) => enrichAssistantSource(id, input.aggregated.evidence)),
      confidence: data.confidence,
      callLogId: result.callLogId,
    };
  }

  // Unreachable: the loop above always returns.
  return verificationFailedAnswer("");
}
