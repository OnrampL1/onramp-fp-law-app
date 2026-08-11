export type EvalSource = "engineering" | "public-benchmark" | "legal-verified";

export type EvalCategory =
  | "extraction"
  | "clause_detection"
  | "risk_detection"
  | "summary"
  | "groundedness"
  | "negative_case"
  | "contradiction"
  | "adversarial";

export type EvalScenario = "normal" | "negative" | "adversarial";

export interface GoldenExample {
  id: string;
  source: EvalSource;
  category: EvalCategory;
  scenario: EvalScenario;
  jurisdiction: string;
  promptId: string;
  schemaId: string;
  input: string;
  expected: unknown;
  score: (expected: unknown, actual: unknown) => boolean;
}

export interface ScoreResult {
  exampleId: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
}

export interface GoldenSetRunSummary {
  total: number;
  passed: number;
  failed: number;
  results: ScoreResult[];
}
