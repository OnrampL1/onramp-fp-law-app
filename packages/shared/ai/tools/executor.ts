import type { AssistantPlanStepV1, AssistantPlanV1 } from "../schemas/assistant-plan/v1";
import { ASSISTANT_MAX_PLAN_STEPS, TOOL_DEFINITIONS } from "./definitions";
import type { ToolExecutionContext, ToolImplementations, ToolResult } from "./types";

// Thrown by executePlan itself (never returned per-step) - a plan this
// oversized should not have passed planAssistantSteps()'s own schema
// validation (assistant-plan/v1.ts already caps `steps` at
// ASSISTANT_MAX_PLAN_STEPS). This check exists for any plan object not
// produced that way - a test, or a future manual/debug path - so the bound
// is enforced by the executor itself, not only by trusting every caller to
// have validated upstream.
export class PlanTooLargeError extends Error {}

export interface ToolExecutionOutcome {
  tool: AssistantPlanStepV1["tool"];
  ok: boolean;
  result?: ToolResult;
  error?: string;
}

// Plan-and-Execute, not ReAct (AI_ARCHITECTURE.md Section 7): every step in
// `plan` was decided upfront by one planner completion, with no visibility
// into any other step's result, so there is nothing to sequence -
// execution runs every step in parallel. A failing or unimplemented step
// becomes a per-step `{ ok: false, error }` outcome, not a thrown
// exception that would abort every other step - so a plan mixing (say) a
// working searchContracts call with a temporarily-unavailable
// searchLegalKnowledge call still returns the searchContracts result for
// the final synthesis step (Batch 3) to work with.
export async function executePlan(
  plan: AssistantPlanV1,
  implementations: ToolImplementations,
  context: ToolExecutionContext,
): Promise<ToolExecutionOutcome[]> {
  if (plan.steps.length > ASSISTANT_MAX_PLAN_STEPS) {
    throw new PlanTooLargeError(
      `Plan requested ${plan.steps.length} tool call(s), exceeding the max of ${ASSISTANT_MAX_PLAN_STEPS}`,
    );
  }

  return Promise.all(
    plan.steps.map((step) => executeStep(step, implementations, context)),
  );
}

async function executeStep(
  step: AssistantPlanStepV1,
  implementations: ToolImplementations,
  context: ToolExecutionContext,
): Promise<ToolExecutionOutcome> {
  // step.tool is already narrowed to a known ToolName by the plan schema's
  // discriminated union at parse time for any plan that came from
  // planAssistantSteps() - this guard only matters for a plan object built
  // by hand (e.g. in a test).
  const definition = TOOL_DEFINITIONS[step.tool];
  if (!definition) {
    return {
      tool: step.tool,
      ok: false,
      error: `Unknown Assistant tool: "${step.tool}"`,
    };
  }

  const parsedArgs = definition.argsSchema.safeParse(step.arguments);
  if (!parsedArgs.success) {
    return {
      tool: step.tool,
      ok: false,
      error: `Invalid arguments for "${step.tool}": ${parsedArgs.error.message}`,
    };
  }

  const implementation = implementations[step.tool];
  if (!implementation) {
    return {
      tool: step.tool,
      ok: false,
      error: `Tool "${step.tool}" has no implementation wired yet`,
    };
  }

  try {
    const result = await implementation(parsedArgs.data, context);
    return { tool: step.tool, ok: true, result };
  } catch (error) {
    return {
      tool: step.tool,
      ok: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}
