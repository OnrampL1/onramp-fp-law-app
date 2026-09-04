import { optimizeContext } from "../context";
import { executePlan, type ToolExecutionOutcome } from "../tools/executor";
import type { ToolImplementations } from "../tools/types";
import { ASSISTANT_MAX_PLAN_STEPS, type ToolName } from "../tools/definitions";
import type { AssistantPlanStepV1 } from "../schemas/assistant-plan/v1";
import type { InvestigatorTurn } from "../retrieval/investigator";
import {
  planAssistantSteps,
  summarizeOutcomeForPlanner,
  type PlannerProgressStep,
} from "./assistant-planner";
import { aggregateToolResults } from "./assistant-aggregation";
import { synthesizeAssistantAnswer, type AssistantSource } from "./assistant-synthesizer";

// A bounded round budget, not an unbounded ReAct loop - three chances to add
// a step that depends on an earlier one's result (e.g. resolve a contract by
// name, then analyze it) covers the realistic depth of a single Assistant
// question without risking a runaway back-and-forth. Revisit via Domain
// Review if real usage shows a question that genuinely needs more.
const MAX_ROUNDS = 3;

function stepSignature(step: { tool: string; arguments: Record<string, unknown> }): string {
  return `${step.tool}:${JSON.stringify(step.arguments)}`;
}

export interface RunAssistantInput {
  organizationId: string;
  question: string;
  history?: InvestigatorTurn[];
  // The real tool implementations, injected by the caller - packages/shared
  // has no dependency on packages/api, so it cannot construct these itself
  // (searchContracts/getContractAnalysis call into api-layer
  // repositories/services). The future Batch 4 controller passes
  // assistantToolsService (packages/api/src/services/assistant-tools.service.ts)
  // here, the same way answerContractQuestion is handed its `ops` by each
  // caller rather than owning them.
  implementations: ToolImplementations;
}

export interface AssistantAnswer {
  answer: string;
  sources: AssistantSource[];
  confidence?: number;
  // Which tools the planner chose to call, in the shape a UI or log line
  // can use for transparency - tool names only, never raw arguments
  // (Batch 4: "do not expose internal tool execution details unnecessarily").
  toolsUsed: ToolName[];
  toolsFailed: ToolName[];
}

// The Plan-and-Execute pipeline, now run in up to MAX_ROUNDS bounded rounds
// instead of a single shot (Domain Review, 2026-09-04 - see
// planAssistantSteps()'s own comment for why): each round asks the planner
// for the next increment of steps, given a summary of everything gathered
// so far this turn; executes only the genuinely new ones; and feeds their
// outcomes back in as next round's "Progress so far". This is what lets a
// question like "find contract X and explain its risks" resolve the
// contract by name in round 1, then call getContractAnalysis with the id it
// just learned in round 2 - impossible under the old single-plan design,
// which could only ever do the first half in one turn. A round that returns
// no genuinely new steps (the planner declares itself done, or repeats a
// call already made) ends the loop early rather than spending its full
// budget. Aggregate -> Context Optimizer seam -> ONE final synthesis call
// happens once, after the loop, exactly as before.
export async function runAssistant(
  input: RunAssistantInput,
): Promise<AssistantAnswer> {
  const allOutcomes: ToolExecutionOutcome[] = [];
  const priorSteps: PlannerProgressStep[] = [];
  const executedSignatures = new Set<string>();
  const toolsUsedOrder: ToolName[] = [];

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const remainingBudget = ASSISTANT_MAX_PLAN_STEPS - toolsUsedOrder.length;
    if (remainingBudget <= 0) break;

    const plan = await planAssistantSteps({
      organizationId: input.organizationId,
      question: input.question,
      history: input.history,
      priorSteps,
    });

    if (plan.steps.length === 0) break;

    // Drop any step identical (tool + arguments) to one already executed
    // this turn - the planner was told not to repeat itself, but a model is
    // never guaranteed to follow that, and re-running an identical call
    // would only waste budget without producing new information. If every
    // returned step is a repeat, there is nothing new to gain from another
    // round either.
    const newSteps = plan.steps.filter(
      (step) => !executedSignatures.has(stepSignature(step)),
    );
    if (newSteps.length === 0) break;

    const stepsToRun = newSteps.slice(0, remainingBudget);

    const outcomes = await executePlan(
      { steps: stepsToRun },
      input.implementations,
      { organizationId: input.organizationId },
    );

    outcomes.forEach((outcome, i) => {
      const step = stepsToRun[i] as AssistantPlanStepV1;
      executedSignatures.add(stepSignature(step));
      priorSteps.push(summarizeOutcomeForPlanner(step, outcome));
    });

    allOutcomes.push(...outcomes);
    toolsUsedOrder.push(...stepsToRun.map((s) => s.tool));
  }

  const aggregated = optimizeContext(aggregateToolResults(allOutcomes));

  const synthesis = await synthesizeAssistantAnswer({
    organizationId: input.organizationId,
    question: input.question,
    history: input.history,
    aggregated,
  });

  return {
    answer: synthesis.answer,
    sources: synthesis.sources,
    confidence: synthesis.confidence,
    toolsUsed: toolsUsedOrder,
    toolsFailed: aggregated.failedTools.map((f) => f.tool),
  };
}
