import type { RiskSchemaV2 } from "../schemas/risk/v2";
import type { SummarySchemaV1 } from "../schemas/summary/v1";

export function scoreExactMatch(expected: unknown, actual: unknown): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

// Risk extraction is structured, so precision/recall against golden labels
// is directly measurable (Section 12). Compares the SET of flag categories
// found, not exact wording — description/sourceText phrasing legitimately
// varies between runs even when the model correctly identified the same
// underlying risk.
//
// `input` is closure-captured by each case in golden-set.ts, not passed
// through runGoldenSet() — see the comment there for why. Every flag's
// sourceText is checked against it, so a flag citing text that doesn't
// actually appear in the contract fails the case outright.
//
// keyDates are NOT grounded the same way: keyDateSchema has no sourceText
// field, and the model normalizes dates to ISO (YYYY-MM-DD) while
// contracts are written in prose, so a substring-of-input check would
// false-fail correct output. keyDate precision is instead guarded by
// count (maxKeyDates), not content.
export interface RiskGoldenExpectation {
  flagCategories: string[];
  minObligations: number;
  minKeyDates: number;
  minFlags?: number;
  maxKeyDates?: number;
  allowedFlagCategories?: string[];
  minOverallScore?: number;
  mustMentionAnywhere?: string[];
  // Distinct from maxKeyDates: since keyDateSchema's `date` is nullable
  // (v2), a model can honestly represent "this is a date-shaped concept
  // but no date is determinable" as `date: null` — that's not fabrication,
  // it's the correct behavior the schema was widened to allow. This checks
  // the actual VALUE (no non-null date anywhere), not the count, so it
  // keeps catching real fabrication without penalizing a model for
  // correctly declining to guess.
  forbidFabricatedDates?: boolean;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function isSourceTextGrounded(sourceText: string, input: string): boolean {
  return normalizeWhitespace(input).includes(normalizeWhitespace(sourceText));
}

export function scoreRiskExtraction(
  expected: unknown,
  actual: unknown,
  input: string,
): boolean {
  const exp = expected as RiskGoldenExpectation;
  const act = actual as RiskSchemaV2;

  if (!act.flags.every((f) => isSourceTextGrounded(f.sourceText, input))) {
    return false;
  }

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

  if (recall < 0.5) return false;
  if (act.obligations.length < exp.minObligations) return false;
  if (act.keyDates.length < exp.minKeyDates) return false;
  if (exp.minFlags !== undefined && act.flags.length < exp.minFlags) {
    return false;
  }
  if (exp.maxKeyDates !== undefined && act.keyDates.length > exp.maxKeyDates) {
    return false;
  }
  if (
    exp.forbidFabricatedDates &&
    !act.keyDates.every((k) => k.date === null)
  ) {
    return false;
  }

  if (exp.allowedFlagCategories) {
    const allowed = new Set(
      exp.allowedFlagCategories.map((c) => c.toLowerCase()),
    );
    if (!act.flags.every((f) => allowed.has(f.category.toLowerCase()))) {
      return false;
    }
  }

  if (
    exp.minOverallScore !== undefined &&
    act.overallScore < exp.minOverallScore
  ) {
    return false;
  }

  if (exp.mustMentionAnywhere) {
    const haystack = [
      act.summary,
      ...act.flags.map((f) => f.description),
      ...act.flags.map((f) => f.sourceText),
      ...act.obligations.map((o) => o.description),
      ...act.keyDates.map((k) => `${k.label} ${k.date}`),
    ]
      .join(" ")
      .toLowerCase();
    const allMentioned = exp.mustMentionAnywhere.every((s) =>
      haystack.includes(s.toLowerCase()),
    );
    if (!allMentioned) return false;
  }

  return true;
}

// Summary quality has no single correct answer (Section 12) - a groundedness
// check instead: every expected key fact should appear (case-insensitively)
// in the generated text. mustNotMention is the inverse: facts that are
// plausible to hallucinate but are not actually present in the source
// contract must NOT appear.
export interface SummaryGoldenExpectation {
  mustMention: string[];
  mustNotMention?: string[];
}

export function scoreSummaryGroundedness(
  expected: unknown,
  actual: unknown,
): boolean {
  const exp = expected as SummaryGoldenExpectation;
  const act = actual as SummarySchemaV1;

  if (!act.text || act.text.trim().length === 0) return false;

  const lowerText = act.text.toLowerCase();

  const allMentioned = exp.mustMention.every((fact) =>
    lowerText.includes(fact.toLowerCase()),
  );
  if (!allMentioned) return false;

  if (exp.mustNotMention) {
    const anyForbidden = exp.mustNotMention.some((fact) =>
      lowerText.includes(fact.toLowerCase()),
    );
    if (anyForbidden) return false;
  }

  return true;
}
