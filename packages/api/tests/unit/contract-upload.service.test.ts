const mockDb = {
  user: { findFirst: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
  contract: { create: jest.fn() },
};

const mockUploadFile = jest.fn();
const mockExtractionQueueAdd = jest.fn();

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  extractionQueue: {
    add: (...args: unknown[]) => mockExtractionQueueAdd(...args),
  },
  deriveLegalState: () => "DRAFT",
  PLACEHOLDER_CONTRACT_TITLE: "Untitled Contract",
  PLACEHOLDER_CONTRACT_COUNTERPARTY: "Unknown Counterparty",
}));

import { contractService } from "../../src/services/contract.service";

const actor = { userId: "actor-1", organizationId: "org-1" };
const requestContext = {};

function activeUser() {
  return {
    id: "actor-1",
    organizationId: "org-1",
    status: "ACTIVE",
    organization: { status: "ACTIVE" },
  };
}

function fakeFile(): Express.Multer.File {
  return {
    buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    size: 20,
    originalname: "quarterly-services-agreement.pdf",
    mimetype: "application/pdf",
  } as Express.Multer.File;
}

function fakeContractRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "contract-1",
    title: "Untitled Contract",
    counterparty: "Unknown Counterparty",
    businessStatus: "DRAFT",
    processingStatus: "PENDING_EXTRACTION",
    legalState: "DRAFT",
    tags: [],
    expirationDate: null,
    fileKey: "contracts/org-1/file.pdf",
    version: 1,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.user.findFirst.mockResolvedValue(activeUser());
  mockUploadFile.mockResolvedValue(undefined);
  mockExtractionQueueAdd.mockResolvedValue(undefined);
});

describe("ContractService.uploadContract — title/counterparty placeholders", () => {
  it("writes the exact PLACEHOLDER_CONTRACT_TITLE/COUNTERPARTY literals when neither is provided — not a filename or any other derived value", async () => {
    mockDb.contract.create.mockResolvedValue(fakeContractRow());

    await contractService.uploadContract({
      metadata: { tags: [], expirationDate: null },
      file: fakeFile(),
      actor,
      requestContext,
    });

    expect(mockDb.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Untitled Contract",
          counterparty: "Unknown Counterparty",
        }),
      }),
    );
  });

  it("still uses the user-provided title/counterparty when given, unchanged", async () => {
    mockDb.contract.create.mockResolvedValue(
      fakeContractRow({
        title: "Master Services Agreement",
        counterparty: "Acme Corp",
      }),
    );

    await contractService.uploadContract({
      metadata: {
        title: "Master Services Agreement",
        counterparty: "Acme Corp",
        tags: [],
        expirationDate: null,
      },
      file: fakeFile(),
      actor,
      requestContext,
    });

    expect(mockDb.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Master Services Agreement",
          counterparty: "Acme Corp",
        }),
      }),
    );
  });

  it("falls back to the placeholder for an empty string, same as omitted — this is what createContractMetadataSchema's .trim() actually hands the service for whitespace-only input, since the service trusts already-validated input rather than re-trimming", async () => {
    mockDb.contract.create.mockResolvedValue(fakeContractRow());

    await contractService.uploadContract({
      metadata: {
        title: "",
        counterparty: "",
        tags: [],
        expirationDate: null,
      },
      file: fakeFile(),
      actor,
      requestContext,
    });

    expect(mockDb.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Untitled Contract",
          counterparty: "Unknown Counterparty",
        }),
      }),
    );
  });
});
