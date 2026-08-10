import { getValidatedCompletion } from "../schemas";
import { resolvePrompt, resolveSchema } from "../registry";
import type { AiMessage } from "../types";
import { GOLDEN_SET } from "./golden-set";
import type { GoldenSetRunSummary, ScoreResult } from "./types";

export async function runGoldenSet(
  organizationId: string,
): Promise<GoldenSetRunSummary> {
  const results: ScoreResult[] = [];

  for (const example of GOLDEN_SET) {
    const prompt = resolvePrompt(example.promptId);
    const { schema, version: schemaVersion } = resolveSchema(example.schemaId);

    const messages: AiMessage[] = [
      { role: "system", content: prompt.content },
      { role: "user", content: example.input },
    ];

    try {
      const result = await getValidatedCompletion(
        {
          messages,
          promptId: prompt.promptId,
          promptVersion: prompt.version,
          schemaId: example.schemaId,
          schemaVersion,
          organizationId,
        },
        schema,
      );

      results.push({
        exampleId: example.id,
        passed: example.score(example.expected, result.data),
        expected: example.expected,
        actual: result.data,
      });
    } catch (error) {
      results.push({
        exampleId: example.id,
        passed: false,
        expected: example.expected,
        actual: error instanceof Error ? error.message : "Unknown error",
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
