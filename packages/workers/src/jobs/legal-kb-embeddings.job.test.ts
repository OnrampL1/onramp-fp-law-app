import type { Job } from "bullmq";
import type { LegalKbEmbeddingsJobData, LegalKbEmbeddingsJobResult } from "@starter-kit/shared";

const mockPrisma = {
  legalSource: {
    findUniqueOrThrow: jest.fn(),
  },
};

const mockPackSectionIntoChunks = jest.fn();
const mockGenerateEmbeddings = jest.fn();
const mockReplaceLegalSourceChunks = jest.fn();
const mockGetMaxChunksPerLegalSource = jest.fn();

jest.mock("@starter-kit/shared", () => ({
  packSectionIntoChunks: (...args: unknown[]) => mockPackSectionIntoChunks(...args),
  generateEmbeddings: (...args: unknown[]) => mockGenerateEmbeddings(...args),
  replaceLegalSourceChunks: (...args: unknown[]) => mockReplaceLegalSourceChunks(...args),
  getMaxChunksPerLegalSource: () => mockGetMaxChunksPerLegalSource(),
  getPrismaClient: () => mockPrisma,
}));

import { processLegalKbEmbeddingsJob } from "./legal-kb-embeddings.job";

function makeJob(data: LegalKbEmbeddingsJobData): Job<LegalKbEmbeddingsJobData, LegalKbEmbeddingsJobResult> {
  return { data } as Job<LegalKbEmbeddingsJobData, LegalKbEmbeddingsJobResult>;
}

describe("processLegalKbEmbeddingsJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.legalSource.findUniqueOrThrow.mockResolvedValue({
      legalStatus: "IN_FORCE",
      licenseStatus: "DEVELOPMENT_ONLY",
    });
    mockGetMaxChunksPerLegalSource.mockReturnValue(1500);
  });

  it("chunks each article via packSectionIntoChunks, embeds, and persists, denormalizing legalStatus/licenseStatus onto every chunk", async () => {
    mockPackSectionIntoChunks.mockReturnValueOnce([
      { chunkIndex: 0, headingPath: "الباب الاول", content: "نص المادة 1", tokenCount: 5 },
    ]);
    mockGenerateEmbeddings.mockResolvedValue({ embeddings: [[0.1, 0.2]], tokensIn: 10, callLogId: "log-1" });

    const job = makeJob({
      legalSourceId: "source-1",
      articles: [
        {
          articleNumber: "1",
          headingPath: "الباب الاول",
          text: "نص المادة 1",
          amendingInstrument: null,
          amendmentEffectiveDate: null,
          isEnactmentClause: false,
        },
      ],
    });

    const result = await processLegalKbEmbeddingsJob(job);

    expect(result).toEqual({ status: "COMPLETED", chunkCount: 1 });
    expect(mockGenerateEmbeddings).toHaveBeenCalledWith({
      texts: ["نص المادة 1"],
      organizationId: null,
    });
    expect(mockReplaceLegalSourceChunks).toHaveBeenCalledTimes(1);
    const [legalSourceId, chunks] = mockReplaceLegalSourceChunks.mock.calls[0];
    expect(legalSourceId).toBe("source-1");
    expect(chunks[0]).toMatchObject({
      articleNumber: "1",
      legalStatus: "IN_FORCE",
      licenseStatus: "DEVELOPMENT_ONLY",
      embedding: [0.1, 0.2],
    });
  });

  it("parses the crawler's DD/MM/YYYY amendmentEffectiveDate into a real Date", async () => {
    mockPackSectionIntoChunks.mockReturnValueOnce([
      { chunkIndex: 0, headingPath: null, content: "نص", tokenCount: 3 },
    ]);
    mockGenerateEmbeddings.mockResolvedValue({ embeddings: [[0.1]], tokensIn: 5, callLogId: "log-1" });

    const job = makeJob({
      legalSourceId: "source-1",
      articles: [
        {
          articleNumber: "844",
          headingPath: null,
          text: "نص",
          amendingInstrument: "126/2019",
          amendmentEffectiveDate: "29/03/2019",
          isEnactmentClause: false,
        },
      ],
    });

    await processLegalKbEmbeddingsJob(job);

    const [, chunks] = mockReplaceLegalSourceChunks.mock.calls[0];
    expect(chunks[0].amendmentEffectiveDate).toEqual(new Date(Date.UTC(2019, 2, 29)));
    expect(chunks[0].amendingInstrument).toBe("126/2019");
  });

  it("tags an enactment-clause article's chunks with the fixed heading, overriding its own headingPath", async () => {
    mockPackSectionIntoChunks.mockImplementationOnce((heading: string | null) => [
      { chunkIndex: 0, headingPath: heading, content: "نص الإصدار", tokenCount: 4 },
    ]);
    mockGenerateEmbeddings.mockResolvedValue({ embeddings: [[0.1]], tokensIn: 4, callLogId: "log-1" });

    const job = makeJob({
      legalSourceId: "source-1",
      articles: [
        {
          articleNumber: "1",
          headingPath: null,
          text: "نص الإصدار",
          amendingInstrument: null,
          amendmentEffectiveDate: null,
          isEnactmentClause: true,
        },
      ],
    });

    await processLegalKbEmbeddingsJob(job);

    expect(mockPackSectionIntoChunks).toHaveBeenCalledWith(
      "أحكام الإصدار (Enactment Provisions)",
      "نص الإصدار",
      0,
    );
  });

  it("hard-fails on ceiling exceeded: zero embedding calls, zero persistence calls, terminal (non-throwing) result", async () => {
    mockGetMaxChunksPerLegalSource.mockReturnValue(2);
    // 3 articles, one chunk each -> 3 total chunks, over the ceiling of 2
    mockPackSectionIntoChunks.mockImplementation((_h: unknown, _c: unknown, startIndex: number) => [
      { chunkIndex: startIndex, headingPath: null, content: "نص", tokenCount: 3 },
    ]);

    const job = makeJob({
      legalSourceId: "source-1",
      articles: [1, 2, 3].map((n) => ({
        articleNumber: String(n),
        headingPath: null,
        text: "نص",
        amendingInstrument: null,
        amendmentEffectiveDate: null,
        isEnactmentClause: false,
      })),
    });

    const result = await processLegalKbEmbeddingsJob(job);

    expect(result).toEqual({ status: "CEILING_EXCEEDED", chunkCount: 3 });
    // The whole point of the ceiling: zero spend, zero partial persistence,
    // and prior rows (on a re-ingestion) are left completely untouched
    // since replaceLegalSourceChunks is never invoked on this path at all.
    expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
    expect(mockReplaceLegalSourceChunks).not.toHaveBeenCalled();
  });

  it("still calls replaceLegalSourceChunks with an empty array (clearing stale rows) when there are zero chunks, without embedding", async () => {
    const job = makeJob({ legalSourceId: "source-1", articles: [] });

    const result = await processLegalKbEmbeddingsJob(job);

    expect(result).toEqual({ status: "COMPLETED", chunkCount: 0 });
    expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
    expect(mockReplaceLegalSourceChunks).toHaveBeenCalledWith("source-1", []);
  });
});
