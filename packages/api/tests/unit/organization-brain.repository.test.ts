const mockPrisma = {
  organizationBrainItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: typeof mockPrisma) => unknown) =>
    cb(mockPrisma),
  ),
};

const mockAuditService = {
  logEvent: jest.fn(),
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockPrisma,
}));

jest.mock("../../src/services/audit.service", () => ({
  auditService: mockAuditService,
}));

import { organizationBrainRepository } from "../../src/repositories/organization-brain.repository";
import {
  ORGANIZATION_BRAIN_ITEM_DETAIL_SELECT,
  ORGANIZATION_BRAIN_ITEM_LIST_SELECT,
} from "../../src/repositories/selects/organization-brain.select";

const createInput = {
  organizationId: "org-1",
  createdByUserId: "user-1",
  title: "Vendor MSA",
  type: "TEMPLATE" as const,
  source: "UPLOAD" as const,
  storageKey: "organization-brain/org-1/file.pdf",
  fileName: "file.pdf",
  mimeType: "application/pdf",
  sizeBytes: 123,
  checksum: "checksum-1",
};

const auditInput = {
  action: "ORGANIZATION_BRAIN_ITEM_CREATED" as const,
  actorType: "USER" as const,
  actorUserId: "user-1",
  organizationId: "org-1",
  newValue: {
    title: "Vendor MSA",
  },
  ipAddress: "127.0.0.1",
  userAgent: "jest",
};

beforeEach(() => {
  jest.clearAllMocks();

  mockPrisma.organizationBrainItem.create.mockResolvedValue({
    id: "brain-1",
  });
  mockPrisma.organizationBrainItem.findMany.mockResolvedValue([]);
  mockPrisma.organizationBrainItem.count.mockResolvedValue(0);
  mockPrisma.organizationBrainItem.findFirst.mockResolvedValue(null);
  mockPrisma.organizationBrainItem.updateMany.mockResolvedValue({ count: 1 });
});

describe("organizationBrainRepository.create", () => {
  it("creates the item and writes the audit event in one transaction", async () => {
    const result = await organizationBrainRepository.create(
      createInput,
      auditInput,
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    expect(mockPrisma.organizationBrainItem.create).toHaveBeenCalledWith({
      data: createInput,
      select: ORGANIZATION_BRAIN_ITEM_LIST_SELECT,
    });

    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        organizationId: "org-1",
        actorType: "USER",
        actorUserId: "user-1",
        action: "ORGANIZATION_BRAIN_ITEM_CREATED",
        targetEntityType: "OrganizationBrainItem",
        targetEntityId: "brain-1",
        newValue: {
          title: "Vendor MSA",
        },
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      }),
    );

    expect(result).toEqual({ id: "brain-1" });
  });
});

describe("organizationBrainRepository.findMany", () => {
  it("lists only active items in the requested organization", async () => {
    await organizationBrainRepository.findMany(
      "org-1",
      {},
      { page: 1, pageSize: 20 },
    );

    expect(mockPrisma.organizationBrainItem.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        deletedAt: null,
      },
      select: ORGANIZATION_BRAIN_ITEM_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
  });

  it("adds type and title search filters when provided", async () => {
    await organizationBrainRepository.findMany(
      "org-1",
      { type: "POLICY", search: "security" },
      { page: 2, pageSize: 10 },
    );

    expect(mockPrisma.organizationBrainItem.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        deletedAt: null,
        type: "POLICY",
        title: {
          contains: "security",
          mode: "insensitive",
        },
      },
      select: ORGANIZATION_BRAIN_ITEM_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    });
  });
});

describe("organizationBrainRepository.count", () => {
  it("counts only active items in the requested organization", async () => {
    await organizationBrainRepository.count("org-1", {
      type: "CLAUSE",
      search: "liability",
    });

    expect(mockPrisma.organizationBrainItem.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        deletedAt: null,
        type: "CLAUSE",
        title: {
          contains: "liability",
          mode: "insensitive",
        },
      },
    });
  });
});

describe("organizationBrainRepository.findById", () => {
  it("requires both item id and organization id and excludes soft-deleted rows", async () => {
    await organizationBrainRepository.findById("brain-1", "org-1");

    expect(mockPrisma.organizationBrainItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: "brain-1",
        organizationId: "org-1",
        deletedAt: null,
      },
      select: ORGANIZATION_BRAIN_ITEM_DETAIL_SELECT,
    });
  });
});

describe("organizationBrainRepository.softDelete", () => {
  it("soft-deletes only an active item in the requested organization and audits it", async () => {
    const result = await organizationBrainRepository.softDelete(
      "brain-1",
      "org-1",
      {
        action: "ORGANIZATION_BRAIN_ITEM_DELETED",
        actorType: "USER",
        actorUserId: "user-1",
        organizationId: "org-1",
        oldValue: {
          title: "Vendor MSA",
        },
        newValue: {
          deletedAt: "2026-08-09T10:00:00.000Z",
        },
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      },
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    expect(mockPrisma.organizationBrainItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: "brain-1",
        organizationId: "org-1",
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });

    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        organizationId: "org-1",
        actorType: "USER",
        actorUserId: "user-1",
        action: "ORGANIZATION_BRAIN_ITEM_DELETED",
        targetEntityType: "OrganizationBrainItem",
        targetEntityId: "brain-1",
        oldValue: {
          title: "Vendor MSA",
        },
        newValue: {
          deletedAt: "2026-08-09T10:00:00.000Z",
        },
      }),
    );

    expect(result).toBe(true);
  });

  it("returns false and does not audit when no active organization-scoped row is deleted", async () => {
    mockPrisma.organizationBrainItem.updateMany.mockResolvedValue({ count: 0 });

    const result = await organizationBrainRepository.softDelete(
      "brain-1",
      "org-1",
      {
        action: "ORGANIZATION_BRAIN_ITEM_DELETED",
        organizationId: "org-1",
      },
    );

    expect(result).toBe(false);
    expect(mockAuditService.logEvent).not.toHaveBeenCalled();
  });
});
