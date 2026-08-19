// Hand-rolled mock, not jest.requireActual - see
// assistant-tools.service.test.ts for why (real @starter-kit/shared
// initializes real Prisma/Redis/BullMQ singletons at import time).
const mockRunAssistant = jest.fn();

class FakeAiValidationError extends Error {}
class FakeAiProviderError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

jest.mock("@starter-kit/shared", () => ({
  runAssistant: (...args: unknown[]) => mockRunAssistant(...args),
  AiValidationError: FakeAiValidationError,
  AiProviderError: FakeAiProviderError,
}));

jest.mock("../../src/services/assistant-tools.service", () => ({
  assistantToolsService: { fakeMarker: true },
}));

import { assistantService } from "../../src/services/assistant.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("assistantService.ask", () => {
  it("passes the caller's organizationId, question, history, and the tool implementations to runAssistant", async () => {
    mockRunAssistant.mockResolvedValueOnce({
      answer: "30 days.",
      sources: [],
      confidence: 90,
      toolsUsed: [],
      toolsFailed: [],
    });

    await assistantService.ask("org-1", { question: "what is the notice period?", history: [] });

    expect(mockRunAssistant).toHaveBeenCalledWith({
      organizationId: "org-1",
      question: "what is the notice period?",
      history: [],
      implementations: { fakeMarker: true },
    });
  });

  it("maps runAssistant's result to the flatter response DTO, dropping tool/toolsUsed/toolsFailed", async () => {
    mockRunAssistant.mockResolvedValueOnce({
      answer: "Article 654 governs liability.",
      sources: [
        {
          id: "chunk-1",
          tool: "searchLegalKnowledge",
          capability: "Legal Knowledge Base",
          label: "Code of Obligations and Contracts — Article 654",
          excerpt: "نص المادة 654",
          contractId: undefined,
        },
      ],
      confidence: 82,
      toolsUsed: ["searchLegalKnowledge"],
      toolsFailed: [],
    });

    const result = await assistantService.ask("org-1", { question: "what does article 654 say?" });

    expect(result).toEqual({
      answer: "Article 654 governs liability.",
      sources: [
        {
          id: "chunk-1",
          capability: "Legal Knowledge Base",
          label: "Code of Obligations and Contracts — Article 654",
          excerpt: "نص المادة 654",
          contractId: undefined,
        },
      ],
      confidence: 82,
    });
  });

  it("maps a validation failure to a 502", async () => {
    mockRunAssistant.mockRejectedValueOnce(new FakeAiValidationError("bad json"));

    await expect(
      assistantService.ask("org-1", { question: "hello" }),
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it("maps a retryable provider error to a 503", async () => {
    mockRunAssistant.mockRejectedValueOnce(new FakeAiProviderError("down", true));

    await expect(
      assistantService.ask("org-1", { question: "hello" }),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("maps a non-retryable provider error to a 502", async () => {
    mockRunAssistant.mockRejectedValueOnce(new FakeAiProviderError("down", false));

    await expect(
      assistantService.ask("org-1", { question: "hello" }),
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it("propagates any other error unchanged", async () => {
    mockRunAssistant.mockRejectedValueOnce(new Error("unexpected"));

    await expect(
      assistantService.ask("org-1", { question: "hello" }),
    ).rejects.toThrow("unexpected");
  });
});
