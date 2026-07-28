const mockDb = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  contract: {
    findMany: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
}));

import { auditService } from "../../src/services/audit.service";

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.auditLog.findMany.mockResolvedValue([]);
  mockDb.auditLog.count.mockResolvedValue(0);
  mockDb.user.findMany.mockResolvedValue([]);
  mockDb.contract.findMany.mockResolvedValue([]);
});

describe("AuditService.logEvent", () => {
  it("writes through the given transaction client with actorType defaulted to USER", async () => {
    const tx = { auditLog: { create: jest.fn() } };

    await auditService.logEvent(tx as never, {
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "USER_ROLE_CHANGED",
      targetEntityType: "User",
      targetEntityId: "user-2",
      oldValue: { role: "INTERNAL" },
      newValue: { role: "ADMIN" },
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        actorType: "USER",
        actorUserId: "user-1",
        actorPlatformUserId: undefined,
        action: "USER_ROLE_CHANGED",
        targetEntityType: "User",
        targetEntityId: "user-2",
        contractId: undefined,
        witnessInvitationId: undefined,
        oldValue: { role: "INTERNAL" },
        newValue: { role: "ADMIN" },
        ipAddress: undefined,
        userAgent: undefined,
      },
    });
  });

  it("passes an explicit actorType through instead of defaulting", async () => {
    const tx = { auditLog: { create: jest.fn() } };

    await auditService.logEvent(tx as never, {
      organizationId: "org-1",
      actorType: "PLATFORM_USER",
      actorPlatformUserId: "platform-1",
      action: "PLATFORM_SUPPORT_ACCESS_GRANTED",
      targetEntityType: "Organization",
      targetEntityId: "org-1",
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorType: "PLATFORM_USER",
          actorPlatformUserId: "platform-1",
        }),
      }),
    );
  });

  it("does not touch the module-level prisma client — only the passed-in tx", async () => {
    const tx = { auditLog: { create: jest.fn() } };

    await auditService.logEvent(tx as never, {
      organizationId: "org-1",
      action: "USER_INVITED",
      targetEntityType: "Invitation",
      targetEntityId: "inv-1",
    });

    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
});

describe("AuditService.listAuditLogs", () => {
  it("always scopes the query to the given organization, even with no filters", async () => {
    await auditService.listAuditLogs("org-1", {}, { page: 1, limit: 20 });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" } }),
    );
    expect(mockDb.auditLog.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
  });

  it("adds contractId, actorUserId, and action to the where clause only when provided", async () => {
    await auditService.listAuditLogs(
      "org-1",
      { contractId: "contract-1", actorUserId: "user-1", action: "CONTRACT_UPLOADED" },
      { page: 1, limit: 20 },
    );

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          contractId: "contract-1",
          actorUserId: "user-1",
          action: "CONTRACT_UPLOADED",
        },
      }),
    );
  });

  it("builds a createdAt range from dateFrom/dateTo, independently or combined", async () => {
    const dateFrom = new Date("2026-01-01T00:00:00.000Z");
    const dateTo = new Date("2026-01-31T23:59:59.000Z");

    await auditService.listAuditLogs("org-1", { dateFrom }, { page: 1, limit: 20 });
    expect(mockDb.auditLog.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", createdAt: { gte: dateFrom } },
      }),
    );

    await auditService.listAuditLogs("org-1", { dateTo }, { page: 1, limit: 20 });
    expect(mockDb.auditLog.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", createdAt: { lte: dateTo } },
      }),
    );

    await auditService.listAuditLogs("org-1", { dateFrom, dateTo }, { page: 1, limit: 20 });
    expect(mockDb.auditLog.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          createdAt: { gte: dateFrom, lte: dateTo },
        },
      }),
    );
  });

  it("orders newest first and translates page/limit into skip/take", async () => {
    await auditService.listAuditLogs("org-1", {}, { page: 3, limit: 10 });

    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        skip: 20,
        take: 10,
      }),
    );
  });

  it("returns pagination metadata computed from the total count", async () => {
    mockDb.auditLog.count.mockResolvedValue(45);

    const result = await auditService.listAuditLogs("org-1", {}, { page: 2, limit: 20 });

    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it("resolves User and Contract target rows to display names, scoped to the org, batched per type", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([
      { id: "log-1", targetEntityType: "User", targetEntityId: "user-1" },
      { id: "log-2", targetEntityType: "User", targetEntityId: "user-2" },
      { id: "log-3", targetEntityType: "Contract", targetEntityId: "contract-1" },
      { id: "log-4", targetEntityType: "Invitation", targetEntityId: "inv-1" },
    ]);
    mockDb.user.findMany.mockResolvedValue([
      { id: "user-1", fullName: "Alice Smith" },
      { id: "user-2", fullName: "Bob Jones" },
    ]);
    mockDb.contract.findMany.mockResolvedValue([
      { id: "contract-1", title: "MSA - Acme Corp" },
    ]);

    const { data } = await auditService.listAuditLogs("org-1", {}, { page: 1, limit: 20 });

    expect(mockDb.user.findMany).toHaveBeenCalledTimes(1);
    expect(mockDb.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["user-1", "user-2"] }, organizationId: "org-1" },
      select: { id: true, fullName: true },
    });
    expect(mockDb.contract.findMany).toHaveBeenCalledTimes(1);
    expect(mockDb.contract.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["contract-1"] }, organizationId: "org-1" },
      select: { id: true, title: true },
    });

    expect(data).toEqual([
      expect.objectContaining({ id: "log-1", targetDisplayName: "Alice Smith" }),
      expect.objectContaining({ id: "log-2", targetDisplayName: "Bob Jones" }),
      expect.objectContaining({ id: "log-3", targetDisplayName: "MSA - Acme Corp" }),
      expect.objectContaining({ id: "log-4", targetDisplayName: null }),
    ]);
  });

  it("does not call any resolver when the page has no resolvable target types", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([
      { id: "log-1", targetEntityType: "Invitation", targetEntityId: "inv-1" },
    ]);

    const { data } = await auditService.listAuditLogs("org-1", {}, { page: 1, limit: 20 });

    expect(mockDb.user.findMany).not.toHaveBeenCalled();
    expect(mockDb.contract.findMany).not.toHaveBeenCalled();
    expect(data).toEqual([
      expect.objectContaining({ id: "log-1", targetDisplayName: null }),
    ]);
  });
});
