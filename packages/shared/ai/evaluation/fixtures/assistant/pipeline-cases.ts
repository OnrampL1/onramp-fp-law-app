import type { ToolImplementations } from "../../../tools/types";

// Fake, not real (packages/api-backed) implementations - see
// run-assistant.ts's comment on why. These exercise the real planner and
// real synthesis logic end to end; only the tool bodies themselves are
// stand-ins for a real database/retrieval call.

// PIPE-01: cross-capability, both fakes succeed - proves the full pipeline
// (planner decides to call two distinct capabilities, both run, synthesis
// grounds in both) works together, not just each stage in isolation.
//
// Names the contract id explicitly (a realistic "already looking at this
// contract" scenario, e.g. asked from a contract detail page) rather than
// asking the planner to find it by search first: per the planner prompt's
// own instruction (prompts/assistant-planner/v1.md), a single-round plan
// deliberately never guesses a contractId it wasn't given, so a question
// that both names a set of contracts AND asks for per-contract analysis in
// one round is the genuinely unsolved multi-hop case
// (AI_ARCHITECTURE.md Section 7's documented, accepted limitation) - not
// something this pipeline case is meant to prove works. Tool selection
// itself (does the planner call searchContracts alone when no id is known)
// is already covered separately at the planner-stage tier by P-01.
export const PIPE01_QUESTION =
  "For the Master Services Agreement with Acme Robotics (contract id 11111111-1111-1111-1111-111111111111), what liability risks does it have, and what does Lebanese law say about that?";

export const PIPE01_IMPLEMENTATIONS: ToolImplementations = {
  searchContracts: async () => ({
    tool: "searchContracts",
    data: {
      contracts: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          title: "Master Services Agreement",
          counterparty: "Acme Robotics Inc.",
          legalState: "ACTIVE",
          tags: [],
          expirationDate: null,
        },
      ],
      totalMatched: 1,
    },
  }),
  getContractAnalysis: async () => ({
    tool: "getContractAnalysis",
    data: {
      contractId: "11111111-1111-1111-1111-111111111111",
      risk: {
        analysisId: "analysis-1",
        healthScore: 40,
        summary: "Elevated liability exposure.",
        redFlags: [
          {
            severity: "HIGH",
            category: "LIABILITY",
            description: "Unlimited liability clause",
            sourceText:
              "The Vendor shall be liable without limitation for any and all damages.",
          },
        ],
      },
      summary: null,
    },
  }),
  searchLegalKnowledge: async () => ({
    tool: "searchLegalKnowledge",
    data: {
      answer:
        "Article 654 prohibits pre-agreeing to waive liability for gross fault or fraud.",
      sources: [
        {
          chunkId: "legal-chunk-1",
          excerpt:
            "لا يجوز الاتفاق مسبقا على اعفاء المدين من كل مسؤولية ناشئة عن غشه او خطئه الجسيم.",
          sourceId: "source-1",
          headingPath: "Article 654",
          instrumentTitle: "Code of Obligations and Contracts",
          articleNumber: "654",
          officialGazetteReference: null,
          amendingInstrument: null,
          amendmentEffectiveDate: null,
          promulgatingAuthority: "Lebanese Republic",
          compilerSource: "Lebanese University",
          sourceUrl: "https://example.test",
          lastVerifiedAt: null,
        },
      ],
      confidence: 85,
      chunksRetrieved: 1,
    },
  }),
};

// PIPE-02: one tool genuinely fails (a thrown error, exactly what a real
// upstream outage looks like to the executor) - proves the pipeline still
// returns a coherent, grounded-in-what-it-has answer instead of crashing
// or silently fabricating the missing capability's content. Same explicit-
// contract-id reasoning as PIPE-01 above.
export const PIPE02_QUESTION =
  "What does our organization's policy say about liability, and does the Master Services Agreement with Acme Robotics (contract id 11111111-1111-1111-1111-111111111111) comply?";

export const PIPE02_IMPLEMENTATIONS: ToolImplementations = {
  getContractAnalysis: async () => ({
    tool: "getContractAnalysis",
    data: {
      contractId: "11111111-1111-1111-1111-111111111111",
      risk: {
        analysisId: "analysis-1",
        healthScore: 40,
        summary: "Elevated liability exposure.",
        redFlags: [
          {
            severity: "HIGH",
            category: "LIABILITY",
            description: "Unlimited liability clause",
            sourceText:
              "The Vendor shall be liable without limitation for any and all damages.",
          },
        ],
      },
      summary: null,
    },
  }),
  searchOrganizationBrain: async () => {
    throw new Error("Organization Brain is temporarily unavailable");
  },
};

// PIPE-03: a successful search that correctly matches nothing - regression
// proof for a real bug found live (2026-08-19): "which of our active
// contracts are expiring in the next 90 days" against an organization with
// genuinely none produced the same generic "I couldn't find enough
// grounded information" decline as a question nothing was ever searched
// for, because a zero-match search vanished entirely instead of surfacing
// as a real, positive "searched, found none" signal. Fixed via
// AggregatedAssistantContext.emptyResults - this case proves the fix holds
// against the live model, not just that the code path exists.
export const PIPE03_QUESTION =
  "Which of our active contracts are expiring in the next 90 days?";

export const PIPE03_IMPLEMENTATIONS: ToolImplementations = {
  searchContracts: async () => ({
    tool: "searchContracts",
    data: { contracts: [], totalMatched: 0 },
  }),
};
