import request from "supertest";

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/settings.service", () => ({
  settingsService: {
    getOrganizationSettings: jest.fn(),
    updateOrganizationSettings: jest.fn(),
    uploadOrganizationLogo: jest.fn(),
    deleteOrganizationLogo: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken } from "@starter-kit/shared";
import { settingsService } from "../../src/services/settings.service";

const mockSettingsService = settingsService as jest.Mocked<
  typeof settingsService
>;

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL") {
  const token = signAccessToken({ userId: "user-1", orgId: "org-1", role });
  return `accessToken=${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/settings/organization", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/settings/organization");

    expect(res.status).toBe(401);
    expect(mockSettingsService.getOrganizationSettings).not.toHaveBeenCalled();
  });

  it("returns organization settings for an authenticated user", async () => {
    mockSettingsService.getOrganizationSettings.mockResolvedValue({
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "ACTIVE",
      },
      settings: {
        timezone: "UTC",
        language: "en",
        logoUrl: null,
        notificationPreferences: null,
        branding: null,
      },
      permissions: {
        canManageSettings: false,
        canRenameOrganization: false,
      },
    });

    const res = await request(app)
      .get("/api/settings/organization")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(200);
    expect(mockSettingsService.getOrganizationSettings).toHaveBeenCalledWith(
      "user-1",
      "org-1",
    );
    expect(res.body.data.organization.id).toBe("org-1");
  });

  it("does not accept organization scope from the request query", async () => {
    mockSettingsService.getOrganizationSettings.mockResolvedValue({
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "ACTIVE",
      },
      settings: {
        timezone: "UTC",
        language: "en",
        logoUrl: null,
        notificationPreferences: null,
        branding: null,
      },
      permissions: {
        canManageSettings: true,
        canRenameOrganization: false,
      },
    });

    const res = await request(app)
      .get("/api/settings/organization?organizationId=other-org")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(mockSettingsService.getOrganizationSettings).toHaveBeenCalledWith(
      "user-1",
      "org-1",
    );
  });
});

describe("PUT /api/settings/organization", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app)
      .put("/api/settings/organization")
      .send({ name: "New Name" });

    expect(res.status).toBe(401);
    expect(
      mockSettingsService.updateOrganizationSettings,
    ).not.toHaveBeenCalled();
  });

  it("returns 403 for INTERNAL users", async () => {
    const res = await request(app)
      .put("/api/settings/organization")
      .set("Cookie", cookieFor("INTERNAL"))
      .send({ name: "New Name" });

    expect(res.status).toBe(403);
    expect(
      mockSettingsService.updateOrganizationSettings,
    ).not.toHaveBeenCalled();
  });

  it("allows ADMIN users to update general organization settings", async () => {
    mockSettingsService.updateOrganizationSettings.mockResolvedValue({
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "ACTIVE",
      },
      settings: {
        timezone: "Asia/Beirut",
        language: "en",
        logoUrl: null,
        notificationPreferences: null,
        branding: null,
      },
      permissions: {
        canManageSettings: true,
        canRenameOrganization: false,
      },
    });

    const res = await request(app)
      .put("/api/settings/organization")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ timezone: "Asia/Beirut" });

    expect(res.status).toBe(200);
    expect(mockSettingsService.updateOrganizationSettings).toHaveBeenCalledWith(
      {
        userId: "user-1",
        organizationId: "org-1",
        role: "ADMIN",
      },
      { timezone: "Asia/Beirut" },
      expect.objectContaining({
        ipAddress: expect.any(String),
      }),
    );
  });

  it("returns 422 for unsupported fields", async () => {
    const res = await request(app)
      .put("/api/settings/organization")
      .set("Cookie", cookieFor("OWNER"))
      .send({ contactEmail: "ops@example.com" });

    expect(res.status).toBe(422);
    expect(
      mockSettingsService.updateOrganizationSettings,
    ).not.toHaveBeenCalled();
  });

  it("returns 422 for invalid timezone", async () => {
    const res = await request(app)
      .put("/api/settings/organization")
      .set("Cookie", cookieFor("OWNER"))
      .send({ timezone: "Not/AZone" });

    expect(res.status).toBe(422);
    expect(
      mockSettingsService.updateOrganizationSettings,
    ).not.toHaveBeenCalled();
  });

  it("updates settings for OWNER users using token organization scope", async () => {
    mockSettingsService.updateOrganizationSettings.mockResolvedValue({
      organization: {
        id: "org-1",
        name: "New Name",
        slug: "acme-legal",
        status: "ACTIVE",
      },
      settings: {
        timezone: "Asia/Beirut",
        language: "fr",
        logoUrl: null,
        notificationPreferences: {
          contractUpdates: true,
        },
        branding: null,
      },
      permissions: {
        canManageSettings: true,
        canRenameOrganization: true,
      },
    });

    const res = await request(app)
      .put("/api/settings/organization?organizationId=other-org")
      .set("Cookie", cookieFor("OWNER"))
      .set("User-Agent", "jest")
      .send({
        name: "New Name",
        timezone: "Asia/Beirut",
        language: "fr",
        notificationPreferences: {
          contractUpdates: true,
        },
      });

    expect(res.status).toBe(200);
    expect(mockSettingsService.updateOrganizationSettings).toHaveBeenCalledWith(
      {
        userId: "user-1",
        organizationId: "org-1",
        role: "OWNER",
      },
      {
        name: "New Name",
        timezone: "Asia/Beirut",
        language: "fr",
        notificationPreferences: {
          contractUpdates: true,
        },
      },
      expect.objectContaining({
        ipAddress: expect.any(String),
        userAgent: "jest",
      }),
    );
    expect(res.body.data.organization.name).toBe("New Name");
  });
});

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PNG_BUFFER = Buffer.concat([PNG_SIGNATURE, Buffer.from([0, 0, 0, 0])]);

describe("POST /api/settings/organization/logo", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app)
      .post("/api/settings/organization/logo")
      .attach("file", PNG_BUFFER, "logo.png");

    expect(res.status).toBe(401);
    expect(mockSettingsService.uploadOrganizationLogo).not.toHaveBeenCalled();
  });

  it("returns 403 for INTERNAL users", async () => {
    const res = await request(app)
      .post("/api/settings/organization/logo")
      .set("Cookie", cookieFor("INTERNAL"))
      .attach("file", PNG_BUFFER, "logo.png");

    expect(res.status).toBe(403);
    expect(mockSettingsService.uploadOrganizationLogo).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types before reaching the service", async () => {
    const res = await request(app)
      .post("/api/settings/organization/logo")
      .set("Cookie", cookieFor("ADMIN"))
      .attach("file", Buffer.from("<svg></svg>"), "logo.svg");

    expect(res.status).toBe(422);
    expect(mockSettingsService.uploadOrganizationLogo).not.toHaveBeenCalled();
  });

  it("allows ADMIN users to upload a logo", async () => {
    mockSettingsService.uploadOrganizationLogo.mockResolvedValue({
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "ACTIVE",
      },
      settings: {
        timezone: "UTC",
        language: "en",
        logoUrl: "https://storage.example.com/signed-logo-url",
        logoUrlExpiresInSeconds: 900,
        notificationPreferences: null,
        branding: null,
      },
      permissions: {
        canManageSettings: true,
        canRenameOrganization: false,
      },
    });

    const res = await request(app)
      .post("/api/settings/organization/logo")
      .set("Cookie", cookieFor("ADMIN"))
      .attach("file", PNG_BUFFER, "logo.png");

    expect(res.status).toBe(200);
    expect(mockSettingsService.uploadOrganizationLogo).toHaveBeenCalledWith(
      { userId: "user-1", organizationId: "org-1", role: "ADMIN" },
      expect.objectContaining({ originalname: "logo.png" }),
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
    expect(res.body.data.settings.logoUrl).toBe(
      "https://storage.example.com/signed-logo-url",
    );
  });
});

describe("DELETE /api/settings/organization/logo", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).delete("/api/settings/organization/logo");

    expect(res.status).toBe(401);
    expect(mockSettingsService.deleteOrganizationLogo).not.toHaveBeenCalled();
  });

  it("returns 403 for INTERNAL users", async () => {
    const res = await request(app)
      .delete("/api/settings/organization/logo")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
    expect(mockSettingsService.deleteOrganizationLogo).not.toHaveBeenCalled();
  });

  it("allows ADMIN users to delete the logo", async () => {
    mockSettingsService.deleteOrganizationLogo.mockResolvedValue({
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "ACTIVE",
      },
      settings: {
        timezone: "UTC",
        language: "en",
        logoUrl: null,
        logoUrlExpiresInSeconds: null,
        notificationPreferences: null,
        branding: null,
      },
      permissions: {
        canManageSettings: true,
        canRenameOrganization: false,
      },
    });

    const res = await request(app)
      .delete("/api/settings/organization/logo")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(mockSettingsService.deleteOrganizationLogo).toHaveBeenCalledWith(
      { userId: "user-1", organizationId: "org-1", role: "ADMIN" },
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
    expect(res.body.data.settings.logoUrl).toBeNull();
  });
});
