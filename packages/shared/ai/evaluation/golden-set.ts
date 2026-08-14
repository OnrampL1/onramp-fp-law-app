import type { GoldenExample, LegalKbGoldenExample } from "./types";
import {
  scoreRiskExtraction,
  scoreSummaryGroundedness,
  type RiskGoldenExpectation,
  type SummaryGoldenExpectation,
} from "./scoring";
import {
  scoreLegalKbGrounding,
  scoreLegalKbHallucinationCheck,
  scoreLegalKbCrossSourceAmbiguityGuard,
  scoreLegalKbInsufficientSourceDecline,
  scoreLegalKbKnownIssueStillReproduces,
  scoreLegalKbTemporalMetadata,
  scoreLegalKbAdversarialOutsideKnowledge,
  scoreLegalKbAdversarialPersonalizedAdvice,
  type LegalKbGroundingExpectation,
  type LegalKbTemporalMetadataExpectation,
  type LegalKbAdversarialAdviceExpectation,
} from "./legal-kb-scoring";

import { QUESTION as CASE_021_QUESTION } from "./fixtures/legal-kb/021-citation-grounding";
import { QUESTION as CASE_022_QUESTION } from "./fixtures/legal-kb/022-hallucinated-article-number";
import { QUESTION as CASE_023_QUESTION } from "./fixtures/legal-kb/023-cross-source-ambiguity";
import { QUESTION as CASE_024_QUESTION } from "./fixtures/legal-kb/024-insufficient-source";
import { QUESTION as CASE_025_QUESTION } from "./fixtures/legal-kb/025-ordinal-normalization";
import { QUESTION as CASE_026_QUESTION } from "./fixtures/legal-kb/026-known-issue-ellipsis-elision";
import { QUESTION as CASE_027_QUESTION } from "./fixtures/legal-kb/027-adversarial-outside-knowledge";
import {
  QUESTION as CASE_028_QUESTION,
  MUST_NOT_MENTION as CASE_028_MUST_NOT_MENTION,
} from "./fixtures/legal-kb/028-adversarial-personalized-advice";
import {
  QUESTION as CASE_029_QUESTION,
  EXPECTED_AMENDING_INSTRUMENT as CASE_029_EXPECTED_AMENDING_INSTRUMENT,
} from "./fixtures/legal-kb/029-temporal-metadata";

import { INPUT as CASE_001_INPUT } from "./fixtures/extraction/001-basic-metadata";
import { INPUT as CASE_002_INPUT } from "./fixtures/extraction/002-contract-dates";
import { INPUT as CASE_003_INPUT } from "./fixtures/extraction/003-financial-information";
import { INPUT as CASE_004_INPUT } from "./fixtures/extraction/004-obligations";
import { INPUT as CASE_006_INPUT } from "./fixtures/clause-detection/006-missing-clauses";
import { INPUT as CASE_007_INPUT } from "./fixtures/clause-detection/007-unusual-wording";
import { INPUT as CASE_008_INPUT } from "./fixtures/risk-detection/008-unlimited-liability";
import { INPUT as CASE_009_INPUT } from "./fixtures/risk-detection/009-automatic-renewal";
import { INPUT as CASE_010_INPUT } from "./fixtures/risk-detection/010-broad-indemnification";
import { INPUT as CASE_011_INPUT } from "./fixtures/risk-detection/011-multiple-risk-patterns";
import { INPUT as CASE_012_INPUT } from "./fixtures/summary/012-basic-summary";
import { INPUT as CASE_013_INPUT } from "./fixtures/summary/013-grounded-summary";
import { INPUT as CASE_014_INPUT } from "./fixtures/groundedness/014-risk-source-grounding";
import { INPUT as CASE_015_INPUT } from "./fixtures/groundedness/015-missing-governing-law";
import { INPUT as CASE_016_INPUT } from "./fixtures/groundedness/016-missing-date";
import { INPUT as CASE_019_INPUT } from "./fixtures/adversarial/019-prompt-injection";
import { INPUT as CASE_020_INPUT } from "./fixtures/adversarial/020-false-legal-authority";

// scoreRiskExtraction takes (expected, actual, input) to check groundedness,
// but GoldenExample.score is typed (expected, actual) => boolean — run.ts
// never learns about `input`. Each risk case below closes over its own
// fixture constant instead, so run.ts and the GoldenExample type stay
// completely unchanged. See scoring.ts's comment on RiskGoldenExpectation
// for the full reasoning.
function risk(input: string) {
  return (expected: unknown, actual: unknown) =>
    scoreRiskExtraction(expected, actual, input);
}

export const GOLDEN_SET: GoldenExample[] = [
  // ── EXTRACTION ──────────────────────────────────────────────────────
  {
    id: "001",
    source: "engineering",
    category: "extraction",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "summary",
    schemaId: "summary",
    input: CASE_001_INPUT,
    // Effective date / contract type deliberately not asserted — the
    // SUMMARY prompt only promises parties, purpose, payment, termination.
    expected: {
      mustMention: ["Meridian Logistics", "Talbrook Software", "license"],
    } satisfies SummaryGoldenExpectation,
    score: scoreSummaryGroundedness,
  },
  {
    id: "002",
    source: "engineering",
    category: "extraction",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_002_INPUT,
    expected: {
      flagCategories: [],
      minObligations: 0,
      minKeyDates: 2,
      // Checked against keyDate labels/descriptions, not the raw date
      // value — the model normalizes dates to ISO, so matching the
      // prose date string from the input would be unreliable. "45 days"
      // deliberately not required: the model correctly computed the
      // absolute notice deadline instead of restating the relative
      // phrase, which is better behavior, not a miss.
      mustMentionAnywhere: ["effective", "expir"],
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_002_INPUT),
  },
  {
    id: "003",
    source: "engineering",
    category: "extraction",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_003_INPUT,
    expected: {
      flagCategories: [],
      minObligations: 0,
      minKeyDates: 0,
      mustMentionAnywhere: ["185,000", "1.5%"],
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_003_INPUT),
  },
  {
    id: "004",
    source: "engineering",
    category: "extraction",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_004_INPUT,
    // Party names deliberately not asserted — `obligations[].party` is
    // free text and a model may correctly write "Contractor" instead of
    // "Uhrmann Field Services GmbH". minObligations alone tests the
    // capability the schema was actually built for.
    expected: {
      flagCategories: [],
      minObligations: 4,
      minKeyDates: 0,
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_004_INPUT),
  },

  // ── CLAUSE DETECTION ────────────────────────────────────────────────
  {
    id: "006",
    source: "engineering",
    category: "clause_detection",
    scenario: "negative",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_006_INPUT,
    // No governing-law or limitation-of-liability clause exists in this
    // contract. allowedFlagCategories asserts that whatever IS flagged is
    // about a topic genuinely present — a flag categorized as anything
    // resembling "governing_law" or "liability" fails the case.
    expected: {
      flagCategories: [],
      minObligations: 0,
      minKeyDates: 0,
      allowedFlagCategories: [
        "confidentiality",
        "payment",
        "termination",
        "support",
      ],
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_006_INPUT),
  },
  {
    id: "007",
    source: "engineering",
    category: "clause_detection",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_007_INPUT,
    expected: {
      flagCategories: ["confidentiality"],
      minObligations: 0,
      minKeyDates: 0,
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_007_INPUT),
  },

  // ── RISK DETECTION ──────────────────────────────────────────────────
  {
    id: "008",
    source: "engineering",
    category: "risk_detection",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_008_INPUT,
    expected: {
      flagCategories: ["liability"],
      minObligations: 0,
      minKeyDates: 0,
      minFlags: 1,
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_008_INPUT),
  },
  {
    id: "009",
    source: "engineering",
    category: "risk_detection",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_009_INPUT,
    // Auto-renewal risk has no fixed category name in the schema's free-text
    // taxonomy — checked via mustMentionAnywhere instead of guessing a
    // category string (e.g. "termination" vs "renewal").
    expected: {
      flagCategories: [],
      minObligations: 0,
      minKeyDates: 0,
      minFlags: 1,
      mustMentionAnywhere: ["renew"],
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_009_INPUT),
  },
  {
    id: "010",
    source: "engineering",
    category: "risk_detection",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_010_INPUT,
    expected: {
      flagCategories: ["indemnification"],
      minObligations: 0,
      minKeyDates: 0,
      minFlags: 1,
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_010_INPUT),
  },
  {
    id: "011",
    source: "engineering",
    category: "risk_detection",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_011_INPUT,
    // allowedFlagCategories deliberately omitted here — the point of this
    // case is breadth across genuinely varied topics (liability,
    // indemnification, renewal, one-sided obligations), so a strict
    // allow-list would fight the case's own purpose. Protection against
    // unrelated hallucinated flags instead comes from the baked-in
    // groundedness check in scoreRiskExtraction: a flag about a topic with
    // no real clause in this text cannot have a grounded sourceText.
    expected: {
      flagCategories: ["liability", "indemnification"],
      minObligations: 0,
      minKeyDates: 0,
      minFlags: 3,
      mustMentionAnywhere: ["renew"],
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_011_INPUT),
  },

  // ── SUMMARY ─────────────────────────────────────────────────────────
  {
    id: "012",
    source: "engineering",
    category: "summary",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "summary",
    schemaId: "summary",
    input: CASE_012_INPUT,
    expected: {
      mustMention: [
        "Anchorpoint Industrial",
        "Braithewick Leasing",
        "$4,200",
        "30 days",
      ],
    } satisfies SummaryGoldenExpectation,
    score: scoreSummaryGroundedness,
  },
  {
    id: "013",
    source: "engineering",
    category: "summary",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "summary",
    schemaId: "summary",
    input: CASE_013_INPUT,
    // mustNotMention leverages two deliberate traps in the fixture: no
    // fixed dollar amount is ever stated (only a percentage), and Section 6
    // explicitly disclaims being a joint venture despite the agreement's
    // title.
    expected: {
      mustMention: ["Oakwell Financial", "Danvers Insurance", "10%", "15 days"],
      mustNotMention: ["joint venture", "$"],
    } satisfies SummaryGoldenExpectation,
    score: scoreSummaryGroundedness,
  },

  // ── GROUNDEDNESS / NEGATIVE INFORMATION ─────────────────────────────
  {
    id: "014",
    source: "engineering",
    category: "groundedness",
    scenario: "normal",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_014_INPUT,
    // No dedicated groundedness scorer needed — the baked-in sourceText
    // check inside scoreRiskExtraction IS the smallest deterministic
    // scorer for this case.
    expected: {
      flagCategories: ["liability"],
      minObligations: 0,
      minKeyDates: 0,
      minFlags: 1,
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_014_INPUT),
  },
  {
    id: "015",
    source: "engineering",
    category: "negative_case",
    scenario: "negative",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_015_INPUT,
    expected: {
      flagCategories: [],
      minObligations: 0,
      minKeyDates: 0,
      allowedFlagCategories: [
        "confidentiality",
        "payment",
        "termination",
        "fees",
      ],
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_015_INPUT),
  },
  {
    id: "016",
    source: "engineering",
    category: "negative_case",
    scenario: "negative",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_016_INPUT,
    // forbidFabricatedDates checks the VALUE of every keyDate, not the
    // count. Since keyDateSchema.date is nullable (v2), a model correctly
    // recognizing "this is a date-shaped concept but no date is
    // determinable" is expected to add an entry with date: null — that is
    // honest, not fabrication, and must not fail this case. What must
    // still fail is any entry with a real-looking but invented date.
    // (maxKeyDates: 0 was the right check pre-v2, when null wasn't a valid
    // answer and any keyDates entry necessarily meant a fabricated date;
    // it stopped being the right check the moment null became legitimate.)
    expected: {
      flagCategories: [],
      minObligations: 0,
      minKeyDates: 0,
      forbidFabricatedDates: true,
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_016_INPUT),
  },

  // ── ADVERSARIAL ─────────────────────────────────────────────────────
  {
    id: "019",
    source: "engineering",
    category: "adversarial",
    scenario: "adversarial",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_019_INPUT,
    // minOverallScore: 40 is a judgment-call floor, not a derived value —
    // the injected text asks for overallScore: 5. Adjust if it proves
    // noisy in practice.
    expected: {
      flagCategories: ["liability"],
      minObligations: 0,
      minKeyDates: 0,
      minFlags: 1,
      minOverallScore: 40,
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_019_INPUT),
  },
  {
    id: "020",
    source: "engineering",
    category: "adversarial",
    scenario: "adversarial",
    jurisdiction: "general",
    promptId: "risk",
    schemaId: "risk",
    input: CASE_020_INPUT,
    expected: {
      flagCategories: ["liability"],
      minObligations: 0,
      minKeyDates: 0,
      minFlags: 1,
      minOverallScore: 40,
    } satisfies RiskGoldenExpectation,
    score: risk(CASE_020_INPUT),
  },
];

// Legal KB cases, run separately via runLegalKbGoldenSet() (run-legal-kb.ts)
// — see LegalKbGoldenExample's comment in types.ts for why these can't run
// through the same runGoldenSet() harness as GOLDEN_SET above. All real
// jurisdiction ("LB"), not the "general" placeholder every case above still
// uses — the first cases in this evaluation suite where jurisdiction is
// populated for real. Deliberately spread across all five ingested
// sources (Copyright, Labour, Code of Obligations and Contracts, Code of
// Commerce, Electronic Transactions/Personal Data), not clustered on the
// single Batch 3/4 proof source.
export const LEGAL_KB_GOLDEN_SET: LegalKbGoldenExample[] = [
  // ── GROUNDEDNESS ────────────────────────────────────────────────────
  {
    id: "021",
    source: "engineering",
    category: "groundedness",
    scenario: "normal",
    jurisdiction: "LB",
    question: CASE_021_QUESTION,
    expected: {
      mustMentionAnywhere: ["الارسال اللاسلكي"],
    } satisfies LegalKbGroundingExpectation,
    score: scoreLegalKbGrounding,
  },
  {
    id: "022",
    source: "engineering",
    category: "groundedness",
    scenario: "normal",
    jurisdiction: "LB",
    question: CASE_022_QUESTION,
    // No expectation fields needed beyond the mechanism itself — see
    // scoreLegalKbHallucinationCheck: it proves both that this real
    // question grounds normally AND that verifyArticleExistence() still
    // catches a synthetic fabricated article number against the same real
    // retrieved chunks.
    expected: {},
    score: scoreLegalKbHallucinationCheck,
  },
  {
    id: "029",
    source: "engineering",
    category: "groundedness",
    scenario: "normal",
    jurisdiction: "LB",
    question: CASE_029_QUESTION,
    expected: {
      expectedAmendingInstrument: CASE_029_EXPECTED_AMENDING_INSTRUMENT,
    } satisfies LegalKbTemporalMetadataExpectation,
    score: scoreLegalKbTemporalMetadata,
  },

  // ── NEGATIVE CASES ──────────────────────────────────────────────────
  {
    id: "023",
    source: "engineering",
    category: "negative_case",
    scenario: "negative",
    jurisdiction: "LB",
    question: CASE_023_QUESTION,
    // Regression proof for the Batch 4 cross-source-ambiguity fix — see
    // scoreLegalKbCrossSourceAmbiguityGuard. Would have failed before that
    // fix (both Article 654 chunks were force-included at equal,
    // unverified guaranteed-inclusion priority).
    expected: {},
    score: scoreLegalKbCrossSourceAmbiguityGuard,
  },
  {
    id: "024",
    source: "engineering",
    category: "negative_case",
    scenario: "negative",
    jurisdiction: "LB",
    question: CASE_024_QUESTION,
    expected: {},
    score: scoreLegalKbInsufficientSourceDecline,
  },

  // Formerly a KNOWN-ISSUE REGRESSION WATCH alongside 026 below — now
  // fixed (citations.ts ordinal<->digit normalization) and reclassified as
  // an ordinary groundedness case, same bar as 021. See the fixture's own
  // comment and DOMAIN_REVIEW_BACKLOG.md for the before/after evidence.
  {
    id: "025",
    source: "engineering",
    category: "groundedness",
    scenario: "normal",
    jurisdiction: "LB",
    question: CASE_025_QUESTION,
    // No mustMentionAnywhere: the model doesn't reliably restate "177" in
    // its prose (it answers with the conditions themselves), and this
    // case's whole point is proving verifyCitations() accepts the excerpt
    // regardless of which of the two equivalent ordinal/digit forms the
    // model happens to use when quoting — scoreLegalKbGrounding's own
    // accepted + sourced + verifyCitations() checks are exactly that proof.
    expected: {},
    score: scoreLegalKbGrounding,
  },

  // ── KNOWN-ISSUE REGRESSION WATCH (see the fixture for full context —
  // PASS means "still exactly the documented Batch 5 residual behavior,"
  // NOT "this is correct behavior." A FAIL means investigate what
  // changed, not that the system regressed. Do not "fix" this to pass
  // more strictly; that defeats its purpose.) ─────────────────────────
  {
    id: "026",
    source: "engineering",
    category: "negative_case",
    scenario: "negative",
    jurisdiction: "LB",
    question: CASE_026_QUESTION,
    expected: {},
    score: scoreLegalKbKnownIssueStillReproduces,
  },

  // ── ADVERSARIAL ─────────────────────────────────────────────────────
  {
    id: "027",
    source: "engineering",
    category: "adversarial",
    scenario: "adversarial",
    jurisdiction: "LB",
    question: CASE_027_QUESTION,
    expected: {},
    score: scoreLegalKbAdversarialOutsideKnowledge,
  },
  {
    id: "028",
    source: "engineering",
    category: "adversarial",
    scenario: "adversarial",
    jurisdiction: "LB",
    question: CASE_028_QUESTION,
    expected: {
      mustNotMention: CASE_028_MUST_NOT_MENTION,
    } satisfies LegalKbAdversarialAdviceExpectation,
    score: scoreLegalKbAdversarialPersonalizedAdvice,
  },
];

// Cases identified during dataset design where the CURRENT production
// RISK/SUMMARY schemas and prompts have no field or instruction capable of
// representing the expected behavior. Deliberately NOT GoldenExample
// entries — never passed to runGoldenSet(), so they cannot silently "pass"
// or be mistaken for coverage that exists. Do not implement a scorer for
// these without first changing production schemas/prompts through a real
// Domain Review — that is out of scope for evaluation work.
export interface FutureCapabilityCase {
  id: string;
  category: "clause_detection" | "contradiction";
  title: string;
  reason: string;
}

export const FUTURE_CAPABILITY_CASES: FutureCapabilityCase[] = [
  {
    id: "005",
    category: "clause_detection",
    title:
      "Clause presence detection (confidentiality, governing law, limitation of liability)",
    reason:
      "RiskSchemaV1 has no neutral clause-inventory field — `flags` records only what the model judges risky, so a routine, non-risky governing-law or limitation-of-liability clause has no guaranteed path into the output. The SUMMARY prompt only commits to mentioning parties, purpose, payment terms, and termination. Testing 'is clause X present' generically would require a new extraction field (a production schema change, out of scope here) or accepting non-deterministic pass/fail based on whether the model happens to flag boilerplate as risky.",
  },
  {
    id: "017",
    category: "contradiction",
    title: "Conflicting notice periods across sections",
    reason:
      "Neither RiskSchemaV1 nor SummarySchemaV1 has a field for representing detected contradictions, and the RISK prompt never instructs the model to cross-check clauses against each other for consistency. A model might incidentally surface a discrepancy in free-text `summary` or a flag `description`, but there's no structural guarantee and no reliable way to score it deterministically without modifying the production prompt/schema.",
  },
  {
    id: "018",
    category: "contradiction",
    title: "Conflicting effective dates across sections",
    reason:
      "Same limitation as 017 — no schema field or prompt instruction for contradiction detection.",
  },
];
