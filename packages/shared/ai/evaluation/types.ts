import type { AggregatedAssistantContext } from "../agents/assistant-aggregation";
import type { ToolImplementations } from "../tools/types";

export type EvalSource = "engineering" | "public-benchmark" | "legal-verified";

export type EvalCategory =
  | "extraction"
  | "clause_detection"
  | "risk_detection"
  | "summary"
  | "groundedness"
  | "negative_case"
  | "contradiction"
  | "adversarial"
  // Whether the planner chose the right Phase 7 tool(s) for a question -
  // a genuinely new axis no prior phase had anything to test, since every
  // earlier phase was a single fixed capability with no "which capability"
  // decision to get right or wrong.
  | "tool_selection";

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

// A third, again deliberately separate shape, for the same reason
// LegalKbGoldenExample is separate from GoldenExample: the Assistant
// (agents/assistant.ts) is a multi-step Plan-and-Execute pipeline, not a
// single completion call, so there is no one "input"/"promptId"/"schemaId"
// to run through runGoldenSet(). Unlike Legal KB, the Assistant's judgment
// actually happens at two distinct points (the planner choosing tools, the
// synthesizer producing a grounded answer from evidence) that are worth
// scoring independently rather than only end-to-end - `stage` picks which
// one (or the full pipeline) a given case exercises. See
// evaluation/run-assistant.ts for why "pipeline" cases use fake tool
// implementations rather than the real, packages/api-backed ones: this
// package has no dependency on packages/api, so it cannot construct them.
export type AssistantEvalStage = "planner" | "synthesis" | "pipeline";

export interface AssistantGoldenExample {
  id: string;
  source: EvalSource;
  category: EvalCategory;
  scenario: EvalScenario;
  jurisdiction: string;
  question: string;
  stage: AssistantEvalStage;
  // Required (and only meaningful) when stage === "synthesis" - the fixed
  // evidence context fed directly to synthesizeAssistantAnswer(), bypassing
  // the planner and executor so the case isolates synthesis judgment alone.
  fixedContext?: AggregatedAssistantContext;
  // Required (and only meaningful) when stage === "pipeline" - fake tool
  // implementations standing in for the real ones.
  implementations?: ToolImplementations;
  expected: unknown;
  score: (expected: unknown, actual: unknown) => boolean | Promise<boolean>;
}

export interface AssistantGoldenSetRunSummary {
  total: number;
  passed: number;
  failed: number;
  results: ScoreResult[];
}
