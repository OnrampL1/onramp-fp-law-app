import { planAssistantSteps } from "../agents/assistant-planner";
import { synthesizeAssistantAnswer } from "../agents/assistant-synthesizer";
import { runAssistant } from "../agents/assistant";
import { ASSISTANT_GOLDEN_SET } from "./golden-set";
import type { AssistantCaseContext } from "./assistant-scoring";
import type { AssistantGoldenSetRunSummary, ScoreResult } from "./types";

// Parallel to run.ts's runGoldenSet() and run-legal-kb.ts's
// runLegalKbGoldenSet(), not a variant of either — see
// AssistantGoldenExample's comment in types.ts for why the execution model
// has to differ again. Three real code paths, chosen per case by `stage`,
// so a case testing only tool selection doesn't also pay for (and risk
// variance from) a synthesis call it isn't judging, and vice versa.
export async function runAssistantGoldenSet(
  organizationId: string,
): Promise<AssistantGoldenSetRunSummary> {
  const results: ScoreResult[] = [];

  for (const example of ASSISTANT_GOLDEN_SET) {
    let context: AssistantCaseContext;

    try {
      if (example.stage === "planner") {
        const plan = await planAssistantSteps({
          organizationId,
          question: example.question,
        });
        context = {
          stage: "planner",
          toolsCalled: plan.steps.map((step) => step.tool),
        };
      } else if (example.stage === "synthesis") {
        if (!example.fixedContext) {
          throw new Error(`Case ${example.id}: synthesis stage requires fixedContext`);
        }
        const result = await synthesizeAssistantAnswer({
          organizationId,
          question: example.question,
          aggregated: example.fixedContext,
        });
        context = {
          stage: "synthesis",
          answer: result.answer,
          sourceIds: result.sources.map((s) => s.id),
        };
      } else {
        if (!example.implementations) {
          throw new Error(`Case ${example.id}: pipeline stage requires implementations`);
        }
        const result = await runAssistant({
          organizationId,
          question: example.question,
          implementations: example.implementations,
        });
        context = {
          stage: "pipeline",
          answer: result.answer,
          sourceIds: result.sources.map((s) => s.id),
          toolsCalled: result.toolsUsed,
          toolsFailed: result.toolsFailed,
        };
      }
    } catch (error) {
      // A genuine pipeline failure (e.g. exhausted retries) is a real case
      // failure, not a skip - same discipline as run.ts/run-legal-kb.ts.
      context = {
        stage: example.stage,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    try {
      const passed = await example.score(example.expected, context);
      results.push({
        exampleId: example.id,
        passed,
        expected: example.expected,
        actual: context,
      });
    } catch (error) {
      results.push({
        exampleId: example.id,
        passed: false,
        expected: example.expected,
        actual: {
          ...context,
          scorerError: error instanceof Error ? error.message : "Unknown scorer error",
        },
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
