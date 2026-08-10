import type { GoldenExample } from "./types";
import {
  scoreExactMatch,
  scoreRiskExtraction,
  scoreSummaryGroundedness,
  type RiskGoldenExpectation,
  type SummaryGoldenExpectation,
} from "./scoring";

const RISK_SAMPLE_1 = `
MASTER SERVICES AGREEMENT

This Agreement is between Harborview Analytics Inc. ("Client") and
Pinecrest Cloud Services LLC ("Vendor").

1. Liability. Vendor's total liability under this Agreement shall be
uncapped for breaches of confidentiality, and otherwise limited to fees
paid in the preceding 12 months.

2. Termination. Either party may terminate this Agreement for convenience
upon 45 days' written notice.

3. Payment. Client shall pay Vendor's invoices within 30 days of receipt.
Late payments accrue interest at 1.5% per month.

4. Indemnification. Vendor shall indemnify Client against all third-party
claims arising from Vendor's gross negligence, with no cap on
indemnification liability.
`.trim();

const RISK_SAMPLE_2 = `
DATA PROCESSING ADDENDUM

This Addendum is between Fernbridge Retail Corp. ("Client") and
Solvane Analytics Inc. ("Processor").

1. Confidentiality. Processor shall maintain strict confidentiality of
all Client data and shall not disclose it to any third party without
Client's prior written consent.

2. Termination. This Addendum terminates automatically upon termination
of the underlying Master Services Agreement, effective March 15, 2027.

3. Data Return. Upon termination, Processor shall return or destroy all
Client data within 30 days.
`.trim();

const SUMMARY_SAMPLE_1 = `
MASTER SERVICES AGREEMENT

This Agreement is between Harborview Analytics Inc. ("Client") and
Pinecrest Cloud Services LLC ("Vendor").

1. Purpose. Vendor shall provide cloud infrastructure hosting services to
Client as described in the attached Statement of Work.

2. Payment. Client shall pay Vendor's invoices within 30 days of receipt.

3. Termination. Either party may terminate this Agreement for convenience
upon 45 days' written notice.
`.trim();

const SUMMARY_SAMPLE_2 = `
DATA PROCESSING ADDENDUM

This Addendum is between Fernbridge Retail Corp. ("Client") and
Solvane Analytics Inc. ("Processor").

1. Confidentiality. Processor shall maintain strict confidentiality of
all Client data.

2. Termination. This Addendum terminates automatically upon termination
of the underlying Master Services Agreement, effective March 15, 2027.
`.trim();

export const GOLDEN_SET: GoldenExample[] = [
  {
    id: "test-001",
    promptId: "test",
    schemaId: "test",
    input:
      'Reply with ONLY raw JSON, no markdown fences, matching exactly {"answer": "<string>"}. Set answer to "golden-set-ok".',
    expected: { answer: "golden-set-ok" },
    score: scoreExactMatch,
  },
  {
    id: "risk-001",
    promptId: "risk",
    schemaId: "risk",
    input: RISK_SAMPLE_1,
    expected: {
      flagCategories: ["liability", "payment", "indemnification"],
      minObligations: 1,
      minKeyDates: 0,
    } satisfies RiskGoldenExpectation,
    score: scoreRiskExtraction,
  },
  {
    id: "risk-002",
    promptId: "risk",
    schemaId: "risk",
    input: RISK_SAMPLE_2,
    expected: {
      flagCategories: ["confidentiality"],
      minObligations: 1,
      minKeyDates: 1,
    } satisfies RiskGoldenExpectation,
    score: scoreRiskExtraction,
  },
  {
    id: "summary-001",
    promptId: "summary",
    schemaId: "summary",
    input: SUMMARY_SAMPLE_1,
    expected: {
      mustMention: [
        "Harborview Analytics",
        "Pinecrest Cloud Services",
        "30 days",
      ],
    } satisfies SummaryGoldenExpectation,
    score: scoreSummaryGroundedness,
  },
  {
    id: "summary-002",
    promptId: "summary",
    schemaId: "summary",
    input: SUMMARY_SAMPLE_2,
    expected: {
      mustMention: ["Fernbridge Retail", "Solvane Analytics"],
    } satisfies SummaryGoldenExpectation,
    score: scoreSummaryGroundedness,
  },
];
