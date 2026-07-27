import request from "supertest";

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/settings.service", () => ({
  settingsService: {
    getOrganizationSettings: jest.fn(),
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
