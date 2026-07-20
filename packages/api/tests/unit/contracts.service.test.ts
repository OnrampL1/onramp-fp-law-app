/// <reference types="jest" />

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../src/lib/storage", () => ({
  uploadFile: jest.fn(),
}));

jest.mock("../../src/repositories/contracts.repository", () => ({
  contractsRepository: {
    createUploadedContract: jest.fn(),
  },
}));

import { ContractsService } from "../../src/services/contracts.service";
import { uploadFile } from "../../src/lib/storage";
import { contractsRepository } from "../../src/repositories/contracts.repository";

const mockUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>;
const mockContractsRepository = contractsRepository as jest.Mocked<
  typeof contractsRepository
>;

function createTextFile(): Express.Multer.File {
  const buffer = Buffer.from("This is a valid plain text contract.");

  return {
    fieldname: "file",
    originalname: "Test Contract.txt",
    encoding: "7bit",
    mimetype: "text/plain",
    size: buffer.length,
    buffer,
    destination: "",
    filename: "",
    path: "",
    stream: undefined as never,
  };
}

describe("ContractsService.uploadContract", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.user.findFirst.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      organizationId: "00000000-0000-4000-8000-000000000002",
      status: "ACTIVE",
      organization: {
        status: "ACTIVE",
      },
    });

    mockUploadFile.mockResolvedValue({
      key: "contracts/org/file.txt",
      url: null,
    });

    mockContractsRepository.createUploadedContract.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000101",
      organizationId: "00000000-0000-4000-8000-000000000002",
      uploadedByUserId: "00000000-0000-4000-8000-000000000001",
      title: "Master Services Agreement",
      counterparty: "Acme Corp",
      businessStatus: "DRAFT",
      processingStatus: "PENDING_EXTRACTION",
      legalState: null,
      tags: ["msa"],
      expirationDate: null,
      fileKey: "contracts/org/file.txt",
      fileChecksum: "checksum",
      extractedText: null,
      version: 1,
      deletedAt: null,
      createdAt: new Date("2026-07-16T00:00:00.000Z"),
      updatedAt: new Date("2026-07-16T00:00:00.000Z"),
    });
  });

  it("uploads a valid contract file and creates a contract", async () => {
    const service = new ContractsService();

    await service.uploadContract({
      metadata: {
        title: "Master Services Agreement",
        counterparty: "Acme Corp",
        tags: ["msa"],
        expirationDate: null,
        legalState: undefined,
      },
      file: createTextFile(),
      actor: {
        userId: "00000000-0000-4000-8000-000000000001",
        organizationId: "00000000-0000-4000-8000-000000000002",
      },
      requestContext: {
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      },
    });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "00000000-0000-4000-8000-000000000001",
        organizationId: "00000000-0000-4000-8000-000000000002",
      },
      include: {
        organization: true,
      },
    });

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^contracts\/00000000-0000-4000-8000-000000000002\/.+-Test-Contract\.txt$/,
      ),
      expect.any(Buffer),
      "text/plain",
    );

    expect(mockContractsRepository.createUploadedContract).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "00000000-0000-4000-8000-000000000002",
        uploadedByUserId: "00000000-0000-4000-8000-000000000001",
        title: "Master Services Agreement",
        counterparty: "Acme Corp",
        tags: ["msa"],
        expirationDate: null,
        extractedText: null,
        processingStatus: "PENDING_EXTRACTION",
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      }),
    );

    expect(
      mockContractsRepository.createUploadedContract.mock.calls[0][0]
        .fileChecksum,
    ).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects uploads for suspended users", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      organizationId: "00000000-0000-4000-8000-000000000002",
      status: "SUSPENDED",
      organization: {
        status: "ACTIVE",
      },
    });

    const service = new ContractsService();

    await expect(
      service.uploadContract({
        metadata: {
          title: "Master Services Agreement",
          counterparty: "Acme Corp",
          tags: [],
          expirationDate: null,
          legalState: undefined,
        },
        file: createTextFile(),
        actor: {
          userId: "00000000-0000-4000-8000-000000000001",
          organizationId: "00000000-0000-4000-8000-000000000002",
        },
        requestContext: {},
      }),
    ).rejects.toMatchObject({
      message: "This account is not active",
      statusCode: 403,
    });

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(
      mockContractsRepository.createUploadedContract,
    ).not.toHaveBeenCalled();
  });

  it("rejects invalid PDF content before storing the file", async () => {
    const buffer = Buffer.from("not a real PDF");
    const invalidPdf = {
      ...createTextFile(),
      originalname: "contract.pdf",
      mimetype: "application/pdf",
      size: buffer.length,
      buffer,
    };

    const service = new ContractsService();

    await expect(
      service.uploadContract({
        metadata: {
          title: "Master Services Agreement",
          counterparty: "Acme Corp",
          tags: [],
          expirationDate: null,
          legalState: undefined,
        },
        file: invalidPdf,
        actor: {
          userId: "00000000-0000-4000-8000-000000000001",
          organizationId: "00000000-0000-4000-8000-000000000002",
        },
        requestContext: {},
      }),
    ).rejects.toMatchObject({
      message: "Uploaded PDF file is invalid",
      statusCode: 422,
    });

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(
      mockContractsRepository.createUploadedContract,
    ).not.toHaveBeenCalled();
  });
});
