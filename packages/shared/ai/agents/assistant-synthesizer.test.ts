const mockGetValidatedCompletion = jest.fn();

jest.mock("../schemas", () => ({
  ...jest.requireActual("../schemas"),
  getValidatedCompletion: (...args: unknown[]) => mockGetValidatedCompletion(...args),
}));

// synthesizeAssistantAnswer() calls markValidationFailed() (../providers)
// directly once retries are exhausted on an unknown-evidence-id citation -
// that function reaches the real Prisma client via getPrismaClient(), so
// it's mocked here the same way investigator.test.ts mocks it.
const mockPrisma = {
  aICallLog: {
    update: jest.fn(),
  },
};
jest.mock("../../db", () => ({
  getPrismaClient: () => mockPrisma,
}));

import {
  buildSynthesisMessages,
  synthesizeAssistantAnswer,
  resolveCitedIds,
} from "./assistant-synthesizer";
import { AiValidationError } from "../schemas";
import type { AggregatedAssistantContext, AssistantEvidenceUnit } from "./assistant-aggregation";

const EVIDENCE: AssistantEvidenceUnit[] = [
  {
    id: "chunk-1",
    tool: "searchLegalKnowledge",
    capability: "Legal Knowledge Base",
    label: "Code of Obligations and Contracts — Article 654",
    content: "نص المادة 654",
    confidence: 85,
  },
];

function contextOf(overrides: Partial<AggregatedAssistantContext> = {}): AggregatedAssistantContext {
  return {
    evidence: [],
    subAnswers: [],
    contractsFound: [],
    failedTools: [],
    emptyResults: [],
    hasEvidence: false,
    ...overrides,
  };
}

function completionResult(data: unknown, callLogId = "log-1") {
  return { data, model: "mock", tokensIn: 0, tokensOut: 0, callLogId };
}

describe("resolveCitedIds", () => {
  const aggregated = { evidence: EVIDENCE, contractsFound: [] };

  it("keeps a cited id that exists in the evidence list", () => {
    expect(resolveCitedIds(["chunk-1"], aggregated)).toEqual({
      keptIds: ["chunk-1"],
      unknownIds: [],
    });
  });

  it("flags a cited id that matches neither evidence nor a found contract as unknown", () => {
    const result = resolveCitedIds(["chunk-1", "chunk-999"], aggregated);
    expect(result.keptIds).toEqual(["chunk-1"]);
    expect(result.unknownIds).toEqual(["chunk-999"]);
  });

  it("silently drops a cited id that matches a found contract, without treating it as unknown", () => {
    // Regression proof for a real bug found live (2026-08-19): the model
    // sometimes cites a contractsFound id as if it were an evidence
    // source. That id is real, not a hallucination - two otherwise
    // perfectly answerable "which contracts..." questions 502'd because
    // this was previously treated the same as a genuinely unknown id.
    const result = resolveCitedIds(["contract-1"], {
      evidence: [],
      contractsFound: [
        { id: "contract-1", title: "MSA", counterparty: "Acme", legalState: "ACTIVE", tags: [], expirationDate: null },
      ],
    });
    expect(result).toEqual({ keptIds: [], unknownIds: [] });
  });
});

describe("buildSynthesisMessages", () => {
  it("includes evidence blocks, contracts found, and unavailable tools when present", () => {
    const aggregated = contextOf({
      evidence: EVIDENCE,
      contractsFound: [
        { id: "c1", title: "MSA", counterparty: "Acme", legalState: "ACTIVE", tags: ["software"], expirationDate: null },
      ],
      failedTools: [{ tool: "searchOrganizationBrain", error: "unavailable" }],
      hasEvidence: true,
    });

    const messages = buildSynthesisMessages("SYSTEM", [], "what does article 654 say?", aggregated);
    const userContent = messages[messages.length - 1].content;

    expect(userContent).toContain("[EVIDENCE id=chunk-1");
    expect(userContent).toContain("Contracts found");
    expect(userContent).toContain("MSA");
    expect(userContent).toContain("searchOrganizationBrain was unavailable");
    expect(userContent).toContain("what does article 654 say?");
  });

  it("reveals the specific reason for a notIndexed failure instead of the generic 'was unavailable' phrasing", () => {
    const aggregated = contextOf({
      failedTools: [
        {
          tool: "askContractQuestion",
          error: "This contract has not been indexed for Clause Investigator yet",
          notIndexed: true,
        },
      ],
    });

    const messages = buildSynthesisMessages("SYSTEM", [], "what are the payment terms?", aggregated);
    const userContent = messages[messages.length - 1].content;

    expect(userContent).toContain(
      "- askContractQuestion: This contract has not been indexed for Clause Investigator yet",
    );
    expect(userContent).not.toContain("askContractQuestion was unavailable");
  });

  it("states plainly that no evidence was gathered when the aggregated context is empty", () => {
    const messages = buildSynthesisMessages("SYSTEM", [], "hello", contextOf());
    expect(messages[messages.length - 1].content).toContain(
      "No evidence was gathered for this question.",
    );
  });

  it("surfaces a successful-but-empty search as a distinct, positive signal, not as 'no evidence'", () => {
    const aggregated = contextOf({
      emptyResults: [
        {
          tool: "searchContracts",
          note: "A contract search ran successfully and matched zero contracts.",
        },
      ],
    });

    const userContent = buildSynthesisMessages(
      "SYSTEM",
      [],
      "which contracts are expiring soon?",
      aggregated,
    )[1].content;

    expect(userContent).toContain("Searches that ran successfully and found nothing");
    expect(userContent).toContain("matched zero contracts");
    expect(userContent).not.toContain("No evidence was gathered for this question.");
  });

  it("presents a sub-tool's own answer as non-citable background context, distinct from the EVIDENCE blocks", () => {
    const aggregated = contextOf({
      subAnswers: [
        {
          tool: "searchOrganizationBrain",
          capability: "Organization Brain",
          text: "Our standard confidentiality term is 3 to 5 years.",
        },
      ],
    });

    const userContent = buildSynthesisMessages(
      "SYSTEM",
      [],
      "what does our confidentiality policy say?",
      aggregated,
    )[1].content;

    expect(userContent).toContain("Prior capability answers");
    expect(userContent).toContain("NOT citable");
    expect(userContent).toContain("Our standard confidentiality term is 3 to 5 years.");
    expect(userContent).not.toContain("[EVIDENCE id=");
  });
});

describe("synthesizeAssistantAnswer", () => {
  beforeEach(() => {
    mockGetValidatedCompletion.mockReset();
  });

  it("returns the answer with each cited source enriched from the aggregated evidence", async () => {
    mockGetValidatedCompletion.mockResolvedValueOnce(
      completionResult({
        answer: "Article 654 governs termination.",
        sources: [{ id: "chunk-1" }],
        confidence: 85,
      }),
    );

    const result = await synthesizeAssistantAnswer({
      organizationId: "org-1",
      question: "what does article 654 say?",
      aggregated: contextOf({ evidence: EVIDENCE, hasEvidence: true }),
    });

    expect(result.answer).toBe("Article 654 governs termination.");
    expect(result.sources).toEqual([
      {
        id: "chunk-1",
        tool: "searchLegalKnowledge",
        capability: "Legal Knowledge Base",
        label: "Code of Obligations and Contracts — Article 654",
        excerpt: "نص المادة 654",
        contractId: undefined,
      },
    ]);
    expect(result.confidence).toBe(85);
  });

  it("returns one enriched source even when the model cites the same evidence id more than once", async () => {
    mockGetValidatedCompletion.mockResolvedValueOnce(
      completionResult({
        answer: "Article 654 governs termination, and also governs remedies.",
        sources: [{ id: "chunk-1" }, { id: "chunk-1" }, { id: "chunk-1" }],
        confidence: 85,
      }),
    );

    const result = await synthesizeAssistantAnswer({
      organizationId: "org-1",
      question: "what does article 654 say?",
      aggregated: contextOf({ evidence: EVIDENCE, hasEvidence: true }),
    });

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].id).toBe("chunk-1");
  });

  it("succeeds on the first attempt, with an empty sources list, when the model cites a contractsFound id instead of evidence", async () => {
    mockGetValidatedCompletion.mockResolvedValueOnce(
      completionResult({
        answer: "Your active contracts are the MSA and the NDA.",
        sources: [{ id: "contract-1" }],
        confidence: 90,
      }),
    );

    const result = await synthesizeAssistantAnswer({
      organizationId: "org-1",
      question: "which contracts are active?",
      aggregated: contextOf({
        contractsFound: [
          { id: "contract-1", title: "MSA", counterparty: "Acme", legalState: "ACTIVE", tags: [], expirationDate: null },
        ],
        hasEvidence: true,
      }),
    });

    expect(result.answer).toBe("Your active contracts are the MSA and the NDA.");
    expect(result.sources).toEqual([]);
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(1);
  });

  it("retries once on a validation failure and succeeds on the second attempt", async () => {
    mockGetValidatedCompletion
      .mockRejectedValueOnce(new AiValidationError("bad json", "log-1"))
      .mockResolvedValueOnce(completionResult({ answer: "hi", sources: [] }));

    const result = await synthesizeAssistantAnswer({
      organizationId: "org-1",
      question: "hello",
      aggregated: contextOf(),
    });

    expect(result.answer).toBe("hi");
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(2);
  });

  it("retries when the model cites an unknown evidence id, and succeeds once it self-corrects", async () => {
    mockGetValidatedCompletion
      .mockResolvedValueOnce(
        completionResult({ answer: "...", sources: [{ id: "not-real" }] }, "log-1"),
      )
      .mockResolvedValueOnce(
        completionResult({ answer: "Article 654 governs termination.", sources: [{ id: "chunk-1" }] }, "log-2"),
      );

    const result = await synthesizeAssistantAnswer({
      organizationId: "org-1",
      question: "what does article 654 say?",
      aggregated: contextOf({ evidence: EVIDENCE, hasEvidence: true }),
    });

    expect(result.answer).toBe("Article 654 governs termination.");
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(2);
  });

  it("falls back to a safe decline rather than a fabricated citation, after exhausting retries when the model keeps citing an unknown evidence id", async () => {
    mockGetValidatedCompletion.mockResolvedValue(
      completionResult({ answer: "...", sources: [{ id: "not-real" }] }),
    );

    const result = await synthesizeAssistantAnswer({
      organizationId: "org-1",
      question: "what does article 654 say?",
      aggregated: contextOf({ evidence: EVIDENCE, hasEvidence: true }),
    });

    expect(result.answer).toBe(
      "I couldn't find enough grounded information to answer that reliably.",
    );
    expect(result.sources).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(2);
    expect(mockPrisma.aICallLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "VALIDATION_FAILED",
          errorMessage: expect.stringContaining("Cited unknown evidence id(s) after 2 attempt"),
        }),
      }),
    );
  });

  it("does not retry on a non-validation error", async () => {
    mockGetValidatedCompletion.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(
      synthesizeAssistantAnswer({
        organizationId: "org-1",
        question: "hello",
        aggregated: contextOf(),
      }),
    ).rejects.toThrow("provider unavailable");
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(1);
  });
});
