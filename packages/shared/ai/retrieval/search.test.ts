const mockPrisma = {
  $queryRaw: jest.fn(),
};

const mockGenerateEmbeddings = jest.fn();

jest.mock("../../db", () => ({
  getPrismaClient: () => mockPrisma,
}));

jest.mock("../providers", () => ({
  generateEmbeddings: (...args: unknown[]) => mockGenerateEmbeddings(...args),
}));

import {
  fuseRankings,
  searchContractChunks,
  searchOrganizationBrainChunks,
} from "./search";

interface CandidateRow {
  id: string;
  source_id: string;
  chunk_index: number;
  heading_path: string | null;
  content: string;
}

const rowA: CandidateRow = {
  id: "a",
  source_id: "contract-1",
  chunk_index: 0,
  heading_path: null,
  content: "A",
};
const rowB: CandidateRow = {
  id: "b",
  source_id: "contract-1",
  chunk_index: 1,
  heading_path: null,
  content: "B",
};
const rowC: CandidateRow = {
  id: "c",
  source_id: "contract-1",
  chunk_index: 2,
  heading_path: null,
  content: "C",
};

describe("fuseRankings", () => {
  it("ranks a chunk found by both retrieval methods above one found by only one", () => {
    const fused = fuseRankings([rowA, rowB], [rowA]);

    expect(fused).toHaveLength(2);
    expect(fused[0].row.id).toBe("a");
    expect(fused[1].row.id).toBe("b");
    expect(fused[0].score).toBeGreaterThan(fused[1].score);
  });

  it("deduplicates a chunk that appears in both lists into a single fused entry", () => {
    const fused = fuseRankings([rowA], [rowA]);

    expect(fused).toHaveLength(1);
    expect(fused[0].row.id).toBe("a");
  });

  it("sums contributions rather than keeping only the best rank", () => {
    const foundByBoth = fuseRankings([rowA], [rowA]);
    const foundByOne = fuseRankings([rowA], []);

    expect(foundByBoth[0].score).toBeGreaterThan(foundByOne[0].score);
  });

  it("preserves original rank order for a chunk found in only one list", () => {
    const fused = fuseRankings([rowC, rowA, rowB], []);

    expect(fused.map((f) => f.row.id)).toEqual(["c", "a", "b"]);
  });

  it("returns an empty array when neither method returns any candidates", () => {
    expect(fuseRankings([], [])).toEqual([]);
  });
});

describe("searchContractChunks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateEmbeddings.mockResolvedValue({
      embeddings: [[0.1, 0.2, 0.3]],
      tokensIn: 3,
      callLogId: "log-1",
    });
    mockPrisma.$queryRaw.mockResolvedValue([rowA]);
  });

  it("embeds the query scoped to the calling organization", async () => {
    await searchContractChunks({
      contractId: "contract-1",
      organizationId: "org-1",
      query: "what is the termination notice period?",
    });

    expect(mockGenerateEmbeddings).toHaveBeenCalledWith({
      texts: ["what is the termination notice period?"],
      organizationId: "org-1",
    });
  });

  it("returns an empty result when no query embedding is produced", async () => {
    mockGenerateEmbeddings.mockResolvedValueOnce({
      embeddings: [],
      tokensIn: 0,
      callLogId: "log-1",
    });

    const results = await searchContractChunks({
      contractId: "contract-1",
      organizationId: "org-1",
      query: "anything",
    });

    expect(results).toEqual([]);
    // No point querying the database if there's no vector to search with.
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("fuses and shapes the retrieved rows into RetrievedChunk results", async () => {
    const results = await searchContractChunks({
      contractId: "contract-1",
      organizationId: "org-1",
      query: "liability",
    });

    expect(results).toEqual([
      {
        id: "a",
        sourceId: "contract-1",
        chunkIndex: 0,
        headingPath: null,
        content: "A",
        score: expect.any(Number),
      },
    ]);
  });

  it("respects the requested result limit", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([rowA, rowB, rowC]);

    const results = await searchContractChunks({
      contractId: "contract-1",
      organizationId: "org-1",
      query: "liability",
      limit: 2,
    });

    expect(results).toHaveLength(2);
  });
});

describe("searchOrganizationBrainChunks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateEmbeddings.mockResolvedValue({
      embeddings: [[0.1, 0.2, 0.3]],
      tokensIn: 3,
      callLogId: "log-1",
    });
  });

  it("is organization-scoped only — no per-item scoping parameter exists", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([rowA]);

    await searchOrganizationBrainChunks({
      organizationId: "org-1",
      query: "liability",
    });

    expect(mockGenerateEmbeddings).toHaveBeenCalledWith({
      texts: ["liability"],
      organizationId: "org-1",
    });
  });

  it("can return chunks sourced from more than one organization brain item in a single search", async () => {
    const fromItemOne = {
      id: "x",
      source_id: "item-1",
      chunk_index: 0,
      heading_path: null,
      content: "X",
    };
    const fromItemTwo = {
      id: "y",
      source_id: "item-2",
      chunk_index: 0,
      heading_path: null,
      content: "Y",
    };
    mockPrisma.$queryRaw.mockResolvedValue([fromItemOne, fromItemTwo]);

    const results = await searchOrganizationBrainChunks({
      organizationId: "org-1",
      query: "indemnification",
    });

    expect(results.map((r) => r.sourceId).sort()).toEqual(["item-1", "item-2"]);
  });
});
