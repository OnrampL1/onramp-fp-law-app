const mockPrisma = {
  $queryRaw: jest.fn(),
};

const mockGenerateEmbeddings = jest.fn();

// Mutated in place (never reassigned) between tests — Jest's mock-factory
// hoisting only allows referencing outer bindings prefixed "mock", and the
// live-array-reference trick lets legalScopeSql()'s real, unmocked import
// binding see per-test changes without re-mocking the module each time.
const mockClearances: string[] = [];

jest.mock("../../db", () => ({
  getPrismaClient: () => mockPrisma,
}));

jest.mock("../providers", () => ({
  generateEmbeddings: (...args: unknown[]) => mockGenerateEmbeddings(...args),
}));

jest.mock("./legal-kb-production-clearances", () => ({
  LEGAL_KB_PRODUCTION_CLEARANCES: mockClearances,
}));

import {
  fuseRankings,
  searchContractChunks,
  searchOrganizationBrainChunks,
  searchLegalKbChunks,
  extractArticleNumberFromQuery,
} from "./search";

// Prisma.sql fragments compose into a real Prisma.Sql object (.text is the
// fully-flattened SQL with nested fragments spliced in, .values is the
// fully-flattened parameter list) — this isn't mocked, so reconstructing
// the composed query from a mocked $queryRaw's tagged-template call args
// gives a faithful view of exactly what would be sent to Postgres.
function composedQuery(call: unknown[]): { text: string; values: unknown[] } {
  const [strings, ...interpolations] = call as [readonly string[], ...unknown[]];
  let text = "";
  const values: unknown[] = [];
  strings.forEach((str, i) => {
    text += str;
    if (i >= interpolations.length) return;
    const value = interpolations[i];
    if (value && typeof value === "object" && "text" in value && "values" in value) {
      const fragment = value as { text: string; values: unknown[] };
      text += fragment.text;
      values.push(...fragment.values);
    } else {
      text += "?";
      values.push(value);
    }
  });
  return { text, values };
}

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

describe("extractArticleNumberFromQuery", () => {
  it("extracts a plain-integer article number", () => {
    expect(extractArticleNumberFromQuery("ماذا تنص المادة 654 من قانون الموجبات والعقود؟")).toBe(
      "654",
    );
  });

  it("extracts a sub-numbered article and strips internal whitespace", () => {
    expect(extractArticleNumberFromQuery("ماذا تقول المادة 12 - 1 عن العامل؟")).toBe("12-1");
  });

  it("extracts a bis-style ('مكرر') article label", () => {
    expect(extractArticleNumberFromQuery("ماذا تقول المادة 12 - مكرر؟")).toBe("12-مكرر");
  });

  it("returns null when the question names no article number", () => {
    expect(extractArticleNumberFromQuery("ما هو تعريف الشركة في القانون؟")).toBeNull();
  });
});

describe("searchLegalKbChunks", () => {
  const originalLicenseMode = process.env.LEGAL_KB_LICENSE_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClearances.length = 0;
    delete process.env.LEGAL_KB_LICENSE_MODE;
    mockGenerateEmbeddings.mockResolvedValue({
      embeddings: [[0.1, 0.2, 0.3]],
      tokensIn: 3,
      callLogId: "log-1",
    });
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  afterAll(() => {
    if (originalLicenseMode === undefined) delete process.env.LEGAL_KB_LICENSE_MODE;
    else process.env.LEGAL_KB_LICENSE_MODE = originalLicenseMode;
  });

  it("embeds the query with no owning organization", async () => {
    await searchLegalKbChunks({ query: "ما هي مدة الإشعار؟" });

    expect(mockGenerateEmbeddings).toHaveBeenCalledWith({
      texts: ["ما هي مدة الإشعار؟"],
      organizationId: null,
    });
  });

  it("has no organizationId anywhere in the generated SQL or query params, for either candidate leg", async () => {
    await searchLegalKbChunks({ query: "liability" });

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    for (const call of mockPrisma.$queryRaw.mock.calls) {
      const { text } = composedQuery(call);
      expect(text).not.toContain("organization_id");
      expect(text).not.toContain("organizationId");
    }
  });

  it("filters legal_status = IN_FORCE and uses the 'simple' full-text config, not 'english'", async () => {
    await searchLegalKbChunks({ query: "liability" });

    const [vectorCall, fullTextCall] = mockPrisma.$queryRaw.mock.calls;
    const vector = composedQuery(vectorCall);
    const fullText = composedQuery(fullTextCall);

    expect(vector.text).toContain(`legal_status = 'IN_FORCE'`);
    expect(fullText.text).toContain(`legal_status = 'IN_FORCE'`);
    expect(fullText.text).toContain(`websearch_to_tsquery('simple'`);
    expect(fullText.text).not.toContain("'english'");
  });

  it("allows all three license statuses in development mode, with no production-clearances restriction", async () => {
    process.env.LEGAL_KB_LICENSE_MODE = "development";

    await searchLegalKbChunks({ query: "liability" });

    // legalScopeSql() always puts allowedStatuses as the first bound value
    // in its fragment, which is itself the first thing interpolated into
    // each candidate query — so it's always values[0].
    const { text, values } = composedQuery(mockPrisma.$queryRaw.mock.calls[0]);
    expect(values[0]).toEqual(["DEVELOPMENT_ONLY", "UNDER_REVIEW", "CLEARED_FOR_PRODUCTION"]);
    expect(text).not.toContain("legal_source_id = ANY");
  });

  it("excludes DEVELOPMENT_ONLY and UNDER_REVIEW from production-mode results: the allowed-status list is CLEARED_FOR_PRODUCTION only", async () => {
    process.env.LEGAL_KB_LICENSE_MODE = "production";

    await searchLegalKbChunks({ query: "liability" });

    const { values } = composedQuery(mockPrisma.$queryRaw.mock.calls[0]);
    expect(values[0]).toEqual(["CLEARED_FOR_PRODUCTION"]);
  });

  it("excludes a CLEARED_FOR_PRODUCTION source from production-mode results when its id is absent from the production-clearances registry", async () => {
    process.env.LEGAL_KB_LICENSE_MODE = "production";
    const clearedButUnregisteredSourceId = "11111111-1111-4111-8111-111111111111";
    // Registry (mockClearances) is left empty here — deliberately not
    // adding clearedButUnregisteredSourceId — to prove a source with that
    // id, even if its DB row's license_status happens to be
    // CLEARED_FOR_PRODUCTION (which alone would pass the status filter
    // above), still can't pass the query's separate source-id membership
    // check. `= ANY(empty array)` evaluating to false for every row was
    // independently verified live against the real database while
    // building this feature; this test proves the query construction
    // correctly plumbs the registry into that check at all.

    await searchLegalKbChunks({ query: "liability" });

    // The second bound value in production mode (right after
    // allowedStatuses) is clearedSourceIds — see legalScopeSql().
    const { text, values } = composedQuery(mockPrisma.$queryRaw.mock.calls[0]);
    expect(text).toContain("legal_source_id = ANY");
    expect(values[1]).toEqual([]);
    expect(values[1]).not.toContain(clearedButUnregisteredSourceId);
  });

  it("includes a source in the production-mode registry filter once its id is added to the registry", async () => {
    process.env.LEGAL_KB_LICENSE_MODE = "production";
    const clearedAndRegisteredSourceId = "22222222-2222-4222-8222-222222222222";
    mockClearances.push(clearedAndRegisteredSourceId);

    await searchLegalKbChunks({ query: "liability" });

    const { values } = composedQuery(mockPrisma.$queryRaw.mock.calls[0]);
    expect(values[1]).toEqual([clearedAndRegisteredSourceId]);
  });

  it("makes exactly the two hybrid-search queries when the question names no article number (unchanged path)", async () => {
    await searchLegalKbChunks({ query: "ما هي مدة الإشعار؟" });

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it("makes a third, direct article-number-lookup query when the question names an article, alongside the two hybrid legs", async () => {
    await searchLegalKbChunks({ query: "ماذا تنص المادة 654 من قانون الموجبات والعقود؟" });

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(3);
    const hasDirectLookup = mockPrisma.$queryRaw.mock.calls.some((call) =>
      composedQuery(call).text.includes("article_number ="),
    );
    expect(hasDirectLookup).toBe(true);
  });

  it("does not error and falls back to the hybrid results when the named article number doesn't exist in the corpus", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const results = await searchLegalKbChunks({ query: "ماذا تنص المادة 9999؟" });

    expect(results).toEqual([]);
  });

  it("scopes the direct lookup to the named instrument and boosts only that source's article when the same article number exists in more than one source", async () => {
    const proofSourceRow: CandidateRow = {
      id: "coc-654",
      source_id: "proof-source",
      chunk_index: 653,
      heading_path: null,
      content: "Code of Obligations and Contracts, Article 654 text",
    };
    mockPrisma.$queryRaw.mockImplementation((...args: unknown[]) => {
      const { text } = composedQuery(args);
      if (text.includes("article_number =")) {
        // The real, scoped query only ever asks Postgres for one source's
        // rows in the first place — this simulates that by returning a row
        // only when the instrument-scoping subquery is actually present.
        return Promise.resolve(text.includes("legal_source_id IN") ? [proofSourceRow] : []);
      }
      return Promise.resolve([]);
    });

    const results = await searchLegalKbChunks({
      query: "ماذا تنص المادة 654 من قانون الموجبات والعقود؟",
    });

    expect(results[0].id).toBe("coc-654");
    expect(results[0].score).toBe(Number.POSITIVE_INFINITY);

    const directCall = mockPrisma.$queryRaw.mock.calls.find((call) =>
      composedQuery(call).text.includes("article_number ="),
    );
    const { text, values } = composedQuery(directCall!);
    expect(text).toContain("legal_source_id IN (SELECT id FROM legal_sources WHERE title ILIKE");
    expect(values).toContain("%الموجبات والعقود%");
  });

  it("does not apply the guaranteed-inclusion boost when no instrument is named and the article number exists in more than one source — falls back to hybrid results without erroring", async () => {
    const rowFromSourceOne: CandidateRow = {
      id: "x1",
      source_id: "source-1",
      chunk_index: 10,
      heading_path: null,
      content: "X1",
    };
    const rowFromSourceTwo: CandidateRow = {
      id: "x2",
      source_id: "source-2",
      chunk_index: 20,
      heading_path: null,
      content: "X2",
    };
    mockPrisma.$queryRaw.mockImplementation((...args: unknown[]) => {
      const { text } = composedQuery(args);
      if (text.includes("article_number =")) {
        return Promise.resolve([rowFromSourceOne, rowFromSourceTwo]);
      }
      return Promise.resolve([rowA]);
    });

    const results = await searchLegalKbChunks({ query: "ماذا تنص المادة 654؟" });

    expect(results.some((r) => r.score === Number.POSITIVE_INFINITY)).toBe(false);
    expect(results.map((r) => r.id)).toEqual(["a"]);
  });

  // Covers the "no instrument named, article number unique across the whole
  // corpus" case — behaves exactly as before this fix, boost included.
  it("prepends a direct article-number match ahead of the hybrid-search results", async () => {
    const directRow: CandidateRow = {
      id: "direct-1",
      source_id: "src-1",
      chunk_index: 0,
      heading_path: null,
      content: "Article 654 text",
    };
    mockPrisma.$queryRaw.mockImplementation((...args: unknown[]) => {
      const { text } = composedQuery(args);
      return Promise.resolve(text.includes("article_number =") ? [directRow] : [rowA]);
    });

    const results = await searchLegalKbChunks({ query: "ماذا تنص المادة 654؟" });

    expect(results[0].id).toBe("direct-1");
    expect(results[0].score).toBe(Number.POSITIVE_INFINITY);
    expect(results.map((r) => r.id)).toContain("a");
  });

  it("deduplicates when the direct article match is also independently found by hybrid search", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([rowA]);

    const results = await searchLegalKbChunks({ query: "ماذا تنص المادة 654؟" });

    expect(results.filter((r) => r.id === "a")).toHaveLength(1);
    // The direct-match version wins over the RRF-scored duplicate from hybrid search.
    expect(results[0].score).toBe(Number.POSITIVE_INFINITY);
  });

  // Batch 6 diagnosis (2026-08-14): the model had no way to know a
  // guaranteed-inclusion chunk's article number unless the chunk's own
  // text happened to restate it, and correctly declined to attribute a
  // claim it couldn't verify — even holding the exact right content. This
  // is the fix's DB-to-RetrievedChunk half; formatSourceBlocks()'s tests
  // (investigator.test.ts) cover the other half.
  it("carries the real article_number onto the guaranteed-inclusion result's articleNumber field", async () => {
    const directRow: CandidateRow & { article_number: string } = {
      id: "direct-1",
      source_id: "src-1",
      chunk_index: 0,
      heading_path: null,
      content: "Article 654 text",
      article_number: "654",
    };
    mockPrisma.$queryRaw.mockImplementation((...args: unknown[]) => {
      const { text } = composedQuery(args);
      return Promise.resolve(text.includes("article_number =") ? [directRow] : [rowA]);
    });

    const results = await searchLegalKbChunks({ query: "ماذا تنص المادة 654؟" });

    expect(results[0].id).toBe("direct-1");
    expect(results[0].articleNumber).toBe("654");
  });

  it("carries article_number onto hybrid-leg (vector/full-text) results too, not just the direct-lookup leg", async () => {
    const hybridRowWithArticle: CandidateRow & { article_number: string } = {
      id: "hybrid-1",
      source_id: "src-1",
      chunk_index: 5,
      heading_path: null,
      content: "some hybrid-ranked article text",
      article_number: "42",
    };
    mockPrisma.$queryRaw.mockResolvedValue([hybridRowWithArticle]);

    const results = await searchLegalKbChunks({ query: "ما هي مدة الإشعار؟" });

    expect(results[0].articleNumber).toBe("42");
  });

  it("scopes the direct article-number lookup with the same legal_status/license_status filter as the hybrid legs, in production mode", async () => {
    process.env.LEGAL_KB_LICENSE_MODE = "production";

    await searchLegalKbChunks({ query: "ماذا تنص المادة 654؟" });

    const directCall = mockPrisma.$queryRaw.mock.calls.find((call) =>
      composedQuery(call).text.includes("article_number ="),
    );
    expect(directCall).toBeDefined();
    const { text, values } = composedQuery(directCall!);
    expect(text).toContain(`legal_status = 'IN_FORCE'`);
    // A DEVELOPMENT_ONLY-licensed source's article can't leak through this
    // path in production mode either — same allowedStatuses restriction as
    // the vector/full-text legs.
    expect(values[0]).toEqual(["CLEARED_FOR_PRODUCTION"]);
  });
});
