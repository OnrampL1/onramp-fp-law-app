const mockPrisma = {
  contractChunk: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  organizationBrainChunk: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  legalChunk: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  $executeRawUnsafe: jest.fn(),
  $transaction: jest.fn(async (cb: (tx: typeof mockPrisma) => unknown) =>
    cb(mockPrisma),
  ),
};

jest.mock("../../db", () => ({
  getPrismaClient: () => mockPrisma,
}));

import {
  replaceContractChunks,
  replaceOrganizationBrainItemChunks,
  replaceLegalSourceChunks,
  type ChunkToStore,
  type LegalChunkToStore,
} from "./store";

const chunks: ChunkToStore[] = [
  {
    chunkIndex: 0,
    headingPath: "ARTICLE I",
    content: "First chunk",
    tokenCount: 10,
    embedding: [0.1, 0.2, 0.3],
  },
  {
    chunkIndex: 1,
    headingPath: "ARTICLE II",
    content: "Second chunk",
    tokenCount: 12,
    embedding: [0.4, 0.5, 0.6],
  },
];

describe("replaceContractChunks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.contractChunk.findMany.mockResolvedValue([
      { id: "row-0", chunkIndex: 0 },
      { id: "row-1", chunkIndex: 1 },
    ]);
  });

  it("runs the whole replace inside a single transaction", async () => {
    await replaceContractChunks("contract-1", "org-1", chunks);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("deletes any existing chunks for the contract before inserting new ones", async () => {
    await replaceContractChunks("contract-1", "org-1", chunks);

    expect(mockPrisma.contractChunk.deleteMany).toHaveBeenCalledWith({
      where: { contractId: "contract-1" },
    });
    expect(mockPrisma.contractChunk.createMany).toHaveBeenCalled();

    const deleteOrder =
      mockPrisma.contractChunk.deleteMany.mock.invocationCallOrder[0];
    const createOrder =
      mockPrisma.contractChunk.createMany.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it("creates a row per chunk with the contract and organization ids attached", async () => {
    await replaceContractChunks("contract-1", "org-1", chunks);

    const { data } = mockPrisma.contractChunk.createMany.mock.calls[0][0];
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      contractId: "contract-1",
      organizationId: "org-1",
      chunkIndex: 0,
      headingPath: "ARTICLE I",
      content: "First chunk",
      tokenCount: 10,
    });
  });

  it("writes every chunk's embedding via a single bulk UPDATE ... FROM (VALUES ...) call", async () => {
    await replaceContractChunks("contract-1", "org-1", chunks);

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);

    const [sql, ...params] = mockPrisma.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain("UPDATE contract_chunks");
    expect(sql).toContain("FROM (VALUES");
    expect(params).toEqual(["row-0", "[0.1,0.2,0.3]", "row-1", "[0.4,0.5,0.6]"]);
  });

  it("is idempotent for an empty chunk list: deletes existing chunks without attempting to create or embed anything", async () => {
    await replaceContractChunks("contract-1", "org-1", []);

    expect(mockPrisma.contractChunk.deleteMany).toHaveBeenCalledWith({
      where: { contractId: "contract-1" },
    });
    expect(mockPrisma.contractChunk.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.contractChunk.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});

const orgBrainChunks: ChunkToStore[] = [
  {
    chunkIndex: 0,
    headingPath: "Section 1",
    content: "Preferred indemnification language",
    tokenCount: 8,
    embedding: [0.7, 0.8, 0.9],
  },
];

describe("replaceOrganizationBrainItemChunks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.organizationBrainChunk.findMany.mockResolvedValue([
      { id: "obc-row-0", chunkIndex: 0 },
    ]);
  });

  it("deletes existing chunks for the item before inserting new ones", async () => {
    await replaceOrganizationBrainItemChunks("item-1", "org-1", orgBrainChunks);

    expect(mockPrisma.organizationBrainChunk.deleteMany).toHaveBeenCalledWith({
      where: { organizationBrainItemId: "item-1" },
    });
  });

  it("creates rows with the organization brain item and organization ids attached", async () => {
    await replaceOrganizationBrainItemChunks("item-1", "org-1", orgBrainChunks);

    const { data } =
      mockPrisma.organizationBrainChunk.createMany.mock.calls[0][0];
    expect(data[0]).toMatchObject({
      organizationBrainItemId: "item-1",
      organizationId: "org-1",
      chunkIndex: 0,
      content: "Preferred indemnification language",
    });
  });

  it("writes the embedding via a bulk UPDATE against organization_brain_chunks", async () => {
    await replaceOrganizationBrainItemChunks("item-1", "org-1", orgBrainChunks);

    const [sql, ...params] = mockPrisma.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain("UPDATE organization_brain_chunks");
    expect(params).toEqual(["obc-row-0", "[0.7,0.8,0.9]"]);
  });

  it("is idempotent for an empty chunk list", async () => {
    await replaceOrganizationBrainItemChunks("item-1", "org-1", []);

    expect(mockPrisma.organizationBrainChunk.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.organizationBrainChunk.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});

const legalChunks: LegalChunkToStore[] = [
  {
    chunkIndex: 0,
    headingPath: "الكتاب الثاني > الباب الثالث",
    content: "نص المادة 844",
    tokenCount: 6,
    embedding: [0.1, 0.2, 0.3],
    articleNumber: "844",
    amendingInstrument: "126/2019",
    amendmentEffectiveDate: new Date(Date.UTC(2019, 2, 29)),
    legalStatus: "IN_FORCE",
    licenseStatus: "DEVELOPMENT_ONLY",
  },
];

describe("replaceLegalSourceChunks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.legalChunk.findMany.mockResolvedValue([
      { id: "legal-row-0", chunkIndex: 0 },
    ]);
  });

  it("runs the whole replace inside a single transaction", async () => {
    await replaceLegalSourceChunks("source-1", legalChunks);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("deletes any existing chunks for the legal source before inserting new ones", async () => {
    await replaceLegalSourceChunks("source-1", legalChunks);

    expect(mockPrisma.legalChunk.deleteMany).toHaveBeenCalledWith({
      where: { legalSourceId: "source-1" },
    });
    expect(mockPrisma.legalChunk.createMany).toHaveBeenCalled();

    const deleteOrder = mockPrisma.legalChunk.deleteMany.mock.invocationCallOrder[0];
    const createOrder = mockPrisma.legalChunk.createMany.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it("creates a row per chunk with the legal source id and its own metadata attached, no organization id anywhere", async () => {
    await replaceLegalSourceChunks("source-1", legalChunks);

    const { data } = mockPrisma.legalChunk.createMany.mock.calls[0][0];
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      legalSourceId: "source-1",
      chunkIndex: 0,
      headingPath: "الكتاب الثاني > الباب الثالث",
      articleNumber: "844",
      content: "نص المادة 844",
      tokenCount: 6,
      amendingInstrument: "126/2019",
      legalStatus: "IN_FORCE",
      licenseStatus: "DEVELOPMENT_ONLY",
    });
    expect(data[0]).not.toHaveProperty("organizationId");
  });

  it("writes the embedding via a bulk UPDATE against legal_chunks", async () => {
    await replaceLegalSourceChunks("source-1", legalChunks);

    const [sql, ...params] = mockPrisma.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain("UPDATE legal_chunks");
    expect(params).toEqual(["legal-row-0", "[0.1,0.2,0.3]"]);
  });

  it("is idempotent for an empty chunk list", async () => {
    await replaceLegalSourceChunks("source-1", []);

    expect(mockPrisma.legalChunk.deleteMany).toHaveBeenCalledWith({
      where: { legalSourceId: "source-1" },
    });
    expect(mockPrisma.legalChunk.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.legalChunk.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
