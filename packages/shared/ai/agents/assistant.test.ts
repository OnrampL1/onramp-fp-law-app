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

  it("chains a contract lookup into a follow-up analysis call within the same turn, once the id becomes known", async () => {
    // Unlike mockSequence (used above), this mock returns a *different* plan
    // depending on which round it is - proving the loop genuinely re-plans
    // from round 1's real outcome rather than just replaying a fixed script.
    const planCalls: { role: string; content: string }[][] = [];
    mockGetValidatedCompletion.mockImplementation(
      async (request: { schemaId: string; messages: { role: string; content: string }[] }) => {
        if (request.schemaId === "assistant-plan") {
          planCalls.push(request.messages);
          if (planCalls.length === 1) {
            return completionResult(
              { steps: [{ tool: "searchContracts", arguments: { search: "Redwood" } }] },
              "log-plan-1",
            );
          }
          if (planCalls.length === 2) {
            return completionResult(
              { steps: [{ tool: "getContractAnalysis", arguments: { contractId: CONTRACT_ID } }] },
              "log-plan-2",
            );
          }
          // Round 3: the planner now has the analysis and declares itself
          // done - the realistic way this loop ends, not a repeat-detection.
          return completionResult({ steps: [] }, "log-plan-3");
        }
        return completionResult(
          {
            answer: "This contract has one high-severity risk flag around liability.",
            sources: [{ id: "risk-1-flag-0" }],
            confidence: 80,
          },
          "log-answer",
        );
      },
    );

    const implementations: ToolImplementations = {
      searchContracts: async () => ({
        tool: "searchContracts",
        data: {
          contracts: [
            {
              id: CONTRACT_ID,
              title: "Joint Venture Agreement",
              counterparty: "Redwood Commerce Holdings Ltd.",
              legalState: "ACTIVE",
              tags: [],
              expirationDate: null,
            },
          ],
          totalMatched: 1,
        },
      }),
      getContractAnalysis: async (args) => {
        expect(args).toEqual({ contractId: CONTRACT_ID });
        return {
          tool: "getContractAnalysis",
          data: {
            contractId: CONTRACT_ID,
            risk: {
              analysisId: "risk-1",
              healthScore: 40,
              summary: "Elevated liability exposure.",
              redFlags: [
                { severity: "HIGH", category: "LIABILITY", description: "Uncapped liability", sourceText: "..." },
              ],
            },
            summary: null,
          },
        };
      },
    };

    const result = await runAssistant({
      organizationId: "org-1",
      question: "Find the risks in the Redwood contract and explain them to me",
      implementations,
    });

    expect(result.toolsUsed).toEqual(["searchContracts", "getContractAnalysis"]);
    expect(result.answer).toBe("This contract has one high-severity risk flag around liability.");
    expect(result.sources.map((s) => s.id)).toEqual(["risk-1-flag-0"]);

    // The round 2 planner call must have actually seen round 1's outcome,
    // including the id it resolved - this is the mechanism that makes
    // chaining possible, not a coincidence of mock ordering. Round 3 is the
    // planner declaring itself done once it has the analysis.
    expect(planCalls).toHaveLength(3);
    const round2Progress = planCalls[1].find(
      (m) => m.role === "user" && m.content.includes("Progress so far this turn:"),
    );
    expect(round2Progress?.content).toContain("searchContracts");
    expect(round2Progress?.content).toContain(CONTRACT_ID);
  });

  it("stops looping once the planner repeats a call already made, instead of re-executing it", async () => {
    let planCallCount = 0;
    mockGetValidatedCompletion.mockImplementation(async (request: { schemaId: string }) => {
      if (request.schemaId === "assistant-plan") {
        planCallCount += 1;
        // Always returns the exact same step, as if the planner never
        // learned anything new - the loop must recognize this as no
        // progress and stop, not spend its full MAX_ROUNDS budget.
        return completionResult(
          { steps: [{ tool: "searchContracts", arguments: { search: "nonexistent" } }] },
          `log-plan-${planCallCount}`,
        );
      }
      return completionResult(
        { answer: "No contracts matched that search.", sources: [] },
        "log-answer",
      );
    });

    let searchCallCount = 0;
    const implementations: ToolImplementations = {
      searchContracts: async () => {
        searchCallCount += 1;
        return { tool: "searchContracts", data: { contracts: [], totalMatched: 0 } };
      },
    };

    const result = await runAssistant({
      organizationId: "org-1",
      question: "find a contract that doesn't exist",
      implementations,
    });

    expect(searchCallCount).toBe(1);
    expect(planCallCount).toBe(2); // round 1 (executes), round 2 (detects the repeat, stops)
    expect(result.toolsUsed).toEqual(["searchContracts"]);
  });
});
