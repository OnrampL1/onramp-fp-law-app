import { executePlan, PlanTooLargeError } from "./executor";
import { ASSISTANT_MAX_PLAN_STEPS } from "./definitions";
import { NoIndexedContentError } from "../retrieval/investigator";
import type { AssistantPlanV1 } from "../schemas/assistant-plan/v1";
import type { ToolImplementations, ToolResult } from "./types";

const CONTRACT_ID = "11111111-1111-1111-1111-111111111111";
const CONTEXT = { organizationId: "org-1" };

function planOf(steps: AssistantPlanV1["steps"]): AssistantPlanV1 {
  return { steps };
}

describe("executePlan", () => {
  it("returns an empty result list for an empty plan without calling any implementation", async () => {
    const implementation = jest.fn();
    const outcomes = await executePlan(
      planOf([]),
      { searchContracts: implementation },
      CONTEXT,
    );
    expect(outcomes).toEqual([]);
    expect(implementation).not.toHaveBeenCalled();
  });

  it("executes a valid step and returns its result", async () => {
    const fakeResult: ToolResult = {
      tool: "searchContracts",
      data: { contracts: [], totalMatched: 0 },
    };
    const implementations: ToolImplementations = {
      searchContracts: jest.fn(async () => fakeResult),
    };

    const outcomes = await executePlan(
      planOf([{ tool: "searchContracts", arguments: {} }]),
      implementations,
      CONTEXT,
    );

    expect(outcomes).toEqual([
      { tool: "searchContracts", ok: true, result: fakeResult },
    ]);
    expect(implementations.searchContracts).toHaveBeenCalledWith(
      {},
      CONTEXT,
    );
  });

  it("executes every step in one plan, preserving order in the returned outcomes", async () => {
    const implementations: ToolImplementations = {
      searchContracts: jest.fn(async () => ({
        tool: "searchContracts",
        data: { contracts: [], totalMatched: 0 },
      })),
      searchLegalKnowledge: jest.fn(async () => ({
        tool: "searchLegalKnowledge",
        data: { answer: "a", sources: [], chunksRetrieved: 0 },
      })),
    };

    const outcomes = await executePlan(
      planOf([
        { tool: "searchContracts", arguments: {} },
        {
          tool: "searchLegalKnowledge",
          arguments: { question: "what does the law say" },
        },
      ]),
      implementations,
      CONTEXT,
    );

    expect(outcomes.map((o) => o.tool)).toEqual([
      "searchContracts",
      "searchLegalKnowledge",
    ]);
    expect(outcomes.every((o) => o.ok)).toBe(true);
  });

  it("rejects a plan naming an unknown tool as a per-step failure, not a thrown error", async () => {
    const plan = {
      steps: [{ tool: "deleteEverything", arguments: {} }],
    } as unknown as AssistantPlanV1;

    const outcomes = await executePlan(plan, {}, CONTEXT);

    expect(outcomes).toEqual([
      {
        tool: "deleteEverything",
        ok: false,
        error: 'Unknown Assistant tool: "deleteEverything"',
      },
    ]);
  });

  it("rejects arguments that fail the tool's own schema as a per-step failure", async () => {
    const plan = {
      steps: [{ tool: "getContractAnalysis", arguments: { contractId: "not-a-uuid" } }],
    } as unknown as AssistantPlanV1;

    const outcomes = await executePlan(
      plan,
      { getContractAnalysis: jest.fn() },
      CONTEXT,
    );

    expect(outcomes[0].ok).toBe(false);
    expect(outcomes[0].error).toMatch(/Invalid arguments for "getContractAnalysis"/);
  });

  it("reports a known, valid step as a per-step failure when no implementation is wired yet", async () => {
    const outcomes = await executePlan(
      planOf([{ tool: "searchOrganizationBrain", arguments: { question: "q" } }]),
      {},
      CONTEXT,
    );

    expect(outcomes).toEqual([
      {
        tool: "searchOrganizationBrain",
        ok: false,
        error: 'Tool "searchOrganizationBrain" has no implementation wired yet',
      },
    ]);
  });

  it("catches a throwing implementation as a per-step failure instead of rejecting the whole plan", async () => {
    const implementations: ToolImplementations = {
      askContractQuestion: jest.fn(async () => {
        throw new Error("upstream service unavailable");
      }),
    };

    const outcomes = await executePlan(
      planOf([
        {
          tool: "askContractQuestion",
          arguments: { contractId: CONTRACT_ID, question: "q" },
        },
      ]),
      implementations,
      CONTEXT,
    );

    expect(outcomes).toEqual([
      {
        tool: "askContractQuestion",
        ok: false,
        error: "upstream service unavailable",
      },
    ]);
  });

  it("tags a NoIndexedContentError failure with notIndexed, distinct from a generic failure", async () => {
    const implementations: ToolImplementations = {
      askContractQuestion: jest.fn(async () => {
        throw new NoIndexedContentError(
          "This contract has not been indexed for Clause Investigator yet",
        );
      }),
    };

    const outcomes = await executePlan(
      planOf([
        {
          tool: "askContractQuestion",
          arguments: { contractId: CONTRACT_ID, question: "q" },
        },
      ]),
      implementations,
      CONTEXT,
    );

    expect(outcomes).toEqual([
      {
        tool: "askContractQuestion",
        ok: false,
        error: "This contract has not been indexed for Clause Investigator yet",
        notIndexed: true,
      },
    ]);
  });

  it("does not let one failing step prevent another step's result from being returned", async () => {
    const implementations: ToolImplementations = {
      searchContracts: jest.fn(async () => {
        throw new Error("boom");
      }),
      searchLegalKnowledge: jest.fn(async () => ({
        tool: "searchLegalKnowledge",
        data: { answer: "a", sources: [], chunksRetrieved: 0 },
      })),
    };

    const outcomes = await executePlan(
      planOf([
        { tool: "searchContracts", arguments: {} },
        { tool: "searchLegalKnowledge", arguments: { question: "q" } },
      ]),
      implementations,
      CONTEXT,
    );

    expect(outcomes.find((o) => o.tool === "searchContracts")?.ok).toBe(false);
    expect(outcomes.find((o) => o.tool === "searchLegalKnowledge")?.ok).toBe(true);
  });

  it("throws PlanTooLargeError for a plan exceeding the max step count, without executing any step", async () => {
    const implementation = jest.fn();
    const oversizedSteps = Array.from(
      { length: ASSISTANT_MAX_PLAN_STEPS + 1 },
      () => ({ tool: "searchContracts" as const, arguments: {} }),
    );

    await expect(
      executePlan(planOf(oversizedSteps), { searchContracts: implementation }, CONTEXT),
    ).rejects.toThrow(PlanTooLargeError);
    expect(implementation).not.toHaveBeenCalled();
  });
});
