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
  $executeRaw: jest.fn(),
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
  type ChunkToStore,
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

  it("writes each chunk's embedding via a raw UPDATE keyed by its own row id", async () => {
    await replaceContractChunks("contract-1", "org-1", chunks);

    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);

    // Tagged-template calls land as (strings, ...values) — values[0] is the
    // vector literal, values[1] is the row id being targeted.
    const firstCallValues = mockPrisma.$executeRaw.mock.calls[0].slice(1);
    expect(firstCallValues).toEqual(["[0.1,0.2,0.3]", "row-0"]);

    const secondCallValues = mockPrisma.$executeRaw.mock.calls[1].slice(1);
    expect(secondCallValues).toEqual(["[0.4,0.5,0.6]", "row-1"]);
  });

  it("is idempotent for an empty chunk list: deletes existing chunks without attempting to create or embed anything", async () => {
    await replaceContractChunks("contract-1", "org-1", []);

    expect(mockPrisma.contractChunk.deleteMany).toHaveBeenCalledWith({
      where: { contractId: "contract-1" },
    });
    expect(mockPrisma.contractChunk.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.contractChunk.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
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

  it("writes the embedding via a raw UPDATE against organization_brain_chunks", async () => {
    await replaceOrganizationBrainItemChunks("item-1", "org-1", orgBrainChunks);

    const values = mockPrisma.$executeRaw.mock.calls[0].slice(1);
    expect(values).toEqual(["[0.7,0.8,0.9]", "obc-row-0"]);
  });

  it("is idempotent for an empty chunk list", async () => {
    await replaceOrganizationBrainItemChunks("item-1", "org-1", []);

    expect(mockPrisma.organizationBrainChunk.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.organizationBrainChunk.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
  });
});
