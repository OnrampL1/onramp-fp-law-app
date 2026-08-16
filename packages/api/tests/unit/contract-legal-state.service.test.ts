const mockDb = {
  contract: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
  // Mirrors packages/shared/contracts/legal-state.ts's deriveLegalState
  // exactly (separately unit-tested in that package). Duplicated here
  // rather than requireActual'd — @starter-kit/shared's real module tree
  // pulls in Prisma client instantiation and other Node-only side effects
  // that don't belong in a unit test, same reasoning as every other mocked
  // helper in this suite (hashToken, isAssignableRole, etc.).
  deriveLegalState: (
    currentLegalState: string | null,
    effectiveDate: Date | null,
    expirationDate: Date | null,
    now: Date = new Date(),
  ): string => {
    if (currentLegalState === "TERMINATED") return "TERMINATED";
    if (!effectiveDate) return "DRAFT";
    if (now < effectiveDate) return "DRAFT";
    if (expirationDate && now >= expirationDate) return "EXPIRED";
    return "ACTIVE";
  },
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

function contractRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "contract-1",
    organizationId: "org-1",
    title: "Master Services Agreement",
    counterparty: "Acme Corp",
    businessStatus: "UNDER_REVIEW",
    processingStatus: "AI_COMPLETED",
    processingError: null,
    legalState: "ACTIVE",
    tags: [],
    effectiveDate: new Date("2026-01-01"),
    expirationDate: null,
    fileKey: "contracts/org-1/abc-file.pdf",
    version: 1,
    uploadedBy: { fullName: "Alex Whitfield" },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ContractService.setContractLegalState", () => {
  it("returns 404 when the contract doesn't exist or belongs to another org", async () => {
    mockDb.user.findFirst.mockResolvedValue(activeUser());
    mockDb.contract.findFirst.mockResolvedValueOnce(null);

    await expect(
      contractService.setContractLegalState(
        "contract-1",
        { action: "terminate", version: 1 },
        actor,
        requestContext,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockDb.contract.updateMany).not.toHaveBeenCalled();
  });

  it("rejects terminating a contract that is already terminated (409)", async () => {
    mockDb.user.findFirst.mockResolvedValue(activeUser());
    mockDb.contract.findFirst.mockResolvedValueOnce(
      contractRow({ legalState: "TERMINATED" }),
    );

    await expect(
      contractService.setContractLegalState(
        "contract-1",
        { action: "terminate", version: 2 },
        actor,
        requestContext,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockDb.contract.updateMany).not.toHaveBeenCalled();
  });

  it("rejects reactivating a contract that isn't terminated (409)", async () => {
    mockDb.user.findFirst.mockResolvedValue(activeUser());
    mockDb.contract.findFirst.mockResolvedValueOnce(
      contractRow({ legalState: "ACTIVE" }),
    );

    await expect(
      contractService.setContractLegalState(
        "contract-1",
        { action: "reactivate", version: 1 },
        actor,
        requestContext,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockDb.contract.updateMany).not.toHaveBeenCalled();
  });

  it("terminate locks legalState to TERMINATED regardless of dates, with optimistic concurrency and audit logging", async () => {
    mockDb.user.findFirst.mockResolvedValue(activeUser());
    mockDb.contract.findFirst
      .mockResolvedValueOnce(
        contractRow({ legalState: "ACTIVE", version: 1 }),
      )
      .mockResolvedValueOnce(
        contractRow({ legalState: "TERMINATED", version: 2 }),
      );
    mockDb.contract.updateMany.mockResolvedValue({ count: 1 });

    const result = await contractService.setContractLegalState(
      "contract-1",
      { action: "terminate", version: 1 },
      actor,
      requestContext,
    );

    expect(mockDb.contract.updateMany).toHaveBeenCalledWith({
      where: {
        id: "contract-1",
        organizationId: "org-1",
        version: 1,
        deletedAt: null,
      },
      data: { legalState: "TERMINATED", version: { increment: 1 } },
    });
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CONTRACT_LEGAL_STATE_CHANGED",
          organizationId: "org-1",
          contractId: "contract-1",
          oldValue: { legalState: "ACTIVE" },
          newValue: { legalState: "TERMINATED" },
        }),
      }),
    );
    expect(result.legalState).toBe("TERMINATED");
  });

  it("reactivate recomputes legalState from dates rather than hardcoding ACTIVE — future effective date still lands on DRAFT", async () => {
    mockDb.user.findFirst.mockResolvedValue(activeUser());
    mockDb.contract.findFirst
      .mockResolvedValueOnce(
        contractRow({
          legalState: "TERMINATED",
          effectiveDate: new Date("2999-01-01"),
          expirationDate: null,
          version: 3,
        }),
      )
      .mockResolvedValueOnce(
        contractRow({ legalState: "DRAFT", version: 4 }),
      );
    mockDb.contract.updateMany.mockResolvedValue({ count: 1 });

    await contractService.setContractLegalState(
      "contract-1",
      { action: "reactivate", version: 3 },
      actor,
      requestContext,
    );

    expect(mockDb.contract.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { legalState: "DRAFT", version: { increment: 1 } },
      }),
    );
  });

  it("reactivate lands on EXPIRED when the expiration date has already passed", async () => {
    mockDb.user.findFirst.mockResolvedValue(activeUser());
    mockDb.contract.findFirst
      .mockResolvedValueOnce(
        contractRow({
          legalState: "TERMINATED",
          effectiveDate: new Date("2020-01-01"),
          expirationDate: new Date("2021-01-01"),
          version: 1,
        }),
      )
      .mockResolvedValueOnce(
        contractRow({ legalState: "EXPIRED", version: 2 }),
      );
    mockDb.contract.updateMany.mockResolvedValue({ count: 1 });

    await contractService.setContractLegalState(
      "contract-1",
      { action: "reactivate", version: 1 },
      actor,
      requestContext,
    );

    expect(mockDb.contract.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { legalState: "EXPIRED", version: { increment: 1 } },
      }),
    );
  });

  it("returns 409 when the version is stale — someone else changed the contract concurrently", async () => {
    mockDb.user.findFirst.mockResolvedValue(activeUser());
    mockDb.contract.findFirst.mockResolvedValueOnce(
      contractRow({ legalState: "ACTIVE", version: 1 }),
    );
    // updateMany's where clause is version-gated; a concurrent edit means
    // zero rows match even though the contract exists.
    mockDb.contract.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      contractService.setContractLegalState(
        "contract-1",
        { action: "terminate", version: 1 },
        actor,
        requestContext,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });
});
