import { aggregateToolResults } from "./assistant-aggregation";
import type { ToolExecutionOutcome } from "../tools/executor";

const CONTRACT_ID = "11111111-1111-1111-1111-111111111111";

describe("aggregateToolResults", () => {
  it("collects and dedupes contracts from searchContracts outcomes without adding evidence", () => {
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "searchContracts",
        ok: true,
        result: {
          tool: "searchContracts",
          data: {
            contracts: [
              { id: "c1", title: "MSA", counterparty: "Acme", legalState: "ACTIVE", tags: [], expirationDate: null },
              { id: "c2", title: "NDA", counterparty: "Beta", legalState: "ACTIVE", tags: [], expirationDate: null },
            ],
            totalMatched: 2,
          },
        },
      },
      {
        tool: "searchContracts",
        ok: true,
        result: {
          tool: "searchContracts",
          data: {
            contracts: [
              { id: "c1", title: "MSA", counterparty: "Acme", legalState: "ACTIVE", tags: [], expirationDate: null },
            ],
            totalMatched: 1,
          },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.contractsFound.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(result.evidence).toEqual([]);
    expect(result.hasEvidence).toBe(true);
  });

  it("turns getContractAnalysis's risk and summary into separate evidence units", () => {
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "getContractAnalysis",
        ok: true,
        result: {
          tool: "getContractAnalysis",
          data: {
            contractId: CONTRACT_ID,
            risk: {
              analysisId: "risk-1",
              healthScore: 60,
              summary: "Elevated liability exposure.",
              redFlags: [
                {
                  severity: "HIGH",
                  category: "LIABILITY",
                  description: "Unlimited liability clause",
                  sourceText: "The Vendor shall be liable without limitation...",
                },
              ],
            },
            summary: { analysisId: "summary-1", text: "A standard SaaS agreement." },
          },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.evidence).toHaveLength(3);
    expect(result.evidence.map((e) => e.label)).toEqual([
      "Risk analysis summary",
      "HIGH risk — LIABILITY",
      "Contract summary",
    ]);
    expect(result.evidence.every((e) => e.contractId === CONTRACT_ID)).toBe(true);
    expect(result.evidence.every((e) => e.capability === "Contract Analysis")).toBe(true);
  });

  it("produces no evidence for a contract with neither risk nor summary completed yet", () => {
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "getContractAnalysis",
        ok: true,
        result: {
          tool: "getContractAnalysis",
          data: { contractId: CONTRACT_ID, risk: null, summary: null },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.evidence).toEqual([]);
    expect(result.hasEvidence).toBe(false);
  });

  it("turns askContractQuestion's answer and sources into evidence units carrying contractId and confidence", () => {
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "askContractQuestion",
        ok: true,
        result: {
          tool: "askContractQuestion",
          data: {
            contractId: CONTRACT_ID,
            answer: "The notice period is 30 days.",
            sources: [
              { chunkId: "chunk-1", excerpt: "30 days notice", sourceId: CONTRACT_ID, headingPath: "Section 4" },
            ],
            confidence: 88,
            chunksRetrieved: 3,
          },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0]).toMatchObject({ label: "Clause Investigator answer", contractId: CONTRACT_ID, confidence: 88 });
    expect(result.evidence[1]).toMatchObject({ id: "chunk-1", label: "Section 4", contractId: CONTRACT_ID, confidence: 88 });
  });

  it("turns searchOrganizationBrain's result into evidence units without a contractId", () => {
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "searchOrganizationBrain",
        ok: true,
        result: {
          tool: "searchOrganizationBrain",
          data: {
            answer: "Our standard notice period is 30 days.",
            sources: [{ chunkId: "chunk-2", excerpt: "30 days notice", sourceId: "doc-1", headingPath: null }],
            confidence: 70,
            chunksRetrieved: 2,
          },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.evidence.every((e) => e.contractId === undefined)).toBe(true);
    expect(result.evidence.map((e) => e.capability)).toEqual([
      "Organization Brain",
      "Organization Brain",
    ]);
  });

  it("labels searchLegalKnowledge evidence with the instrument and article number when present", () => {
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "searchLegalKnowledge",
        ok: true,
        result: {
          tool: "searchLegalKnowledge",
          data: {
            answer: "Article 654 governs...",
            sources: [
              {
                chunkId: "chunk-3",
                excerpt: "نص المادة",
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
            chunksRetrieved: 4,
          },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.evidence[1].label).toBe("Code of Obligations and Contracts — Article 654");
    expect(result.evidence[1].capability).toBe("Legal Knowledge Base");
  });

  it("routes a failed outcome to failedTools instead of evidence", () => {
    const outcomes: ToolExecutionOutcome[] = [
      { tool: "searchLegalKnowledge", ok: false, error: "Legal Knowledge Base is temporarily unavailable" },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.evidence).toEqual([]);
    expect(result.failedTools).toEqual([
      { tool: "searchLegalKnowledge", error: "Legal Knowledge Base is temporarily unavailable" },
    ]);
    expect(result.hasEvidence).toBe(false);
  });

  it("carries notIndexed through to failedTools when the outcome was tagged by the executor", () => {
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "askContractQuestion",
        ok: false,
        error: "This contract has not been indexed for Clause Investigator yet",
        notIndexed: true,
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.failedTools).toEqual([
      {
        tool: "askContractQuestion",
        error: "This contract has not been indexed for Clause Investigator yet",
        notIndexed: true,
      },
    ]);
  });

  it("collapses a source cited more than once by the same tool call into one evidence unit", () => {
    // A real, observed case: a single-chunk document where the inner
    // answerOrganizationBrainQuestion() call cites the same chunkId
    // multiple times to ground several separate sentences.
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "searchOrganizationBrain",
        ok: true,
        result: {
          tool: "searchOrganizationBrain",
          data: {
            answer: "Our policy requires 3-5 year confidentiality terms.",
            sources: [
              { chunkId: "chunk-1", excerpt: "3 to 5 years", sourceId: "doc-1", headingPath: null },
              { chunkId: "chunk-1", excerpt: "3 to 5 years", sourceId: "doc-1", headingPath: null },
              { chunkId: "chunk-1", excerpt: "3 to 5 years", sourceId: "doc-1", headingPath: null },
            ],
            confidence: 90,
            chunksRetrieved: 1,
          },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    // One "answer" unit plus exactly one deduped "chunk-1" unit, not three.
    expect(result.evidence).toHaveLength(2);
    expect(result.evidence.filter((e) => e.id === "chunk-1")).toHaveLength(1);
  });

  it("records a successful-but-empty searchContracts as an emptyResult, distinct from failedTools and evidence", () => {
    // Regression proof for a real bug found live: "which of our active
    // contracts are expiring in the next 90 days" against an organization
    // with genuinely none produced the same generic decline as a question
    // nothing was ever searched for, because a zero-match search vanished
    // entirely instead of surfacing as a real, positive "searched, found
    // none" signal.
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "searchContracts",
        ok: true,
        result: {
          tool: "searchContracts",
          data: { contracts: [], totalMatched: 0 },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.contractsFound).toEqual([]);
    expect(result.evidence).toEqual([]);
    expect(result.failedTools).toEqual([]);
    expect(result.emptyResults).toEqual([
      {
        tool: "searchContracts",
        note: "A contract search ran successfully and matched zero contracts.",
      },
    ]);
  });

  it("records a successful getContractAnalysis with neither risk nor summary as an emptyResult", () => {
    const outcomes: ToolExecutionOutcome[] = [
      {
        tool: "getContractAnalysis",
        ok: true,
        result: {
          tool: "getContractAnalysis",
          data: { contractId: CONTRACT_ID, risk: null, summary: null },
        },
      },
    ];

    const result = aggregateToolResults(outcomes);

    expect(result.evidence).toEqual([]);
    expect(result.emptyResults).toEqual([
      {
        tool: "getContractAnalysis",
        note: `No completed AI analysis exists yet for contract ${CONTRACT_ID}.`,
      },
    ]);
  });

  it("reports hasEvidence false and empty lists for an empty plan's outcomes", () => {
    const result = aggregateToolResults([]);

    expect(result).toEqual({
      evidence: [],
      contractsFound: [],
      failedTools: [],
      emptyResults: [],
      hasEvidence: false,
    });
  });
});
