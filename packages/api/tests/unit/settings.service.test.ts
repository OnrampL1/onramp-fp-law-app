const mockPrisma = {
  organization: {
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    update: jest.fn(),
  },
  organizationSettings: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: typeof mockPrisma) => unknown) =>
    cb(mockPrisma),
  ),
};

const mockGetPresignedUrl = jest.fn();
const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockPrisma,
  isAdminRole: (role: string) => role === "OWNER" || role === "ADMIN",
  isOwnerRole: (role: string) => role === "OWNER",
  getPresignedUrl: (...args: unknown[]) => mockGetPresignedUrl(...args),
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

import { settingsService } from "../../src/services/settings.service";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function buildLogoFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  const buffer = Buffer.concat([PNG_SIGNATURE, Buffer.from([0, 0, 0, 0])]);

  return {
    originalname: "logo.png",
    mimetype: "image/png",
    size: buffer.length,
    buffer,
    ...overrides,
  } as Express.Multer.File;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPresignedUrl.mockResolvedValue(
    "https://storage.example.com/signed-logo-url",
  );
});

describe("SettingsService.getOrganizationSettings", () => {
  it("returns organization settings for an active Admin, with manage true and rename false", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "America/New_York",
        language: "en",
        logoStorageKey: "organization-logos/org-1/abc-logo.png",
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

    const result = await settingsService.getOrganizationSettings({
      userId: "user-1",
      organizationId: "org-1",
      role: "ADMIN",
    });

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

    expect(mockGetPresignedUrl).toHaveBeenCalledWith(
      "organization-logos/org-1/abc-logo.png",
      900,
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
        logoUrl: "https://storage.example.com/signed-logo-url",
        logoUrlExpiresInSeconds: 900,
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
        canRenameOrganization: false,
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

    const result = await settingsService.getOrganizationSettings({
      userId: "user-1",
      organizationId: "org-1",
      role: "INTERNAL",
    });

    expect(mockGetPresignedUrl).not.toHaveBeenCalled();
    expect(result.settings).toEqual({
      timezone: "UTC",
      language: "en",
      logoUrl: null,
      logoUrlExpiresInSeconds: null,
      notificationPreferences: null,
      branding: null,
    });
    expect(result.permissions.canManageSettings).toBe(false);
    expect(result.permissions.canRenameOrganization).toBe(false);
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

    const result = await settingsService.getOrganizationSettings({
      userId: "owner-1",
      organizationId: "org-1",
      role: "OWNER",
    });

    expect(result.permissions.canManageSettings).toBe(true);
    expect(result.permissions.canRenameOrganization).toBe(true);
  });

  it("throws 404 when the user is not an active member of the organization", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue(null);

    await expect(
      settingsService.getOrganizationSettings({
        userId: "user-1",
        organizationId: "org-1",
        role: "ADMIN",
      }),
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
      settingsService.getOrganizationSettings({
        userId: "user-1",
        organizationId: "org-1",
        role: "ADMIN",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows the assigned owner to read settings while OWNER_ASSIGNED", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "OWNER_ASSIGNED",
      ownerUserId: "owner-1",
      settings: null,
      members: [{ role: "OWNER" }],
    });

    const result = await settingsService.getOrganizationSettings({
      userId: "owner-1",
      organizationId: "org-1",
      role: "OWNER",
    });

    expect(result.organization.status).toBe("OWNER_ASSIGNED");
  });

  it("throws 403 for a non-owner while the organization is OWNER_ASSIGNED", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "OWNER_ASSIGNED",
      ownerUserId: "owner-1",
      settings: null,
      members: [{ role: "ADMIN" }],
    });

    await expect(
      settingsService.getOrganizationSettings({
        userId: "admin-1",
        organizationId: "org-1",
        role: "ADMIN",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("SettingsService.updateOrganizationSettings", () => {
  // Owners and Admins can edit general organization settings, but only the
  // Owner can rename the organization.
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

  it("rejects ADMIN users when they try to rename the organization", async () => {
    await expect(
      settingsService.updateOrganizationSettings(
        { ...actor, role: "ADMIN" },
        { name: "New Name" },
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockPrisma.organization.findFirst).not.toHaveBeenCalled();
  });

  it("allows ADMIN users to update general organization settings without renaming", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Old Name",
      slug: "old-name",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: null,
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    mockPrisma.organization.findFirstOrThrow.mockResolvedValue({
      id: "org-1",
      name: "Old Name",
      slug: "old-name",
      status: "ACTIVE",
      settings: {
        timezone: "Asia/Beirut",
        language: "en",
        logoStorageKey: null,
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    const result = await settingsService.updateOrganizationSettings(
      { ...actor, role: "ADMIN" },
      { timezone: "Asia/Beirut" },
      {},
    );

    expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    expect(mockPrisma.organizationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        update: expect.objectContaining({ timezone: "Asia/Beirut" }),
      }),
    );
    expect(result.permissions).toEqual({
      canManageSettings: true,
      canRenameOrganization: false,
    });
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
        logoStorageKey: null,
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
        logoStorageKey: null,
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

  it("merges a partial notificationPreferences update with the existing value instead of replacing it", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Old Name",
      slug: "old-name",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: null,
        notificationPreferences: {
          contractUpdates: false,
          riskAlerts: false,
          aiInsights: false,
        },
        branding: null,
      },
      members: [{ role: "OWNER" }],
    });

    mockPrisma.organization.findFirstOrThrow.mockResolvedValue({
      id: "org-1",
      name: "Old Name",
      slug: "old-name",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: null,
        notificationPreferences: {
          contractUpdates: false,
          riskAlerts: true,
          aiInsights: false,
        },
        branding: null,
      },
      members: [{ role: "OWNER" }],
    });

    await settingsService.updateOrganizationSettings(
      actor,
      { notificationPreferences: { riskAlerts: true } },
      {},
    );

    expect(mockPrisma.organizationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          notificationPreferences: {
            contractUpdates: false,
            riskAlerts: true,
            aiInsights: false,
          },
        }),
      }),
    );
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

describe("SettingsService.uploadOrganizationLogo", () => {
  const actor = {
    userId: "owner-1",
    organizationId: "org-1",
    role: "ADMIN" as const,
  };

  it("rejects INTERNAL users", async () => {
    await expect(
      settingsService.uploadOrganizationLogo(
        { ...actor, role: "INTERNAL" },
        buildLogoFile(),
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("rejects when no file is provided", async () => {
    await expect(
      settingsService.uploadOrganizationLogo(actor, undefined, {}),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("rejects a file whose contents do not match its extension", async () => {
    await expect(
      settingsService.uploadOrganizationLogo(
        actor,
        buildLogoFile({ buffer: Buffer.from("not a real png") }),
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("uploads a new logo, replaces the previous one, and writes an audit log", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: "organization-logos/org-1/old-logo.png",
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    mockPrisma.organization.findFirstOrThrow.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: "organization-logos/org-1/new-logo.png",
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    const result = await settingsService.uploadOrganizationLogo(
      actor,
      buildLogoFile(),
      { ipAddress: "127.0.0.1" },
    );

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/^organization-logos\/org-1\/.+-logo\.png$/),
      expect.any(Buffer),
      "image/png",
    );

    expect(mockPrisma.organizationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        update: expect.objectContaining({
          logoStorageKey: expect.stringMatching(/^organization-logos\/org-1\//),
        }),
      }),
    );

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ORGANIZATION_LOGO_UPLOADED",
          oldValue: {
            logoStorageKey: "organization-logos/org-1/old-logo.png",
          },
        }),
      }),
    );

    expect(mockDeleteFile).toHaveBeenCalledWith(
      "organization-logos/org-1/old-logo.png",
    );

    expect(result.settings.logoUrl).toBe(
      "https://storage.example.com/signed-logo-url",
    );
  });

  it("does not attempt to delete a previous logo when none exists", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: null,
      members: [{ role: "ADMIN" }],
    });

    mockPrisma.organization.findFirstOrThrow.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: "organization-logos/org-1/new-logo.png",
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    await settingsService.uploadOrganizationLogo(actor, buildLogoFile(), {});

    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("throws 502 when storage upload fails", async () => {
    mockUploadFile.mockRejectedValue(new Error("storage unreachable"));

    await expect(
      settingsService.uploadOrganizationLogo(actor, buildLogoFile(), {}),
    ).rejects.toMatchObject({ statusCode: 502 });

    expect(mockPrisma.organizationSettings.upsert).not.toHaveBeenCalled();
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
      settingsService.uploadOrganizationLogo(actor, buildLogoFile(), {}),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("SettingsService.deleteOrganizationLogo", () => {
  const actor = {
    userId: "owner-1",
    organizationId: "org-1",
    role: "ADMIN" as const,
  };

  it("rejects INTERNAL users", async () => {
    await expect(
      settingsService.deleteOrganizationLogo(
        { ...actor, role: "INTERNAL" },
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("throws 404 when the organization has no logo", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: null,
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    await expect(
      settingsService.deleteOrganizationLogo(actor, {}),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("deletes the stored logo, clears the key, and writes an audit log", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: "organization-logos/org-1/old-logo.png",
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    mockPrisma.organization.findFirstOrThrow.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: null,
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    const result = await settingsService.deleteOrganizationLogo(actor, {
      ipAddress: "127.0.0.1",
    });

    expect(mockDeleteFile).toHaveBeenCalledWith(
      "organization-logos/org-1/old-logo.png",
    );

    expect(mockPrisma.organizationSettings.update).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      data: { logoStorageKey: null },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ORGANIZATION_LOGO_DELETED",
          oldValue: {
            logoStorageKey: "organization-logos/org-1/old-logo.png",
          },
          newValue: { logoStorageKey: null },
        }),
      }),
    );

    expect(result.settings.logoUrl).toBeNull();
  });

  it("throws 502 when storage deletion fails and leaves the settings row untouched", async () => {
    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      settings: {
        timezone: "UTC",
        language: "en",
        logoStorageKey: "organization-logos/org-1/old-logo.png",
        notificationPreferences: null,
        branding: null,
      },
      members: [{ role: "ADMIN" }],
    });

    mockDeleteFile.mockRejectedValue(new Error("storage unreachable"));

    await expect(
      settingsService.deleteOrganizationLogo(actor, {}),
    ).rejects.toMatchObject({ statusCode: 502 });

    expect(mockPrisma.organizationSettings.update).not.toHaveBeenCalled();
  });
});
