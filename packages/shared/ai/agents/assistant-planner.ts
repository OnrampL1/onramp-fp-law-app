import { getValidatedCompletion, AiValidationError } from "../schemas";
import { resolvePrompt, resolveSchema } from "../registry";
import { getInvestigatorHistoryTurnLimit, getInvestigatorMaxTokens } from "../config";
import type { AiMessage } from "../types";
import type { InvestigatorTurn } from "../retrieval/investigator";
import type { AssistantPlanStepV1, AssistantPlanV1 } from "../schemas/assistant-plan/v1";

// Same retry budget and shape as answerQuestion()'s MAX_GENERATION_ATTEMPTS
// (retrieval/investigator.ts) - a malformed completion (not JSON, wrong
// tool name, oversized plan, invalid arguments for the shape a tool
// declares) is retried once before being surfaced as a real failure, the
// same discipline used everywhere else structured output is required from
// the model.
const MAX_PLANNER_ATTEMPTS = 2;

export interface PlanAssistantStepsInput {
  organizationId: string;
  question: string;
  history?: InvestigatorTurn[];
}

export interface AssistantPlanResult {
  steps: AssistantPlanStepV1[];
  callLogId: string;
}

// Exported for direct unit testing, same rationale as
// retrieval/investigator.ts's buildMessages: history ordering is the one
// part of this function with real off-by-one/role-mixup risk.
export function buildPlannerMessages(
  systemPrompt: string,
  history: InvestigatorTurn[],
  question: string,
): AiMessage[] {
  const messages: AiMessage[] = [{ role: "system", content: systemPrompt }];

  for (const turn of history) {
    messages.push({ role: "user", content: turn.question });
    messages.push({ role: "assistant", content: turn.answer });
  }

  messages.push({
    role: "user",
    content: `${question}\n\nReminder: respond with ONLY the JSON object described in the system prompt - no prose before or after it, no markdown code fences.`,
  });

  return messages;
}

// One LLM call producing a validated, structured plan - never a loop, never
// re-invoked after seeing a tool's result (AI_ARCHITECTURE.md Section 7).
// The plan-size cap and the closed set of valid tool names are enforced by
// the schema itself (schemas/assistant-plan/v1.ts): a response naming an
// unknown tool, malformed arguments, or too many steps simply fails
// validation and is retried/rejected here exactly like any other
// structured-output mismatch - there is no separate cap-checking logic in
// this function to keep in sync with the schema's.
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
