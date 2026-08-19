import { optimizeContext } from "../context";
import { executePlan } from "../tools/executor";
import type { ToolImplementations } from "../tools/types";
import type { ToolName } from "../tools/definitions";
import type { InvestigatorTurn } from "../retrieval/investigator";
import { planAssistantSteps } from "./assistant-planner";
import { aggregateToolResults } from "./assistant-aggregation";
import { synthesizeAssistantAnswer, type AssistantSource } from "./assistant-synthesizer";

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

// The complete Plan-and-Execute pipeline (AI_ARCHITECTURE.md Section 7):
// Planner -> Plan executed -> Aggregate results -> Context Optimizer seam
// -> ONE final provider layer call -> Response. Every stage is its own
// already-tested function (assistant-planner.ts, tools/executor.ts,
// assistant-aggregation.ts, assistant-synthesizer.ts); this function only
// sequences them - there is no branching, retry, or tool-selection logic
// here that isn't already covered by one of those functions' own tests.
export async function runAssistant(
  input: RunAssistantInput,
): Promise<AssistantAnswer> {
  const plan = await planAssistantSteps({
    organizationId: input.organizationId,
    question: input.question,
    history: input.history,
  });

  const outcomes = await executePlan(
    { steps: plan.steps },
    input.implementations,
    { organizationId: input.organizationId },
  );

  const aggregated = optimizeContext(aggregateToolResults(outcomes));

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
    toolsUsed: plan.steps.map((step) => step.tool),
    toolsFailed: aggregated.failedTools.map((f) => f.tool),
  };
}
