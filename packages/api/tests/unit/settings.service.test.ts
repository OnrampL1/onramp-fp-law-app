const mockPrisma = {
  organization: {
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
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
  isOwnerRole: (role: string) => role === "OWNER",
}));

import { settingsService } from "../../src/services/settings.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SettingsService.getOrganizationSettings", () => {
  it("returns organization settings for an active organization member, with canManageSettings false for a non-Owner Admin", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "America/New_York",
        language: "en",
        logoUrl: "https://example.com/logo.png",
        notificationPreferences: {
          contractUpdates: true,
          riskAlerts: false,
          aiInsights: true,
        },
        branding: {
          primaryColor: "#1E3A5F",
        },
      },
      members: [{ role: "ADMIN" }],
    });

    const result = await settingsService.getOrganizationSettings(
      "user-1",
      "org-1",
    );

    expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "org-1",
          members: {
            some: {
              id: "user-1",
              organizationId: "org-1",
              status: "ACTIVE",
            },
          },
        }),
      }),
    );

    expect(result).toEqual({
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "ACTIVE",
      },
      settings: {
        timezone: "America/New_York",
        language: "en",
        logoUrl: "https://example.com/logo.png",
        notificationPreferences: {
          contractUpdates: true,
          riskAlerts: false,
          aiInsights: true,
        },
        branding: {
          primaryColor: "#1E3A5F",
        },
      },
      permissions: {
        canManageSettings: false,
      },
    });
  });

  it("returns safe defaults when the settings row is missing", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: null,
      members: [{ role: "INTERNAL" }],
    });

    const result = await settingsService.getOrganizationSettings(
      "user-1",
      "org-1",
    );

    expect(result.settings).toEqual({
      timezone: "UTC",
      language: "en",
      logoUrl: null,
      notificationPreferences: null,
      branding: null,
    });
    expect(result.permissions.canManageSettings).toBe(false);
  });

  it("allows OWNER to manage settings", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: null,
      members: [{ role: "OWNER" }],
    });

    const result = await settingsService.getOrganizationSettings(
      "owner-1",
      "org-1",
    );

    expect(result.permissions.canManageSettings).toBe(true);
  });

  it("throws 404 when the user is not an active member of the organization", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue(null);

    await expect(
      settingsService.getOrganizationSettings("user-1", "org-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 403 when the organization is not active", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "SUSPENDED",
      settings: null,
      members: [{ role: "ADMIN" }],
    });

    await expect(
      settingsService.getOrganizationSettings("user-1", "org-1"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("SettingsService.updateOrganizationSettings", () => {
  // Owner-only (Issue 6): editing org settings is restricted to the
  // organization owner, not any Admin — so the actor used for the success
  // path here is OWNER, and ADMIN gets its own explicit rejection test below.
  const actor = {
    userId: "owner-1",
    organizationId: "org-1",
    role: "OWNER" as const,
  };

  it("rejects INTERNAL users", async () => {
    await expect(
      settingsService.updateOrganizationSettings(
        { ...actor, role: "INTERNAL" },
        { name: "New Name" },
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockPrisma.organization.findFirst).not.toHaveBeenCalled();
  });

  it("rejects ADMIN users — only the organization owner can edit org settings", async () => {
    await expect(
      settingsService.updateOrganizationSettings(
        { ...actor, role: "ADMIN" },
        { name: "New Name" },
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockPrisma.organization.findFirst).not.toHaveBeenCalled();
  });

  it("updates supported organization settings and writes an audit log when the actor is OWNER", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Old Name",
      slug: "old-name",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoUrl: null,
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "OWNER" }],
    });

    mockPrisma.organization.findFirstOrThrow.mockResolvedValue({
      id: "org-1",
      name: "New Name",
      slug: "old-name",
      status: "ACTIVE",
      settings: {
        timezone: "Asia/Beirut",
        language: "fr",
        logoUrl: null,
        notificationPreferences: {
          contractUpdates: true,
        },
        branding: null,
      },
      members: [{ role: "OWNER" }],
    });

    const result = await settingsService.updateOrganizationSettings(
      actor,
      {
        name: "New Name",
        timezone: "Asia/Beirut",
        language: "fr",
        notificationPreferences: {
          contractUpdates: true,
        },
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      },
    );

    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { name: "New Name" },
    });

    expect(mockPrisma.organizationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
      }),
    );

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          actorType: "USER",
          actorUserId: "owner-1",
          action: "ORGANIZATION_SETTINGS_UPDATED",
          targetEntityType: "Organization",
          targetEntityId: "org-1",
          oldValue: expect.objectContaining({
            name: "Old Name",
            timezone: "UTC",
            language: "en",
          }),
          newValue: expect.objectContaining({
            name: "New Name",
            timezone: "Asia/Beirut",
            language: "fr",
          }),
        }),
      }),
    );

    expect(result.organization.name).toBe("New Name");
  });

  it("throws 404 when the active member organization cannot be found", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue(null);

    await expect(
      settingsService.updateOrganizationSettings(
        actor,
        { name: "New Name" },
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 403 when the organization is suspended", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Old Name",
      slug: "old-name",
      status: "SUSPENDED",
      settings: null,
      members: [{ role: "ADMIN" }],
    });

    await expect(
      settingsService.updateOrganizationSettings(
        actor,
        { name: "New Name" },
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
