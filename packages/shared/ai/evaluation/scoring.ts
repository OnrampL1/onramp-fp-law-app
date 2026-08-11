import type { RiskSchemaV1 } from "../schemas/risk/v1";
import type { SummarySchemaV1 } from "../schemas/summary/v1";

export function scoreExactMatch(expected: unknown, actual: unknown): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

// Risk extraction is structured, so precision/recall against golden labels
// is directly measurable (Section 12). Compares the SET of flag categories
// found, not exact wording — description/sourceText phrasing legitimately
// varies between runs even when the model correctly identified the same
// underlying risk.
export interface RiskGoldenExpectation {
  flagCategories: string[];
  minObligations: number;
  minKeyDates: number;
}

export function scoreRiskExtraction(
  expected: unknown,
  actual: unknown,
): boolean {
  const exp = expected as RiskGoldenExpectation;
  const act = actual as RiskSchemaV1;

  const actualCategories = new Set(
    act.flags.map((f) => f.category.toLowerCase()),
  );
  const expectedCategories = exp.flagCategories.map((c) => c.toLowerCase());
  const foundCount = expectedCategories.filter((c) =>
    actualCategories.has(c),
  ).length;
  const recall =
    expectedCategories.length === 0
      ? 1
      : foundCount / expectedCategories.length;

  return (
    recall >= 0.5 &&
    act.obligations.length >= exp.minObligations &&
    act.keyDates.length >= exp.minKeyDates
  );
}

// Summary quality has no single correct answer (Section 12) - a groundedness
// check instead: every expected key fact should appear (case-insensitivity)
// in the generated text.
export interface SummaryGoldenExpectation {
  mustMention: string[];
}

export function scoreSummaryGroundedness(
  expected: unknown,
  actual: unknown,
): boolean {
  const exp = expected as SummaryGoldenExpectation;
  const act = actual as SummarySchemaV1;

  if (!act.text || act.text.trim().length === 0) return false;

  const lowerText = act.text.toLowerCase();
  return exp.mustMention.every((fact) =>
    lowerText.includes(fact.toLowerCase()),
  );
}
