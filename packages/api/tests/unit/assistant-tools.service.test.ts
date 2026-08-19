// A fully hand-rolled mock, not jest.requireActual + overrides - same
// convention organization-brain.service.test.ts already uses. Pulling in
// the real @starter-kit/shared module here would initialize its real
// Prisma/Redis/BullMQ singletons at import time, which have no test
// double to talk to in this unit-test process.
const mockAnswerContractQuestion = jest.fn();
const mockAnswerOrganizationBrainQuestion = jest.fn();
const mockAnswerLegalKbQuestion = jest.fn();

jest.mock("@starter-kit/shared", () => ({
  answerContractQuestion: (...args: unknown[]) => mockAnswerContractQuestion(...args),
  answerOrganizationBrainQuestion: (...args: unknown[]) =>
    mockAnswerOrganizationBrainQuestion(...args),
  answerLegalKbQuestion: (...args: unknown[]) => mockAnswerLegalKbQuestion(...args),
}));

const mockContractRepository = {
  findMany: jest.fn(),
  count: jest.fn(),
  findById: jest.fn(),
};

jest.mock("../../src/repositories/contract.repository", () => ({
  contractRepository: mockContractRepository,
}));

const mockAiAnalysisService = {
  getRiskOverview: jest.fn(),
  getSummaryOverview: jest.fn(),
};

jest.mock("../../src/services/ai-analysis.service", () => ({
  aiAnalysisService: mockAiAnalysisService,
}));

import { createError } from "../../src/middleware/error-handler";
import { assistantToolsService } from "../../src/services/assistant-tools.service";
import type { ToolResult } from "@starter-kit/shared";

// ToolExecuteFn's declared return type is the full ToolResult union (every
// tool's data shape), since that's what the executor needs to accept
// generically - narrowing to one tool's own result type here is a test
// convenience, not a production concern (executor.ts never accesses
// `.data` without going through the corresponding tool's own consumer).
function asToolResult<TTool extends ToolResult["tool"]>(
  result: ToolResult,
  _tool: TTool,
): Extract<ToolResult, { tool: TTool }> {
  return result as Extract<ToolResult, { tool: TTool }>;
}

const CONTEXT = { organizationId: "org-1" };
const CONTRACT_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("assistantToolsService.searchContracts", () => {
  it("scopes the query to the caller's organization and maps rows to the tool result shape", async () => {
    mockContractRepository.findMany.mockResolvedValueOnce([
      {
        id: CONTRACT_ID,
        title: "MSA",
        counterparty: "Acme",
        legalState: "ACTIVE",
        tags: ["software"],
        expirationDate: new Date("2027-01-01T00:00:00.000Z"),
        effectiveDate: null,
        version: 1,
        updatedAt: new Date(),
      },
    ]);
    mockContractRepository.count.mockResolvedValueOnce(1);

    const result = await assistantToolsService.searchContracts!(
      { legalState: "ACTIVE" },
      CONTEXT,
    );

    expect(mockContractRepository.findMany).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ legalState: "ACTIVE" }),
      expect.anything(),
      expect.anything(),
    );
    expect(result).toEqual({
      tool: "searchContracts",
      data: {
        contracts: [
          {
            id: CONTRACT_ID,
            title: "MSA",
            counterparty: "Acme",
            legalState: "ACTIVE",
            tags: ["software"],
            expirationDate: "2027-01-01T00:00:00.000Z",
          },
        ],
        totalMatched: 1,
      },
    });
  });

  it("reports null expirationDate as null, not a formatting error", async () => {
    mockContractRepository.findMany.mockResolvedValueOnce([
      {
        id: CONTRACT_ID,
        title: "MSA",
        counterparty: "Acme",
        legalState: "ACTIVE",
        tags: [],
        expirationDate: null,
        effectiveDate: null,
        version: 1,
        updatedAt: new Date(),
      },
    ]);
    mockContractRepository.count.mockResolvedValueOnce(1);

    const raw = await assistantToolsService.searchContracts!({}, CONTEXT);
    const result = asToolResult(raw, "searchContracts");

    expect(result.data.contracts[0].expirationDate).toBeNull();
  });
});

describe("assistantToolsService.getContractAnalysis", () => {
  it("throws when the contract does not belong to the caller's organization", async () => {
    mockContractRepository.findById.mockResolvedValueOnce(null);

    await expect(
      assistantToolsService.getContractAnalysis!({ contractId: CONTRACT_ID }, CONTEXT),
    ).rejects.toThrow("Contract not found in this organization");

    expect(mockAiAnalysisService.getRiskOverview).not.toHaveBeenCalled();
  });

  it("returns both risk and summary when both exist", async () => {
    mockContractRepository.findById.mockResolvedValueOnce({ id: CONTRACT_ID });
    mockAiAnalysisService.getRiskOverview.mockResolvedValueOnce({
      analysisId: "analysis-risk-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      healthScore: 80,
      summary: "Generally low risk.",
      redFlags: [
        {
          severity: "HIGH",
          category: "LIABILITY",
          description: "Unlimited liability clause",
          sourceText: "The Vendor shall be liable without limitation...",
        },
      ],
      timeline: [],
    });
    mockAiAnalysisService.getSummaryOverview.mockResolvedValueOnce({
      analysisId: "analysis-summary-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      text: "A standard software services agreement.",
    });

    const result = await assistantToolsService.getContractAnalysis!(
      { contractId: CONTRACT_ID },
      CONTEXT,
    );

    expect(result).toEqual({
      tool: "getContractAnalysis",
      data: {
        contractId: CONTRACT_ID,
        risk: {
          analysisId: "analysis-risk-1",
          healthScore: 80,
          summary: "Generally low risk.",
          redFlags: [
            {
              severity: "HIGH",
              category: "LIABILITY",
              description: "Unlimited liability clause",
              sourceText: "The Vendor shall be liable without limitation...",
            },
          ],
        },
        summary: {
          analysisId: "analysis-summary-1",
          text: "A standard software services agreement.",
        },
      },
    });
  });

  it("returns null (not an error) for an analysis type that hasn't completed yet", async () => {
    mockContractRepository.findById.mockResolvedValueOnce({ id: CONTRACT_ID });
    mockAiAnalysisService.getRiskOverview.mockRejectedValueOnce(
      createError("No completed risk analysis found for this contract", 404),
    );
    mockAiAnalysisService.getSummaryOverview.mockResolvedValueOnce({
      analysisId: "analysis-summary-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      text: "A standard software services agreement.",
    });

    const raw = await assistantToolsService.getContractAnalysis!(
      { contractId: CONTRACT_ID },
      CONTEXT,
    );
    const result = asToolResult(raw, "getContractAnalysis");

    expect(result.data.risk).toBeNull();
    expect(result.data.summary).not.toBeNull();
  });

  it("propagates a non-404 error instead of silently swallowing it", async () => {
    mockContractRepository.findById.mockResolvedValueOnce({ id: CONTRACT_ID });
    mockAiAnalysisService.getRiskOverview.mockRejectedValueOnce(
      createError("Stored risk analysis does not match its recorded schema", 500),
    );
    mockAiAnalysisService.getSummaryOverview.mockResolvedValueOnce(null);

    await expect(
      assistantToolsService.getContractAnalysis!({ contractId: CONTRACT_ID }, CONTEXT),
    ).rejects.toThrow("Stored risk analysis does not match its recorded schema");
  });
});

describe("assistantToolsService.askContractQuestion", () => {
  it("throws when the contract does not belong to the caller's organization, without calling the investigator", async () => {
    mockContractRepository.findById.mockResolvedValueOnce(null);

    await expect(
      assistantToolsService.askContractQuestion!(
        { contractId: CONTRACT_ID, question: "what is the notice period?" },
        CONTEXT,
      ),
    ).rejects.toThrow("Contract not found in this organization");

    expect(mockAnswerContractQuestion).not.toHaveBeenCalled();
  });

  it("delegates to answerContractQuestion and tags the result with the contractId", async () => {
    mockContractRepository.findById.mockResolvedValueOnce({ id: CONTRACT_ID });
    mockAnswerContractQuestion.mockResolvedValueOnce({
      answer: "30 days.",
      sources: [{ chunkId: "chunk-1", excerpt: "30 days notice", sourceId: CONTRACT_ID, headingPath: null }],
      confidence: 90,
      chunksRetrieved: 3,
    });

    const result = await assistantToolsService.askContractQuestion!(
      { contractId: CONTRACT_ID, question: "what is the notice period?" },
      CONTEXT,
    );

    expect(mockAnswerContractQuestion).toHaveBeenCalledWith({
      contractId: CONTRACT_ID,
      organizationId: "org-1",
      question: "what is the notice period?",
    });
    expect(result).toEqual({
      tool: "askContractQuestion",
      data: {
        contractId: CONTRACT_ID,
        answer: "30 days.",
        sources: [{ chunkId: "chunk-1", excerpt: "30 days notice", sourceId: CONTRACT_ID, headingPath: null }],
        confidence: 90,
        chunksRetrieved: 3,
      },
    });
  });
});

describe("assistantToolsService.searchOrganizationBrain", () => {
  it("delegates to answerOrganizationBrainQuestion, scoped to the caller's organization", async () => {
    mockAnswerOrganizationBrainQuestion.mockResolvedValueOnce({
      answer: "Our standard notice period is 30 days.",
      sources: [],
      confidence: 70,
      chunksRetrieved: 2,
    });

    const result = await assistantToolsService.searchOrganizationBrain!(
      { question: "what is our standard notice period?" },
      CONTEXT,
    );

    expect(mockAnswerOrganizationBrainQuestion).toHaveBeenCalledWith({
      organizationId: "org-1",
      question: "what is our standard notice period?",
    });
    expect(result.tool).toBe("searchOrganizationBrain");
  });
});

describe("assistantToolsService.searchLegalKnowledge", () => {
  it("delegates to answerLegalKbQuestion, passing organizationId only for attribution", async () => {
    mockAnswerLegalKbQuestion.mockResolvedValueOnce({
      answer: "Article 654 governs...",
      sources: [],
      confidence: 85,
      chunksRetrieved: 4,
    });

    const result = await assistantToolsService.searchLegalKnowledge!(
      { question: "what does article 654 say?" },
      CONTEXT,
    );

    expect(mockAnswerLegalKbQuestion).toHaveBeenCalledWith({
      organizationId: "org-1",
      question: "what does article 654 say?",
    });
    expect(result.tool).toBe("searchLegalKnowledge");
  });
});
