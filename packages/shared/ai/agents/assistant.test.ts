// Only the true external boundary (the completion call) is mocked -
// planAssistantSteps, executePlan, aggregateToolResults, optimizeContext,
// and synthesizeAssistantAnswer all run for real, exercising the whole
// pipeline together, the same "mock only the boundary" philosophy
// retrieval/investigator.test.ts already uses.
const mockGetValidatedCompletion = jest.fn();

jest.mock("../schemas", () => ({
  ...jest.requireActual("../schemas"),
  getValidatedCompletion: (...args: unknown[]) => mockGetValidatedCompletion(...args),
}));

import { runAssistant } from "./assistant";
import type { ToolImplementations } from "../tools/types";

function completionResult(data: unknown, callLogId: string) {
  return { data, model: "mock", tokensIn: 0, tokensOut: 0, callLogId };
}

// The mocked completion needs to answer differently depending on which
// structured call is being made (planner vs. final synthesis) - real
// getValidatedCompletion callers are distinguished by schemaId, so the
// fake behaves the same way.
function mockSequence(planData: unknown, answerData: unknown) {
  mockGetValidatedCompletion.mockImplementation(async (request: { schemaId: string }) => {
    if (request.schemaId === "assistant-plan") {
      return completionResult(planData, "log-plan");
    }
    return completionResult(answerData, "log-answer");
  });
}

const CONTRACT_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  mockGetValidatedCompletion.mockReset();
});

describe("runAssistant", () => {
  it("runs a full plan -> execute -> aggregate -> synthesize cycle across two tools", async () => {
    mockSequence(
      {
        steps: [
          { tool: "searchContracts", arguments: {} },
          { tool: "searchLegalKnowledge", arguments: { question: "what does the law say about liability?" } },
        ],
      },
      {
        answer: "Article 654 addresses liability, and one active contract was found.",
        sources: [{ id: "chunk-1" }],
        confidence: 82,
      },
    );

    const implementations: ToolImplementations = {
      searchContracts: async () => ({
        tool: "searchContracts",
        data: {
          contracts: [
            { id: CONTRACT_ID, title: "MSA", counterparty: "Acme", legalState: "ACTIVE", tags: [], expirationDate: null },
          ],
          totalMatched: 1,
        },
      }),
      searchLegalKnowledge: async () => ({
        tool: "searchLegalKnowledge",
        data: {
          answer: "Article 654 governs liability.",
          sources: [
            {
              chunkId: "chunk-1",
              excerpt: "نص المادة 654",
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
      }),
    };

    const result = await runAssistant({
      organizationId: "org-1",
      question: "which of our active contracts address liability under Lebanese law?",
      implementations,
    });

    expect(result.answer).toBe("Article 654 addresses liability, and one active contract was found.");
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
    expect(result.confidence).toBe(82);
    expect(result.toolsUsed).toEqual(["searchContracts", "searchLegalKnowledge"]);
    expect(result.toolsFailed).toEqual([]);
  });

  it("still produces a synthesized answer when a planned tool has no implementation wired, and reports it as failed", async () => {
    mockSequence(
      { steps: [{ tool: "searchOrganizationBrain", arguments: { question: "what is our policy?" } }] },
      { answer: "I couldn't check that right now.", sources: [] },
    );

    const result = await runAssistant({
      organizationId: "org-1",
      question: "what is our policy?",
      implementations: {},
    });

    expect(result.answer).toBe("I couldn't check that right now.");
    expect(result.toolsUsed).toEqual(["searchOrganizationBrain"]);
    expect(result.toolsFailed).toEqual(["searchOrganizationBrain"]);
  });

  it("produces a direct answer with no tool calls for a question the planner decides needs none", async () => {
    mockSequence({ steps: [] }, { answer: "Hi! I can help with contracts, your organization's documents, or Lebanese law.", sources: [] });

    const result = await runAssistant({
      organizationId: "org-1",
      question: "hello",
      implementations: {},
    });

    expect(result.toolsUsed).toEqual([]);
    expect(result.toolsFailed).toEqual([]);
    expect(result.sources).toEqual([]);
  });
});
