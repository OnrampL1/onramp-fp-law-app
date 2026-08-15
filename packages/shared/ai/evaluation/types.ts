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

// Structurally close to GoldenExample, but deliberately a separate type,
// not a variant of it: GoldenExample's `input`/`promptId`/`schemaId` shape
// assumes runGoldenSet()'s single-completion-call execution model (one
// system+user message pair, no retrieval). Legal KB questions instead run
// through the real answerLegalKbQuestion() RAG pipeline (retrieval,
// generation, citation verification, article-existence check,
// enrichment) — runGoldenSet() has no retrieval step at all, so forcing
// Legal KB cases through that interface would either silently skip
// retrieval (testing nothing real) or require reshaping the proven,
// already-passing Contract/Organization Brain harness around a need only
// Legal KB has. `question` replaces `input`/`promptId`/`schemaId`
// accordingly; `score` still receives `(expected, actual)` matching
// GoldenExample's signature, but `actual` is a LegalKbCaseContext
// (legal-kb-scoring.ts), not a raw completion result — and may be async,
// since some scorers directly re-invoke verifyArticleExistence().
export interface LegalKbGoldenExample {
  id: string;
  source: EvalSource;
  category: EvalCategory;
  scenario: EvalScenario;
  jurisdiction: string;
  question: string;
  expected: unknown;
  score: (expected: unknown, actual: unknown) => boolean | Promise<boolean>;
}

export interface LegalKbGoldenSetRunSummary {
  total: number;
  passed: number;
  failed: number;
  results: ScoreResult[];
}
