const mockDb = {
  contract: {
    findFirst: jest.fn(),
  },
  witnessInvitation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  organization: {
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
};

const mockEmailQueueAdd = jest.fn();
const mockGetFileStream = jest.fn();

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
  hashToken: (raw: string) => `hashed-${raw}`,
  generateRawToken: () => "raw-token",
  signWitnessSessionToken: (witnessInvitationId: string) =>
    `session-for-${witnessInvitationId}`,
  emailQueue: { add: (...args: unknown[]) => mockEmailQueueAdd(...args) },
  // getFileStream lives in packages/shared/storage/client.ts, re-exported
  // through @starter-kit/shared's index — not a local packages/api module,
  // so it's mocked here alongside the rest of the package rather than via a
  // separate jest.mock on a path that doesn't exist in this package.
  getFileStream: (...args: unknown[]) => mockGetFileStream(...args),
}));

import { witnessService } from "../../src/services/witness.service";

const actor = { id: "actor-1", organizationId: "org-1" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("WitnessService.createWitnessLink", () => {
  it("rejects a contract that belongs to a different organization", async () => {
    // findFirst is scoped by organizationId, so a cross-org contractId
    // simply resolves to nothing — never trust the client-supplied id.
    mockDb.contract.findFirst.mockResolvedValue(null);

    await expect(
      witnessService.createWitnessLink(actor, {
        contractId: "contract-in-other-org",
        witnessEmail: "witness@example.com",
        expiresInHours: 72,
        sendEmail: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockDb.contract.findFirst).toHaveBeenCalledWith({
      where: { id: "contract-in-other-org", organizationId: "org-1", deletedAt: null },
    });
    expect(mockDb.witnessInvitation.create).not.toHaveBeenCalled();
  });

  it("rejects a soft-deleted contract even if it belongs to the org", async () => {
    // deletedAt: null is baked into the findFirst filter above; this test
    // documents that a soft-deleted contract can't have a link issued
    // against it (findFirst returns null for it, same as a missing row).
    mockDb.contract.findFirst.mockResolvedValue(null);

    await expect(
      witnessService.createWitnessLink(actor, {
        contractId: "deleted-contract",
        witnessEmail: "witness@example.com",
        expiresInHours: 72,
        sendEmail: false,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("hashes the token before persisting it and never persists the raw value", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    });

    const result = await witnessService.createWitnessLink(actor, {
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      expiresInHours: 72,
      sendEmail: false,
    });

    expect(mockDb.witnessInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenHash: "hashed-raw-token" }),
      }),
    );
    // The raw token is only ever handed back in this response, never stored.
    const createCallData = mockDb.witnessInvitation.create.mock.calls[0][0].data;
    expect(createCallData).not.toHaveProperty("token");
    expect(result.token).toBe("raw-token");
  });

  it("sets expiresAt from expiresInHours relative to now", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);

    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04T00:00:00.000Z"),
      createdAt: now,
    });

    await witnessService.createWitnessLink(actor, {
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      expiresInHours: 72,
      sendEmail: false,
    });

    expect(mockDb.witnessInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiresAt: new Date("2026-01-04T00:00:00.000Z"),
        }),
      }),
    );

    jest.useRealTimers();
  });

  it("persists witnessEmail/witnessName, scopes the invitation to the resolved contract, and logs WITNESS_INVITATION_CREATED", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: "Jordan Smith",
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    });

    await witnessService.createWitnessLink(actor, {
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: "Jordan Smith",
      expiresInHours: 72,
      sendEmail: false,
    });

    expect(mockDb.witnessInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contractId: "contract-1",
          issuedByUserId: "actor-1",
          witnessEmail: "witness@example.com",
          witnessName: "Jordan Smith",
        }),
      }),
    );
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "WITNESS_INVITATION_CREATED",
          actorUserId: "actor-1",
          organizationId: "org-1",
          targetEntityType: "WitnessInvitation",
          targetEntityId: "witness-1",
          contractId: "contract-1",
          witnessInvitationId: "witness-1",
        }),
      }),
    );
  });

  it("never includes the raw or hashed token in the audit log entry", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    });

    await witnessService.createWitnessLink(actor, {
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      expiresInHours: 72,
      sendEmail: false,
    });

    const auditData = mockDb.auditLog.create.mock.calls[0][0].data;
    expect(JSON.stringify(auditData)).not.toContain("raw-token");
    expect(JSON.stringify(auditData)).not.toContain("hashed-raw-token");
  });

  it("returns a public shape that never exposes the token hash", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    });

    const result = await witnessService.createWitnessLink(actor, {
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      expiresInHours: 72,
      sendEmail: false,
    });

    expect(result).not.toHaveProperty("tokenHash");
    expect(result.status).toBe("pending");
  });

  it("enqueues a witness email and persists emailSentAt when sendEmail is true", async () => {
    mockDb.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      organizationId: "org-1",
      title: "Master Services Agreement",
    });
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: "Jordan Smith",
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
      emailSentAt: null,
    });
    mockDb.user.findUnique.mockResolvedValue({ fullName: "Alex Whitfield" });
    mockDb.organization.findUnique.mockResolvedValue({ name: "Acme Corp" });
    const sentAt = new Date("2026-01-01T00:05:00.000Z");
    mockDb.witnessInvitation.update.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: "Jordan Smith",
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
      emailSentAt: sentAt,
    });

    const result = await witnessService.createWitnessLink(actor, {
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: "Jordan Smith",
      expiresInHours: 72,
      sendEmail: true,
    });

    expect(mockEmailQueueAdd).toHaveBeenCalledWith(
      "witness",
      expect.objectContaining({
        to: "witness@example.com",
        template: "witness",
        variables: expect.objectContaining({
          witnessName: "Jordan Smith",
          issuerName: "Alex Whitfield",
          organizationName: "Acme Corp",
          contractTitle: "Master Services Agreement",
          witnessUrl: expect.stringContaining("raw-token"),
        }),
      }),
    );
    expect(mockDb.witnessInvitation.update).toHaveBeenCalledWith({
      where: { id: "witness-1" },
      data: { emailSentAt: expect.any(Date) },
    });
    expect(result.emailSentAt).toEqual(sentAt);
  });

  it("never enqueues an email or touches emailSentAt when sendEmail is false", async () => {
    mockDb.contract.findFirst.mockResolvedValue({
      id: "contract-1",
      organizationId: "org-1",
      title: "Master Services Agreement",
    });
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
      emailSentAt: null,
    });

    const result = await witnessService.createWitnessLink(actor, {
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      expiresInHours: 72,
      sendEmail: false,
    });

    expect(mockEmailQueueAdd).not.toHaveBeenCalled();
    expect(mockDb.witnessInvitation.update).not.toHaveBeenCalled();
    expect(result.emailSentAt).toBeNull();
  });

  it("rejects with 409 when an active (issued, unrevoked, unexpired) link already exists for the same contract+witness", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    mockDb.witnessInvitation.findFirst.mockResolvedValue({
      id: "existing-witness-invitation",
      status: "ISSUED",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(
      witnessService.createWitnessLink(actor, {
        contractId: "contract-1",
        witnessEmail: "witness@example.com",
        expiresInHours: 72,
        sendEmail: false,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockDb.witnessInvitation.findFirst).toHaveBeenCalledWith({
      where: {
        contractId: "contract-1",
        witnessEmail: "witness@example.com",
        isRevoked: false,
        status: { not: "USED" },
        expiresAt: { gt: expect.any(Date) },
      },
    });
    expect(mockDb.witnessInvitation.create).not.toHaveBeenCalled();
  });

  it("allows a new link when the existing one for that contract+witness has been revoked", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    // isRevoked: false is baked into the findFirst filter, so a revoked row
    // simply never matches — findFirst resolves null, same as "no active link".
    mockDb.witnessInvitation.findFirst.mockResolvedValue(null);
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-2",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    });

    await expect(
      witnessService.createWitnessLink(actor, {
        contractId: "contract-1",
        witnessEmail: "witness@example.com",
        expiresInHours: 72,
        sendEmail: false,
      }),
    ).resolves.toBeDefined();

    expect(mockDb.witnessInvitation.create).toHaveBeenCalled();
  });

  it("allows a new link when the existing one for that contract+witness has expired", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    // expiresAt: { gt: now } is baked into the findFirst filter, so an
    // expired row never matches — findFirst resolves null.
    mockDb.witnessInvitation.findFirst.mockResolvedValue(null);
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-3",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    });

    await expect(
      witnessService.createWitnessLink(actor, {
        contractId: "contract-1",
        witnessEmail: "witness@example.com",
        expiresInHours: 72,
        sendEmail: false,
      }),
    ).resolves.toBeDefined();

    expect(mockDb.witnessInvitation.create).toHaveBeenCalled();
  });

  it("allows a new link when the existing one for that contract+witness has already been used", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-1", organizationId: "org-1" });
    // status: { not: "USED" } is baked into the findFirst filter, so a used
    // row never matches — findFirst resolves null.
    mockDb.witnessInvitation.findFirst.mockResolvedValue(null);
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-4",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    });

    await expect(
      witnessService.createWitnessLink(actor, {
        contractId: "contract-1",
        witnessEmail: "witness@example.com",
        expiresInHours: 72,
        sendEmail: false,
      }),
    ).resolves.toBeDefined();

    expect(mockDb.witnessInvitation.create).toHaveBeenCalled();
  });

  it("allows a link for the same witness email on a different contract", async () => {
    mockDb.contract.findFirst.mockResolvedValue({ id: "contract-2", organizationId: "org-1" });
    mockDb.witnessInvitation.findFirst.mockResolvedValue(null);
    mockDb.witnessInvitation.create.mockResolvedValue({
      id: "witness-5",
      contractId: "contract-2",
      witnessEmail: "witness@example.com",
      witnessName: null,
      expiresAt: new Date("2026-01-04"),
      createdAt: new Date("2026-01-01"),
    });

    await expect(
      witnessService.createWitnessLink(actor, {
        contractId: "contract-2",
        witnessEmail: "witness@example.com",
        expiresInHours: 72,
        sendEmail: false,
      }),
    ).resolves.toBeDefined();

    expect(mockDb.witnessInvitation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ contractId: "contract-2" }) }),
    );
    expect(mockDb.witnessInvitation.create).toHaveBeenCalled();
  });
});

describe("WitnessService.redeemWitnessLink", () => {
  function baseInvitation(overrides: Partial<{
    isRevoked: boolean;
    status: "ISSUED" | "USED" | "EXPIRED" | "REVOKED";
    expiresAt: Date;
  }> = {}) {
    return {
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      isRevoked: false,
      status: "ISSUED" as const,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2026-01-01"),
      contract: {
        id: "contract-1",
        organizationId: "org-1",
        title: "Master Services Agreement",
        counterparty: "Acme Corp",
        businessStatus: "UNDER_REVIEW",
        legalState: null,
        expirationDate: null,
      },
      ...overrides,
    };
  }

  it("rejects an unknown token with 404 and never touches updateMany", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(null);

    await expect(
      witnessService.redeemWitnessLink("bogus-token"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockDb.witnessInvitation.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: "hashed-bogus-token" },
      include: { contract: true },
    });
    expect(mockDb.witnessInvitation.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a revoked invitation with 410", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(
      baseInvitation({ isRevoked: true }),
    );

    await expect(
      witnessService.redeemWitnessLink("raw-token"),
    ).rejects.toMatchObject({ statusCode: 410 });
    expect(mockDb.witnessInvitation.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an expired invitation with 410", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(
      baseInvitation({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      witnessService.redeemWitnessLink("raw-token"),
    ).rejects.toMatchObject({ statusCode: 410 });
    expect(mockDb.witnessInvitation.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an already-used invitation with 410", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(
      baseInvitation({ status: "USED" }),
    );

    await expect(
      witnessService.redeemWitnessLink("raw-token"),
    ).rejects.toMatchObject({ statusCode: 410 });
    expect(mockDb.witnessInvitation.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an already-revoked-status invitation with 410", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(
      baseInvitation({ status: "REVOKED", isRevoked: true }),
    );

    await expect(
      witnessService.redeemWitnessLink("raw-token"),
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("atomically flips ISSUED -> USED via a conditional updateMany scoped to the row id and status", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(baseInvitation());
    mockDb.witnessInvitation.updateMany.mockResolvedValue({ count: 1 });

    await witnessService.redeemWitnessLink("raw-token");

    expect(mockDb.witnessInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: "witness-1", status: "ISSUED" },
      data: { status: "USED", usedAt: expect.any(Date) },
    });
  });

  it("closes the concurrent-redemption race: only one of two simultaneous attempts succeeds", async () => {
    // Both requests read the row while it's still ISSUED (the race window)...
    mockDb.witnessInvitation.findUnique.mockResolvedValue(baseInvitation());
    // ...but only the first UPDATE actually matches status = 'ISSUED';
    // Postgres has already moved the row to USED by the time the second
    // one runs, so its conditional update matches zero rows.
    mockDb.witnessInvitation.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const [first, second] = await Promise.allSettled([
      witnessService.redeemWitnessLink("raw-token"),
      witnessService.redeemWitnessLink("raw-token"),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.status).toBe("rejected");
    if (second.status === "rejected") {
      expect(second.reason).toMatchObject({ statusCode: 410 });
    }
    expect(mockDb.witnessInvitation.updateMany).toHaveBeenCalledTimes(2);
  });

  it("logs WITNESS_ACCESSED with a SYSTEM actor (no User/PlatformUser — a witness has no account)", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(baseInvitation());
    mockDb.witnessInvitation.updateMany.mockResolvedValue({ count: 1 });

    await witnessService.redeemWitnessLink("raw-token", {
      ipAddress: "127.0.0.1",
      userAgent: "jest",
    });

    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "WITNESS_ACCESSED",
          actorType: "SYSTEM",
          actorUserId: undefined,
          organizationId: "org-1",
          targetEntityType: "WitnessInvitation",
          targetEntityId: "witness-1",
          contractId: "contract-1",
          witnessInvitationId: "witness-1",
          ipAddress: "127.0.0.1",
          userAgent: "jest",
        }),
      }),
    );
  });

  it("returns a session token, a minimal contract preview, and a used witness token with no raw token", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(baseInvitation());
    mockDb.witnessInvitation.updateMany.mockResolvedValue({ count: 1 });

    const result = await witnessService.redeemWitnessLink("raw-token");

    expect(result.sessionToken).toBe("session-for-witness-1");
    expect(result.contract).toEqual(
      expect.objectContaining({ id: "contract-1", title: "Master Services Agreement" }),
    );
    expect(result.contract).not.toHaveProperty("extractedText");
    expect(result.contract).not.toHaveProperty("fileKey");
    expect(result.witnessToken.status).toBe("used");
    expect(result.witnessToken.token).toBeNull();
  });

  it("never logs the raw or hashed token on successful redemption", async () => {
    mockDb.witnessInvitation.findUnique.mockResolvedValue(baseInvitation());
    mockDb.witnessInvitation.updateMany.mockResolvedValue({ count: 1 });

    await witnessService.redeemWitnessLink("raw-token");

    const auditData = mockDb.auditLog.create.mock.calls[0][0].data;
    expect(JSON.stringify(auditData)).not.toContain("raw-token");
    expect(JSON.stringify(auditData)).not.toContain("hashed-raw-token");
  });
});

describe("WitnessService.getWitnessScopedContract", () => {
  function baseContractRow() {
    return {
      id: "contract-1",
      title: "Master Services Agreement",
      counterparty: "Acme Corp",
      businessStatus: "UNDER_REVIEW",
      legalState: null,
      tags: ["msa"],
      effectiveDate: null,
      expirationDate: null,
      processingStatus: "EXTRACTION_COMPLETED",
      processingError: null,
      extractedText: "Full contract text...",
      fileKey: "contracts/org-1/file.pdf",
      organization: {
        name: "Ridgeline & Voss LLP",
        settings: { logoStorageKey: "organization-logos/org-1/logo.png" },
      },
    };
  }

  it("looks up the contract scoped to the given id and excludes soft-deleted rows", async () => {
    mockDb.contract.findFirst.mockResolvedValue(baseContractRow());

    await witnessService.getWitnessScopedContract("contract-1");

    expect(mockDb.contract.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "contract-1", deletedAt: null },
      }),
    );
  });

  it("selects only witness-safe fields — never notes, aiAnalyses, org/user identity, or raw file fields", async () => {
    mockDb.contract.findFirst.mockResolvedValue(baseContractRow());

    await witnessService.getWitnessScopedContract("contract-1");

    const { select } = mockDb.contract.findFirst.mock.calls[0][0];
    expect(select).not.toHaveProperty("notes");
    expect(select).not.toHaveProperty("aiAnalyses");
    expect(select).not.toHaveProperty("organizationId");
    expect(select).not.toHaveProperty("uploadedByUserId");
    expect(select).not.toHaveProperty("fileChecksum");
  });

  it("throws 404 when the contract doesn't exist or is soft-deleted", async () => {
    mockDb.contract.findFirst.mockResolvedValue(null);

    await expect(
      witnessService.getWitnessScopedContract("missing-contract"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns metadata + extractedText but never the raw fileKey or any internal fields", async () => {
    mockDb.contract.findFirst.mockResolvedValue(baseContractRow());

    const result = await witnessService.getWitnessScopedContract("contract-1");

    expect(result).toEqual({
      id: "contract-1",
      title: "Master Services Agreement",
      counterparty: "Acme Corp",
      businessStatus: "UNDER_REVIEW",
      legalState: null,
      tags: ["msa"],
      effectiveDate: null,
      expirationDate: null,
      processingStatus: "EXTRACTION_COMPLETED",
      processingError: null,
      extractedText: "Full contract text...",
      organizationName: "Ridgeline & Voss LLP",
      organizationLogoUrl: "/api/witness/organization/logo",
    });
    expect(result).not.toHaveProperty("fileKey");
    expect(result).not.toHaveProperty("fileUrl");
    expect(result).not.toHaveProperty("notes");
    expect(result).not.toHaveProperty("aiAnalyses");
  });

  it("returns a null organizationLogoUrl when the organization has no logo uploaded, rather than a URL that 404s", async () => {
    mockDb.contract.findFirst.mockResolvedValue({
      ...baseContractRow(),
      organization: { name: "Ridgeline & Voss LLP", settings: { logoStorageKey: null } },
    });

    const result = await witnessService.getWitnessScopedContract("contract-1");

    expect(result.organizationName).toBe("Ridgeline & Voss LLP");
    expect(result.organizationLogoUrl).toBeNull();
  });

  it("surfaces processingStatus and processingError so the portal can render a pending/failed state", async () => {
    mockDb.contract.findFirst.mockResolvedValue({
      ...baseContractRow(),
      processingStatus: "EXTRACTION_FAILED",
      processingError: "Unsupported file format",
    });

    const result = await witnessService.getWitnessScopedContract("contract-1");

    expect(result.processingStatus).toBe("EXTRACTION_FAILED");
    expect(result.processingError).toBe("Unsupported file format");
  });
});

describe("WitnessService.getWitnessScopedContractFile", () => {
  it("looks up only the fileKey, scoped to the given id, and excludes soft-deleted rows", async () => {
    mockDb.contract.findFirst.mockResolvedValue({
      fileKey: "contracts/org-1/file.pdf",
    });
    mockGetFileStream.mockResolvedValue({
      body: "stream-placeholder",
      contentType: "application/pdf",
      contentLength: 1024,
    });

    await witnessService.getWitnessScopedContractFile("contract-1");

    expect(mockDb.contract.findFirst).toHaveBeenCalledWith({
      where: { id: "contract-1", deletedAt: null },
      select: { fileKey: true },
    });
  });

  it("throws 404 when the contract doesn't exist or is soft-deleted", async () => {
    mockDb.contract.findFirst.mockResolvedValue(null);

    await expect(
      witnessService.getWitnessScopedContractFile("missing-contract"),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mockGetFileStream).not.toHaveBeenCalled();
  });

  it("streams the object from the contract's fileKey and defaults contentType when S3 omits it", async () => {
    mockDb.contract.findFirst.mockResolvedValue({
      fileKey: "contracts/org-1/file.pdf",
    });
    mockGetFileStream.mockResolvedValue({
      body: "stream-placeholder",
      contentType: undefined,
      contentLength: 1024,
    });

    const result = await witnessService.getWitnessScopedContractFile("contract-1");

    expect(mockGetFileStream).toHaveBeenCalledWith("contracts/org-1/file.pdf");
    expect(result).toEqual({
      body: "stream-placeholder",
      contentType: "application/octet-stream",
      contentLength: 1024,
    });
  });
});

describe("WitnessService.revokeWitnessLink", () => {
  function baseInvitationRow(overrides: Partial<{
    status: "ISSUED" | "USED" | "EXPIRED" | "REVOKED";
    isRevoked: boolean;
  }> = {}) {
    return {
      id: "witness-1",
      contractId: "contract-1",
      witnessEmail: "witness@example.com",
      witnessName: null,
      status: "ISSUED" as const,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2026-01-01"),
      contract: { id: "contract-1", organizationId: "org-1" },
      ...overrides,
    };
  }

  it("rejects a witness invitation belonging to a different organization", async () => {
    // findFirst is scoped through contract.organizationId, so a cross-org
    // id simply resolves to nothing — never trusted from the client.
    mockDb.witnessInvitation.findFirst.mockResolvedValue(null);

    await expect(
      witnessService.revokeWitnessLink(actor, "invitation-in-other-org"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockDb.witnessInvitation.findFirst).toHaveBeenCalledWith({
      where: { id: "invitation-in-other-org", contract: { organizationId: "org-1" } },
      include: { contract: true },
    });
    expect(mockDb.witnessInvitation.update).not.toHaveBeenCalled();
  });

  it("revokes an ISSUED (never-used) invitation", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(baseInvitationRow());
    mockDb.witnessInvitation.update.mockResolvedValue({
      ...baseInvitationRow(),
      status: "REVOKED",
      isRevoked: true,
    });

    const result = await witnessService.revokeWitnessLink(actor, "witness-1");

    expect(mockDb.witnessInvitation.update).toHaveBeenCalledWith({
      where: { id: "witness-1" },
      data: { isRevoked: true, status: "REVOKED" },
    });
    expect(result.status).toBe("revoked");
  });

  it("also revokes an already-USED invitation — cutting off an active session is the whole point (BR-8)", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(
      baseInvitationRow({ status: "USED" }),
    );
    mockDb.witnessInvitation.update.mockResolvedValue({
      ...baseInvitationRow({ status: "USED" }),
      status: "REVOKED",
      isRevoked: true,
    });

    const result = await witnessService.revokeWitnessLink(actor, "witness-1");

    expect(mockDb.witnessInvitation.update).toHaveBeenCalledWith({
      where: { id: "witness-1" },
      data: { isRevoked: true, status: "REVOKED" },
    });
    expect(result.status).toBe("revoked");
  });

  it("rejects an invitation that has already been revoked, with a clear 409", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(
      baseInvitationRow({ status: "REVOKED", isRevoked: true }),
    );

    await expect(
      witnessService.revokeWitnessLink(actor, "witness-1"),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockDb.witnessInvitation.update).not.toHaveBeenCalled();
  });

  it("allows revoking an EXPIRED invitation (isRevoked is the only guard, not status)", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(
      baseInvitationRow({ status: "EXPIRED" }),
    );
    mockDb.witnessInvitation.update.mockResolvedValue({
      ...baseInvitationRow({ status: "EXPIRED" }),
      status: "REVOKED",
      isRevoked: true,
    });

    await expect(
      witnessService.revokeWitnessLink(actor, "witness-1"),
    ).resolves.toMatchObject({ status: "revoked" });
  });

  it("logs WITNESS_INVITATION_REVOKED with the actor, contract, and invitation ids", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(baseInvitationRow());
    mockDb.witnessInvitation.update.mockResolvedValue({
      ...baseInvitationRow(),
      status: "REVOKED",
      isRevoked: true,
    });

    await witnessService.revokeWitnessLink(actor, "witness-1", {
      ipAddress: "127.0.0.1",
      userAgent: "jest",
    });

    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "WITNESS_INVITATION_REVOKED",
          actorUserId: "actor-1",
          organizationId: "org-1",
          targetEntityType: "WitnessInvitation",
          targetEntityId: "witness-1",
          contractId: "contract-1",
          witnessInvitationId: "witness-1",
          ipAddress: "127.0.0.1",
          userAgent: "jest",
        }),
      }),
    );
  });

  it("preserves usedAt history — only isRevoked/status are written, usedAt is never touched", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(
      baseInvitationRow({ status: "USED" }),
    );
    mockDb.witnessInvitation.update.mockResolvedValue({
      ...baseInvitationRow({ status: "USED" }),
      status: "REVOKED",
      isRevoked: true,
    });

    await witnessService.revokeWitnessLink(actor, "witness-1");

    const { data } = mockDb.witnessInvitation.update.mock.calls[0][0];
    expect(data).not.toHaveProperty("usedAt");
    expect(Object.keys(data).sort()).toEqual(["isRevoked", "status"]);
  });
});

describe("WitnessService.resendWitnessLink", () => {
  function baseInvitationRow(overrides: Partial<{
    status: "ISSUED" | "USED" | "EXPIRED" | "REVOKED";
    isRevoked: boolean;
  }> = {}) {
    return {
      id: "witness-1",
      contractId: "contract-1",
      issuedByUserId: "issuer-1",
      witnessEmail: "witness@example.com",
      witnessName: "Jordan Smith",
      status: "ISSUED" as const,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2026-01-01"),
      emailSentAt: new Date("2026-01-01"),
      contract: { id: "contract-1", organizationId: "org-1", title: "Master Services Agreement" },
      ...overrides,
    };
  }

  it("rejects a witness invitation belonging to a different organization", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(null);

    await expect(
      witnessService.resendWitnessLink(actor, "invitation-in-other-org"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockDb.witnessInvitation.findFirst).toHaveBeenCalledWith({
      where: { id: "invitation-in-other-org", contract: { organizationId: "org-1" } },
      include: { contract: true },
    });
    expect(mockDb.witnessInvitation.update).not.toHaveBeenCalled();
  });

  it("rejects a revoked witness invitation with 409", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(
      baseInvitationRow({ isRevoked: true, status: "REVOKED" }),
    );

    await expect(
      witnessService.resendWitnessLink(actor, "witness-1"),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockDb.witnessInvitation.update).not.toHaveBeenCalled();
  });

  it("rejects an already-used witness invitation with 409", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(
      baseInvitationRow({ status: "USED" }),
    );

    await expect(
      witnessService.resendWitnessLink(actor, "witness-1"),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mockDb.witnessInvitation.update).not.toHaveBeenCalled();
  });

  it("rotates the token and expiresAt, resets status to ISSUED, and re-sends the email", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(baseInvitationRow());
    mockDb.user.findUnique.mockResolvedValue({ fullName: "Alex Whitfield" });
    mockDb.organization.findUnique.mockResolvedValue({ name: "Acme Corp" });

    const rotated = {
      ...baseInvitationRow(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    };
    const resent = { ...rotated, emailSentAt: new Date("2026-01-02T00:00:00.000Z") };
    mockDb.witnessInvitation.update
      .mockResolvedValueOnce(rotated)
      .mockResolvedValueOnce(resent);

    const result = await witnessService.resendWitnessLink(actor, "witness-1");

    expect(mockDb.witnessInvitation.update).toHaveBeenNthCalledWith(1, {
      where: { id: "witness-1" },
      data: {
        status: "ISSUED",
        tokenHash: "hashed-raw-token",
        expiresAt: expect.any(Date),
      },
    });

    expect(mockEmailQueueAdd).toHaveBeenCalledWith(
      "witness",
      expect.objectContaining({
        to: "witness@example.com",
        template: "witness",
        variables: expect.objectContaining({
          witnessName: "Jordan Smith",
          issuerName: "Alex Whitfield",
          organizationName: "Acme Corp",
          contractTitle: "Master Services Agreement",
          witnessUrl: expect.stringContaining("raw-token"),
        }),
      }),
    );

    expect(mockDb.witnessInvitation.update).toHaveBeenNthCalledWith(2, {
      where: { id: "witness-1" },
      data: { emailSentAt: expect.any(Date) },
    });

    expect(result.token).toBe("raw-token");
    expect(result.status).toBe("pending");
    expect(result).not.toHaveProperty("tokenHash");
  });

  it("never writes an audit log entry — resends aren't audited, matching resendInvitation", async () => {
    mockDb.witnessInvitation.findFirst.mockResolvedValue(baseInvitationRow());
    mockDb.user.findUnique.mockResolvedValue({ fullName: "Alex Whitfield" });
    mockDb.organization.findUnique.mockResolvedValue({ name: "Acme Corp" });
    mockDb.witnessInvitation.update.mockResolvedValue(baseInvitationRow());

    await witnessService.resendWitnessLink(actor, "witness-1");

    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("WitnessService.listWitnessLinks", () => {
  function row(overrides: Partial<{
    status: "ISSUED" | "USED" | "EXPIRED" | "REVOKED";
    isRevoked: boolean;
    expiresAt: Date;
    usedAt: Date | null;
  }> = {}) {
    return {
      id: "witness-1",
      contractId: "contract-1",
      contract: { title: "Master Services Agreement" },
      witnessEmail: "witness@example.com",
      witnessName: "Jordan Smith",
      issuedBy: { id: "user-1", fullName: "Marcus Chen" },
      status: "ISSUED" as const,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      createdAt: new Date("2026-01-01"),
      ...overrides,
    };
  }

  it("scopes the query to the organization via the contract relation", async () => {
    mockDb.witnessInvitation.findMany.mockResolvedValue([]);
    mockDb.witnessInvitation.count.mockResolvedValue(0);

    await witnessService.listWitnessLinks("org-1", {}, { page: 1, limit: 20 });

    expect(mockDb.witnessInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contract: { organizationId: "org-1" } },
      }),
    );
    expect(mockDb.witnessInvitation.count).toHaveBeenCalledWith({
      where: { contract: { organizationId: "org-1" } },
    });
  });

  it("adds a contractId filter only when provided", async () => {
    mockDb.witnessInvitation.findMany.mockResolvedValue([]);
    mockDb.witnessInvitation.count.mockResolvedValue(0);

    await witnessService.listWitnessLinks(
      "org-1",
      { contractId: "contract-1" },
      { page: 1, limit: 20 },
    );

    expect(mockDb.witnessInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contract: { organizationId: "org-1" }, contractId: "contract-1" },
      }),
    );
  });

  it("orders newest first and translates page/limit into skip/take", async () => {
    mockDb.witnessInvitation.findMany.mockResolvedValue([]);
    mockDb.witnessInvitation.count.mockResolvedValue(0);

    await witnessService.listWitnessLinks("org-1", {}, { page: 3, limit: 10 });

    expect(mockDb.witnessInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        skip: 20,
        take: 10,
      }),
    );
  });

  it("returns pagination metadata computed from the total count", async () => {
    mockDb.witnessInvitation.findMany.mockResolvedValue([]);
    mockDb.witnessInvitation.count.mockResolvedValue(45);

    const result = await witnessService.listWitnessLinks("org-1", {}, { page: 2, limit: 20 });

    expect(result.pagination).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
  });

  it("maps each row to the public shape, joining contract title and issuer name, with no token/url", async () => {
    // Captured once and reused below — row()'s expiresAt is `new Date(Date.now() + ...)`,
    // so calling it a second time for the expectation raced the real clock and made
    // this test flaky (a tick between the two calls produced two different Dates).
    const invitation = row();
    mockDb.witnessInvitation.findMany.mockResolvedValue([invitation]);
    mockDb.witnessInvitation.count.mockResolvedValue(1);

    const { data } = await witnessService.listWitnessLinks("org-1", {}, { page: 1, limit: 20 });

    expect(data).toEqual([
      {
        id: "witness-1",
        contractId: "contract-1",
        contractTitle: "Master Services Agreement",
        witnessEmail: "witness@example.com",
        witnessName: "Jordan Smith",
        issuedBy: { id: "user-1", fullName: "Marcus Chen" },
        status: "pending",
        expiresAt: invitation.expiresAt,
        usedAt: null,
        createdAt: row().createdAt,
      },
    ]);
    expect(data[0]).not.toHaveProperty("token");
    expect(data[0]).not.toHaveProperty("witnessUrl");
  });

  it("derives status live: revoked takes priority, then used, then expiry vs. the stale ISSUED status", async () => {
    mockDb.witnessInvitation.count.mockResolvedValue(1);

    mockDb.witnessInvitation.findMany.mockResolvedValue([row({ isRevoked: true })]);
    let { data } = await witnessService.listWitnessLinks("org-1", {}, { page: 1, limit: 20 });
    expect(data[0].status).toBe("revoked");

    mockDb.witnessInvitation.findMany.mockResolvedValue([row({ status: "USED", usedAt: new Date() })]);
    ({ data } = await witnessService.listWitnessLinks("org-1", {}, { page: 1, limit: 20 }));
    expect(data[0].status).toBe("used");

    // Status column still says ISSUED, but expiresAt has already passed —
    // no scheduled sweep ever flips this to EXPIRED, so it must be derived.
    mockDb.witnessInvitation.findMany.mockResolvedValue([
      row({ expiresAt: new Date(Date.now() - 1000) }),
    ]);
    ({ data } = await witnessService.listWitnessLinks("org-1", {}, { page: 1, limit: 20 }));
    expect(data[0].status).toBe("expired");

    mockDb.witnessInvitation.findMany.mockResolvedValue([row()]);
    ({ data } = await witnessService.listWitnessLinks("org-1", {}, { page: 1, limit: 20 }));
    expect(data[0].status).toBe("pending");
  });
});

describe("WitnessService.getWitnessLinkStats", () => {
  // getWitnessLinkStats issues 9 counts in this exact Promise.all order:
  // total, totalNewLast7Days, pending, used, usedThisMonth, usedLast7Days,
  // expired, expiredNewLast7Days, revoked.
  function mockCounts(counts: number[]) {
    const countMock = mockDb.witnessInvitation.count as jest.Mock;
    counts.forEach((n) => countMock.mockResolvedValueOnce(n));
  }

  it("scopes every count to the organization via the contract relation", async () => {
    mockCounts([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    await witnessService.getWitnessLinkStats("org-1");

    for (const call of (mockDb.witnessInvitation.count as jest.Mock).mock.calls) {
      expect(call[0].where.contract).toEqual({ organizationId: "org-1" });
    }
  });

  it("excludes revoked rows from pending/used/expired counts (isRevoked checked before status, same as deriveWitnessStatus)", async () => {
    mockCounts([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    await witnessService.getWitnessLinkStats("org-1");

    const calls = (mockDb.witnessInvitation.count as jest.Mock).mock.calls;
    // Calls 2-7 (pending, used, usedThisMonth, usedLast7Days, expired,
    // expiredNewLast7Days) must all exclude revoked rows explicitly.
    for (const call of calls.slice(2, 8)) {
      expect(call[0].where.isRevoked).toBe(false);
    }
    // The final call (revoked) counts isRevoked: true rows specifically.
    expect(calls[8][0].where.isRevoked).toBe(true);
  });

  it("splits pending/expired by expiresAt alone (status != USED), not by status: ISSUED", async () => {
    // WitnessStatus has a real EXPIRED value in the schema (seed data uses
    // it) even though the app never writes it in normal operation — expiry
    // is always derived live. Filtering pending/expired on status: "ISSUED"
    // would silently drop any row already stored as EXPIRED from both
    // buckets, undercounting relative to total. Calls 2 (pending), 6
    // (expired), and 7 (expiredNewLast7Days) must use a not-USED exclusion,
    // never an ISSUED-only match.
    mockCounts([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    await witnessService.getWitnessLinkStats("org-1");

    const calls = (mockDb.witnessInvitation.count as jest.Mock).mock.calls;
    for (const index of [2, 6, 7]) {
      expect(calls[index][0].where.status).toEqual({ not: "USED" });
    }
  });

  it("computes active as pending + used, and returns every real count in the response", async () => {
    // total, totalNewLast7Days, pending, used, usedThisMonth, usedLast7Days,
    // expired, expiredNewLast7Days, revoked
    mockCounts([50, 5, 9, 30, 12, 4, 8, 2, 3]);

    const result = await witnessService.getWitnessLinkStats("org-1");

    expect(result).toEqual({
      total: 50,
      totalNewLast7Days: 5,
      active: 39, // 9 pending + 30 used
      pending: 9,
      used: 30,
      usedThisMonth: 12,
      usedLast7Days: 4,
      expired: 8,
      expiredNewLast7Days: 2,
      revoked: 3,
    });
  });
});
