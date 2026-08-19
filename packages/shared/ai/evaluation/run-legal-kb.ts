import { answerLegalKbQuestion, searchLegalKbChunks } from "../retrieval";
import { LEGAL_KB_GOLDEN_SET } from "./golden-set";
import type { LegalKbCaseContext } from "./legal-kb-scoring";
import type { LegalKbGoldenSetRunSummary, ScoreResult } from "./types";

// Parallel to run.ts's runGoldenSet(), not a variant of it — see
// LegalKbGoldenExample's comment in types.ts for why the execution model
// has to differ. Every case gets a fresh, independent retrieval
// (searchLegalKbChunks) regardless of whether answerLegalKbQuestion()
// accepts or rejects the question, since several scorers need it even on
// a rejected outcome (e.g. the cross-source-ambiguity guard, which checks
// retrieval behavior, not generation success).
export async function runLegalKbGoldenSet(
  organizationId: string,
): Promise<LegalKbGoldenSetRunSummary> {
  const results: ScoreResult[] = [];

  for (const example of LEGAL_KB_GOLDEN_SET) {
    const retrieved = await searchLegalKbChunks({ query: example.question });

    let context: LegalKbCaseContext;
    try {
      const answer = await answerLegalKbQuestion({
        organizationId,
        question: example.question,
      });
      context = { outcome: "accepted", answer, retrieved };
    } catch (error) {
      // NoIndexedContentError, AiValidationError, and AiProviderError
      // (the three real rejection paths answerLegalKbQuestion() can throw)
      // all extend Error, so this covers every real case; only a truly
      // unexpected non-Error throw falls back to the generic message.
      context = {
        outcome: "rejected",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        retrieved,
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
      // A scorer itself throwing (e.g. a direct verifyArticleExistence()
      // call failing unexpectedly) is a genuine case failure, not a
      // silent skip — same discipline as run.ts's completion-call catch.
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
