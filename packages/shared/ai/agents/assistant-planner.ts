import { getValidatedCompletion, AiValidationError } from "../schemas";
import { resolvePrompt, resolveSchema } from "../registry";
import { getInvestigatorHistoryTurnLimit, getInvestigatorMaxTokens } from "../config";
import type { AiMessage } from "../types";
import type { InvestigatorTurn } from "../retrieval/investigator";
import type { AssistantPlanStepV1, AssistantPlanV1 } from "../schemas/assistant-plan/v1";
import type { ToolExecutionOutcome } from "../tools/executor";

// Same retry budget and shape as answerQuestion()'s MAX_GENERATION_ATTEMPTS
// (retrieval/investigator.ts) - a malformed completion (not JSON, wrong
// tool name, oversized plan, invalid arguments for the shape a tool
// declares) is retried once before being surfaced as a real failure, the
// same discipline used everywhere else structured output is required from
// the model.
const MAX_PLANNER_ATTEMPTS = 2;

// One round's worth of already-executed progress, in the compact shape the
// planner prompt is told to read back before deciding its next steps - not
// the same as ToolExecutionOutcome (that carries the full untruncated
// result, of no use in a prompt) or an AssistantEvidenceUnit (that's shaped
// for the *final* synthesis prompt's citation mechanics, not for a planner
// deciding what to do next).
export interface PlannerProgressStep {
  tool: AssistantPlanStepV1["tool"];
  arguments: Record<string, unknown>;
  summary: string;
}

export interface PlanAssistantStepsInput {
  organizationId: string;
  question: string;
  history?: InvestigatorTurn[];
  // Omitted (or empty) on the first call for a question. Non-empty on every
  // subsequent call within the same turn - see runAssistant() in
  // ./assistant.ts, which is the only caller that ever loops.
  priorSteps?: PlannerProgressStep[];
}

export interface AssistantPlanResult {
  steps: AssistantPlanStepV1[];
  callLogId: string;
}

function formatPriorSteps(priorSteps: PlannerProgressStep[]): string {
  if (priorSteps.length === 0) {
    return "";
  }
  const rows = priorSteps
    .map(
      (step, i) =>
        `${i + 1}. ${step.tool}(${JSON.stringify(step.arguments)}) → ${step.summary}`,
    )
    .join("\n");
  return `Progress so far this turn:\n\n${rows}\n\n`;
}

// Exported for direct unit testing, same rationale as
// retrieval/investigator.ts's buildMessages: history ordering is the one
// part of this function with real off-by-one/role-mixup risk.
export function buildPlannerMessages(
  systemPrompt: string,
  history: InvestigatorTurn[],
  question: string,
  priorSteps: PlannerProgressStep[] = [],
): AiMessage[] {
  const messages: AiMessage[] = [{ role: "system", content: systemPrompt }];

  for (const turn of history) {
    messages.push({ role: "user", content: turn.question });
    messages.push({ role: "assistant", content: turn.answer });
  }

  messages.push({
    role: "user",
    content: `${formatPriorSteps(priorSteps)}${question}\n\nReminder: respond with ONLY the JSON object described in the system prompt - no prose before or after it, no markdown code fences.`,
  });

  return messages;
}

// A short, planner-facing description of one tool call's outcome - not the
// full result (too large and irrelevant for a planning decision), just
// enough for the model to know what was found, in particular any contract
// id it can now use in a follow-up getContractAnalysis/askContractQuestion
// call. Exported for direct unit testing, same rationale as every other
// pure formatting helper in this file.
export function summarizeOutcomeForPlanner(
  step: { tool: AssistantPlanStepV1["tool"]; arguments: Record<string, unknown> },
  outcome: ToolExecutionOutcome,
): PlannerProgressStep {
  const base = { tool: step.tool, arguments: step.arguments };

  if (!outcome.ok || !outcome.result) {
    return { ...base, summary: `failed - ${outcome.error ?? "no result"}` };
  }

  const { result } = outcome;
  switch (result.tool) {
    case "searchContracts": {
      if (result.data.contracts.length === 0) {
        return { ...base, summary: "found 0 matching contracts" };
      }
      const rows = result.data.contracts
        .slice(0, 5)
        .map((c) => `"${c.title}" (id: ${c.id})`)
        .join(", ");
      return {
        ...base,
        summary: `found ${result.data.totalMatched} contract(s): ${rows}`,
      };
    }
    case "getContractAnalysis": {
      if (!result.data.risk && !result.data.summary) {
        return { ...base, summary: "no completed analysis exists yet for this contract" };
      }
      const flagCount = result.data.risk?.redFlags.length ?? 0;
      return {
        ...base,
        summary: `retrieved analysis (${flagCount} risk flag(s), ${result.data.summary ? "summary available" : "no summary yet"})`,
      };
    }
    case "askContractQuestion":
    case "searchOrganizationBrain":
    case "searchLegalKnowledge": {
      const sourceCount = result.data.sources.length;
      const preview =
        result.data.answer.length > 160
          ? `${result.data.answer.slice(0, 160)}…`
          : result.data.answer;
      return {
        ...base,
        summary: `answered (${sourceCount} source(s)): ${preview}`,
      };
    }
  }
}

// One LLM call producing one validated, structured plan increment. Never a
// loop itself - runAssistant() (./assistant.ts) is what may call this
// function again, in a bounded round, after executing the steps it just
// returned and summarizing their outcomes into `priorSteps` (Domain Review,
// 2026-09-04: replaced the original single-shot-only Plan-and-Execute
// design, AI_ARCHITECTURE.md Section 7, with a bounded iterative version so
// a question like "find contract X and explain its risks" can resolve the
// contract, then use its id, within one turn). The plan-size cap and the
// closed set of valid tool names are enforced by the schema itself
// (schemas/assistant-plan/v1.ts): a response naming an unknown tool,
// malformed arguments, or too many steps simply fails validation and is
// retried/rejected here exactly like any other structured-output mismatch -
// there is no separate cap-checking logic in this function to keep in sync
// with the schema's.
export async function planAssistantSteps(
  input: PlanAssistantStepsInput,
): Promise<AssistantPlanResult> {
  const prompt = resolvePrompt("assistant-planner");
  const { schema, version: schemaVersion } = resolveSchema("assistant-plan");
  const historyLimit = getInvestigatorHistoryTurnLimit();
  const limitedHistory = (input.history ?? []).slice(-historyLimit);

  let lastError: AiValidationError | undefined;

  for (let attempt = 1; attempt <= MAX_PLANNER_ATTEMPTS; attempt++) {
    const messages = buildPlannerMessages(
      prompt.content,
      limitedHistory,
      input.question,
      input.priorSteps ?? [],
    );

    try {
      const result = await getValidatedCompletion(
        {
          messages,
          promptId: prompt.promptId,
          promptVersion: prompt.version,
          schemaId: "assistant-plan",
          schemaVersion,
          organizationId: input.organizationId,
          maxTokens: getInvestigatorMaxTokens(),
        },
        schema,
      );

      const data = result.data as AssistantPlanV1;
      return { steps: data.steps, callLogId: result.callLogId };
    } catch (error) {
      if (error instanceof AiValidationError) {
        lastError = error;
        if (attempt === MAX_PLANNER_ATTEMPTS) {
          throw error;
        }
        continue;
      }
      throw error;
    }
  }

  // Unreachable: the loop above always returns or throws.
  throw lastError ?? new AiValidationError("Failed to produce a valid plan", "");
}
