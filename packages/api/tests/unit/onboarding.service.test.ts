const mockPrisma = {
  organization: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  organizationSettings: {
    upsert: jest.fn(),
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
}));

import { onboardingService } from "../../src/services/onboarding.service";

const ownerActor = {
  userId: "owner-1",
  organizationId: "org-1",
  role: "OWNER" as const,
};

const adminActor = {
  userId: "admin-1",
  organizationId: "org-1",
  role: "ADMIN" as const,
};

function organizationRow(overrides = {}) {
  return {
    id: "org-1",
    name: "Acme Legal",
    slug: "acme-legal",
    status: "OWNER_ASSIGNED",
    ownerUserId: "owner-1",
    settings: {
      timezone: "UTC",
      language: "en",
      notificationPreferences: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("OnboardingService.getOrganizationOnboarding", () => {
  it("returns onboarding state for the assigned owner of an owner-assigned organization", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(organizationRow());

    const result =
      await onboardingService.getOrganizationOnboarding(ownerActor);

    expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org-1" },
      include: { settings: true },
    });

    expect(result).toEqual({
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "OWNER_ASSIGNED",
        onboardingRequired: true,
      },
      settings: {
        timezone: "UTC",
        language: "en",
        notificationPreferences: null,
      },
      permissions: {
        canCompleteOnboarding: true,
      },
    });
  });

  it("rejects non-owner members while onboarding is incomplete", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(organizationRow());

    await expect(
      onboardingService.getOrganizationOnboarding(adminActor),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Organization is not active",
    });
  });

  it("returns completed onboarding state for active organizations", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(
      organizationRow({
        status: "ACTIVE",
      }),
    );

    const result =
      await onboardingService.getOrganizationOnboarding(adminActor);

    expect(result.organization.status).toBe("ACTIVE");
    expect(result.organization.onboardingRequired).toBe(false);
    expect(result.permissions.canCompleteOnboarding).toBe(false);
  });
});

describe("OnboardingService.completeOrganizationOnboarding", () => {
  it("saves organization setup, activates the organization, and writes audit logs", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(organizationRow());

    mockPrisma.organization.findUniqueOrThrow.mockResolvedValue(
      organizationRow({
        name: "Acme Legal Ops",
        status: "ACTIVE",
        settings: {
          timezone: "Asia/Beirut",
          language: "fr",
          notificationPreferences: {
            contractUpdates: true,
            riskAlerts: false,
            aiInsights: true,
          },
        },
      }),
    );

    const result = await onboardingService.completeOrganizationOnboarding(
      ownerActor,
      {
        name: "Acme Legal Ops",
        timezone: "Asia/Beirut",
        language: "fr",
        notificationPreferences: {
          contractUpdates: true,
          riskAlerts: false,
          aiInsights: true,
        },
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      },
    );

    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: {
        name: "Acme Legal Ops",
        status: "ACTIVE",
      },
    });

    expect(mockPrisma.organizationSettings.upsert).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      update: {
        timezone: "Asia/Beirut",
        language: "fr",
        notificationPreferences: {
          contractUpdates: true,
          riskAlerts: false,
          aiInsights: true,
        },
      },
      create: {
        organizationId: "org-1",
        timezone: "Asia/Beirut",
        language: "fr",
        notificationPreferences: {
          contractUpdates: true,
          riskAlerts: false,
          aiInsights: true,
        },
      },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          actorType: "USER",
          actorUserId: "owner-1",
          action: "ORGANIZATION_SETTINGS_UPDATED",
          oldValue: expect.objectContaining({
            name: "Acme Legal",
            timezone: "UTC",
            language: "en",
          }),
          newValue: expect.objectContaining({
            name: "Acme Legal Ops",
            timezone: "Asia/Beirut",
            language: "fr",
          }),
          ipAddress: "127.0.0.1",
          userAgent: "jest",
        }),
      }),
    );

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          actorType: "USER",
          actorUserId: "owner-1",
          action: "ORGANIZATION_ACTIVATED",
          oldValue: { status: "OWNER_ASSIGNED" },
          newValue: {
            status: "ACTIVE",
            source: "OWNER_ONBOARDING",
          },
          ipAddress: "127.0.0.1",
          userAgent: "jest",
        }),
      }),
    );

    expect(result.organization.status).toBe("ACTIVE");
    expect(result.organization.onboardingRequired).toBe(false);
    expect(result.permissions.canCompleteOnboarding).toBe(false);
  });

  it("rejects completion by a non-owner", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(organizationRow());

    await expect(
      onboardingService.completeOrganizationOnboarding(adminActor, {
        name: "Acme Legal",
        timezone: "UTC",
        language: "en",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Only the assigned organization owner can complete onboarding",
    });

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    expect(mockPrisma.organizationSettings.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns active organizations without writing again when completion is submitted twice", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(
      organizationRow({
        status: "ACTIVE",
      }),
    );

    const result = await onboardingService.completeOrganizationOnboarding(
      ownerActor,
      {
        name: "Acme Legal",
        timezone: "UTC",
        language: "en",
      },
    );

    expect(result.organization.status).toBe("ACTIVE");
    expect(result.organization.onboardingRequired).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    expect(mockPrisma.organizationSettings.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects completion when the organization does not exist", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    await expect(
      onboardingService.completeOrganizationOnboarding(ownerActor, {
        name: "Acme Legal",
        timezone: "UTC",
        language: "en",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Organization not found",
    });

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
