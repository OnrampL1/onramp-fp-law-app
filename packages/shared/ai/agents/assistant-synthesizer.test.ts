const mockGetValidatedCompletion = jest.fn();

jest.mock("../schemas", () => ({
  ...jest.requireActual("../schemas"),
  getValidatedCompletion: (...args: unknown[]) => mockGetValidatedCompletion(...args),
}));

import {
  buildSynthesisMessages,
  synthesizeAssistantAnswer,
  verifyEvidenceReferences,
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
    contractsFound: [],
    failedTools: [],
    hasEvidence: false,
    ...overrides,
  };
}

function completionResult(data: unknown, callLogId = "log-1") {
  return { data, model: "mock", tokensIn: 0, tokensOut: 0, callLogId };
}

describe("verifyEvidenceReferences", () => {
  it("passes when every cited id exists in the evidence list", () => {
    expect(verifyEvidenceReferences(["chunk-1"], EVIDENCE)).toEqual({ valid: true });
  });

  it("fails and names the unknown id(s) when a citation doesn't match any evidence unit", () => {
    const result = verifyEvidenceReferences(["chunk-1", "chunk-999"], EVIDENCE);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("chunk-999");
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

  it("states plainly that no evidence was gathered when the aggregated context is empty", () => {
    const messages = buildSynthesisMessages("SYSTEM", [], "hello", contextOf());
    expect(messages[messages.length - 1].content).toContain(
      "No evidence was gathered for this question.",
    );
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

  it("throws after exhausting retries when the model keeps citing an unknown evidence id", async () => {
    mockGetValidatedCompletion.mockResolvedValue(
      completionResult({ answer: "...", sources: [{ id: "not-real" }] }),
    );

    await expect(
      synthesizeAssistantAnswer({
        organizationId: "org-1",
        question: "what does article 654 say?",
        aggregated: contextOf({ evidence: EVIDENCE, hasEvidence: true }),
      }),
    ).rejects.toThrow(AiValidationError);
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(2);
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
