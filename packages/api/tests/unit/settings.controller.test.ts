import request from "supertest";

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/settings.service", () => ({
  settingsService: {
    getOrganizationSettings: jest.fn(),
    updateOrganizationSettings: jest.fn(),
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

  it("returns 403 for ADMIN users — org settings are Owner-only", async () => {
    const res = await request(app)
      .put("/api/settings/organization")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ name: "New Name" });

    expect(res.status).toBe(403);
    expect(
      mockSettingsService.updateOrganizationSettings,
    ).not.toHaveBeenCalled();
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
