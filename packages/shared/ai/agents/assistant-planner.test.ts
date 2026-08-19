const mockGetValidatedCompletion = jest.fn();

jest.mock("../schemas", () => ({
  ...jest.requireActual("../schemas"),
  getValidatedCompletion: (...args: unknown[]) =>
    mockGetValidatedCompletion(...args),
}));

import { planAssistantSteps, buildPlannerMessages } from "./assistant-planner";
import { AiValidationError } from "../schemas";
import type { InvestigatorTurn } from "../retrieval/investigator";

function completionResult(steps: unknown[], callLogId = "log-1") {
  return {
    data: { steps },
    model: "mock",
    tokensIn: 0,
    tokensOut: 0,
    callLogId,
  };
}

describe("buildPlannerMessages", () => {
  it("puts the system prompt first, interleaves history, then the question with a reminder", () => {
    const history: InvestigatorTurn[] = [
      { question: "q1", answer: "a1" },
      { question: "q2", answer: "a2" },
    ];

    const messages = buildPlannerMessages("SYSTEM", history, "q3");

    expect(messages[0]).toEqual({ role: "system", content: "SYSTEM" });
    expect(messages[1]).toEqual({ role: "user", content: "q1" });
    expect(messages[2]).toEqual({ role: "assistant", content: "a1" });
    expect(messages[3]).toEqual({ role: "user", content: "q2" });
    expect(messages[4]).toEqual({ role: "assistant", content: "a2" });
    expect(messages[5].role).toBe("user");
    expect(messages[5].content).toContain("q3");
    expect(messages[5].content).toContain("respond with ONLY the JSON object");
  });
});

describe("planAssistantSteps", () => {
  beforeEach(() => {
    mockGetValidatedCompletion.mockReset();
  });

  it("returns the validated steps and callLogId on a successful completion", async () => {
    const steps = [{ tool: "searchContracts", arguments: {} }];
    mockGetValidatedCompletion.mockResolvedValueOnce(
      completionResult(steps, "log-42"),
    );

    const result = await planAssistantSteps({
      organizationId: "org-1",
      question: "which contracts are active?",
    });

    expect(result).toEqual({ steps, callLogId: "log-42" });
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(1);
    const [request] = mockGetValidatedCompletion.mock.calls[0];
    expect(request.organizationId).toBe("org-1");
    expect(request.promptId).toBe("assistant-planner");
    expect(request.schemaId).toBe("assistant-plan");
  });

  it("retries once on a validation failure and succeeds on the second attempt", async () => {
    mockGetValidatedCompletion
      .mockRejectedValueOnce(new AiValidationError("bad json", "log-1"))
      .mockResolvedValueOnce(completionResult([], "log-2"));

    const result = await planAssistantSteps({
      organizationId: "org-1",
      question: "hello",
    });

    expect(result).toEqual({ steps: [], callLogId: "log-2" });
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries on repeated validation failure", async () => {
    mockGetValidatedCompletion
      .mockRejectedValueOnce(new AiValidationError("bad json", "log-1"))
      .mockRejectedValueOnce(new AiValidationError("still bad json", "log-2"));

    await expect(
      planAssistantSteps({ organizationId: "org-1", question: "hello" }),
    ).rejects.toThrow(AiValidationError);
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(2);
  });

  it("does not retry on a non-validation error", async () => {
    mockGetValidatedCompletion.mockRejectedValueOnce(
      new Error("provider unavailable"),
    );

    await expect(
      planAssistantSteps({ organizationId: "org-1", question: "hello" }),
    ).rejects.toThrow("provider unavailable");
    expect(mockGetValidatedCompletion).toHaveBeenCalledTimes(1);
  });

  it("trims history to the configured turn limit before sending it", async () => {
    mockGetValidatedCompletion.mockResolvedValueOnce(completionResult([]));

    const history: InvestigatorTurn[] = [
      { question: "q1", answer: "a1" },
      { question: "q2", answer: "a2" },
      { question: "q3", answer: "a3" },
      { question: "q4", answer: "a4" },
    ];

    await planAssistantSteps({
      organizationId: "org-1",
      question: "q5",
      history,
    });

    const [request] = mockGetValidatedCompletion.mock.calls[0];
    const userTurnContents = request.messages
      .filter((m: { role: string }) => m.role === "user")
      .map((m: { content: string }) => m.content);

    // Default turn limit is 3 (getInvestigatorHistoryTurnLimit's default) -
    // q1 should have been dropped, q2-q4 kept, plus the final question.
    expect(userTurnContents).not.toContain("q1");
    expect(userTurnContents).toContain("q2");
    expect(userTurnContents.some((c: string) => c.includes("q5"))).toBe(true);
  });
});
