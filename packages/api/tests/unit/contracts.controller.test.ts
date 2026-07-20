import type { Request, Response, NextFunction } from "express";
import { contractsController } from "../../src/controllers/contracts.controller";
import { contractsService } from "../../src/services/contracts.service";

jest.mock("../../src/services/contracts.service", () => ({
  contractsService: {
    uploadContract: jest.fn(),
  },
}));

const mockContractsService = contractsService as jest.Mocked<
  typeof contractsService
>;

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}

describe("contractsController.upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 422 when required metadata is missing", async () => {
    const req = {
      body: {
        title: "",
        counterparty: "",
      },
      user: {
        userId: "00000000-0000-4000-8000-000000000001",
        orgId: "00000000-0000-4000-8000-000000000002",
      },
    } as unknown as Request;

    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await contractsController.upload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
        errors: expect.any(Array),
      }),
    );
    expect(mockContractsService.uploadContract).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("uploads a contract and returns safe response fields", async () => {
    mockContractsService.uploadContract.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000101",
      organizationId: "00000000-0000-4000-8000-000000000002",
      uploadedByUserId: "00000000-0000-4000-8000-000000000001",
      title: "Master Services Agreement",
      counterparty: "Acme Corp",
      businessStatus: "DRAFT",
      processingStatus: "PENDING_EXTRACTION",
      legalState: "ACTIVE",
      tags: ["msa"],
      expirationDate: null,
      fileKey: "contracts/org/file.pdf",
      fileChecksum: "checksum",
      extractedText: null,
      version: 1,
      deletedAt: null,
      createdAt: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    });

    const req = {
      body: {
        title: "Master Services Agreement",
        counterparty: "Acme Corp",
        tags: '["msa"]',
        legalState: "ACTIVE",
      },
      file: {
        originalname: "contract.pdf",
      },
      user: {
        userId: "00000000-0000-4000-8000-000000000001",
        orgId: "00000000-0000-4000-8000-000000000002",
      },
      ip: "127.0.0.1",
      get: jest.fn().mockReturnValue("jest-agent"),
    } as unknown as Request;

    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await contractsController.upload(req, res, next);

    expect(mockContractsService.uploadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          title: "Master Services Agreement",
          counterparty: "Acme Corp",
          tags: ["msa"],
          legalState: "ACTIVE",
        }),
        actor: {
          userId: "00000000-0000-4000-8000-000000000001",
          organizationId: "00000000-0000-4000-8000-000000000002",
        },
      }),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      data: expect.not.objectContaining({
        fileKey: expect.anything(),
        fileChecksum: expect.anything(),
        extractedText: expect.anything(),
      }),
    });
    expect(next).not.toHaveBeenCalled();
  });
});
