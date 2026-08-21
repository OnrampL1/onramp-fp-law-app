const mockPrisma = {
  organization: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: typeof mockPrisma) => unknown) =>
    cb(mockPrisma),
  ),
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockPrisma,
  hashPassword: jest.fn(),
}));

import { platformOrganizationService } from "../../src/services/platform-organization.service";

const actor = { id: "platform-1" };

function organizationRow(overrides = {}) {
  return {
    id: "org-1",
    name: "Acme Legal",
    slug: "acme-legal",
    status: "SUSPENDED",
    ownerUserId: "owner-1",
    ownerAssignedAt: new Date("2026-08-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    ownerUser: {
      id: "owner-1",
      email: "owner@acme.test",
      fullName: "Owner User",
      role: "OWNER",
      status: "ACTIVE",
    },
    _count: {
      members: 1,
      invitations: 0,
      contracts: 0,
      auditLogs: 2,
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PlatformOrganizationService.updateOrganizationStatus", () => {
  it("rejects platform activation while owner onboarding is incomplete", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(
      organizationRow({
        status: "OWNER_ASSIGNED",
      }),
    );

    await expect(
      platformOrganizationService.updateOrganizationStatus(
        actor,
        "org-1",
        { status: "ACTIVE" },
        {},
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Owner onboarding must be completed before activation",
    });

    expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("still allows platform reactivation from suspended to active", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(
      organizationRow({
        status: "SUSPENDED",
      }),
    );

    mockPrisma.organization.update.mockResolvedValue(
      organizationRow({
        status: "ACTIVE",
      }),
    );

    const result = await platformOrganizationService.updateOrganizationStatus(
      actor,
      "org-1",
      { status: "ACTIVE" },
      {
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      },
    );

    expect(mockPrisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        data: { status: "ACTIVE" },
      }),
    );

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          actorType: "PLATFORM_USER",
          actorPlatformUserId: "platform-1",
          action: "ORGANIZATION_ACTIVATED",
          oldValue: { status: "SUSPENDED" },
          newValue: { status: "ACTIVE" },
        }),
      }),
    );

    expect(result.status).toBe("ACTIVE");
  });
});
