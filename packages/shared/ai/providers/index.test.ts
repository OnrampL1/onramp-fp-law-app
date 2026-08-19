const mockPrisma = {
  aICallLog: { create: jest.fn() },
};

jest.mock("../../db", () => ({
  getPrismaClient: () => mockPrisma,
}));

const mockBatchTextsByTokenLimit = jest.fn();
jest.mock("./token-counting", () => ({
  batchTextsByTokenLimit: (...args: unknown[]) => mockBatchTextsByTokenLimit(...args),
  countTokens: jest.fn(),
  MAX_TOKENS_PER_EMBEDDING_REQUEST: 250_000,
}));

const mockMockEmbed = jest.fn();
jest.mock("./mock-embeddings", () => ({
  mockEmbeddingProvider: { embed: (...args: unknown[]) => mockMockEmbed(...args) },
  MOCK_EMBEDDING_MODEL: "mock-embedding",
}));

const mockOpenRouterEmbed = jest.fn();
jest.mock("./openrouter-embeddings", () => ({
  openRouterEmbeddingProvider: { embed: (...args: unknown[]) => mockOpenRouterEmbed(...args) },
  OPENROUTER_EMBEDDING_MODEL: "openai/text-embedding-3-small",
}));

import { generateEmbeddings } from "./index";

describe("generateEmbeddings batching", () => {
  const originalMode = process.env.AI_PROVIDER_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_PROVIDER_MODE = "mock";
    mockPrisma.aICallLog.create.mockImplementation(({ data }: { data: { status: string } }) =>
      Promise.resolve({ id: `log-${data.status}-${mockPrisma.aICallLog.create.mock.calls.length}` }),
    );
  });

  afterAll(() => {
    process.env.AI_PROVIDER_MODE = originalMode;
  });

  it("makes a single provider call and logs one AiCallLog row when everything fits in one batch", async () => {
    mockBatchTextsByTokenLimit.mockReturnValue([["a", "b"]]);
    mockMockEmbed.mockResolvedValue({ embeddings: [[0.1], [0.2]], tokensIn: 5 });

    const result = await generateEmbeddings({ texts: ["a", "b"], organizationId: "org-1" });

    expect(mockMockEmbed).toHaveBeenCalledTimes(1);
    expect(mockMockEmbed).toHaveBeenCalledWith(["a", "b"]);
    expect(mockPrisma.aICallLog.create).toHaveBeenCalledTimes(1);
    expect(result.embeddings).toEqual([[0.1], [0.2]]);
    expect(result.tokensIn).toBe(5);
  });

  it("issues one provider call and one AiCallLog row per batch, concatenating embeddings in order", async () => {
    mockBatchTextsByTokenLimit.mockReturnValue([["a", "b"], ["c"]]);
    mockMockEmbed
      .mockResolvedValueOnce({ embeddings: [[0.1], [0.2]], tokensIn: 5 })
      .mockResolvedValueOnce({ embeddings: [[0.3]], tokensIn: 2 });

    const result = await generateEmbeddings({ texts: ["a", "b", "c"], organizationId: "org-1" });

    expect(mockMockEmbed).toHaveBeenCalledTimes(2);
    expect(mockMockEmbed).toHaveBeenNthCalledWith(1, ["a", "b"]);
    expect(mockMockEmbed).toHaveBeenNthCalledWith(2, ["c"]);
    expect(mockPrisma.aICallLog.create).toHaveBeenCalledTimes(2);
    expect(result.embeddings).toEqual([[0.1], [0.2], [0.3]]);
    expect(result.tokensIn).toBe(7);
  });

  it("returns immediately with no provider call and no AiCallLog row for an empty texts array", async () => {
    const result = await generateEmbeddings({ texts: [], organizationId: "org-1" });

    expect(mockBatchTextsByTokenLimit).not.toHaveBeenCalled();
    expect(mockMockEmbed).not.toHaveBeenCalled();
    expect(mockPrisma.aICallLog.create).not.toHaveBeenCalled();
    expect(result).toEqual({ embeddings: [], tokensIn: 0, callLogId: "" });
  });

  it("discards embeddings from already-succeeded batches and throws when a later batch fails", async () => {
    mockBatchTextsByTokenLimit.mockReturnValue([["a"], ["b"]]);
    mockMockEmbed
      .mockResolvedValueOnce({ embeddings: [[0.1]], tokensIn: 3 })
      .mockRejectedValueOnce(new Error("provider exploded"));

    await expect(
      generateEmbeddings({ texts: ["a", "b"], organizationId: "org-1" }),
    ).rejects.toThrow("provider exploded");

    expect(mockPrisma.aICallLog.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.aICallLog.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) }),
    );
    expect(mockPrisma.aICallLog.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ status: "PROVIDER_ERROR" }) }),
    );
  });
});
