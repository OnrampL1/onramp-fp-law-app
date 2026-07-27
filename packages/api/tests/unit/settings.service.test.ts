const mockPrisma = {
  organization: {
    findFirst: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockPrisma,
}));

import { settingsService } from "../../src/services/settings.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SettingsService.getOrganizationSettings", () => {
  it("returns organization settings for an active organization member", async () => {
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
        canManageSettings: true,
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
