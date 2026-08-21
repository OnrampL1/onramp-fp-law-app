import request from "supertest";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  getPrismaClient: jest.fn(() => mockPrisma),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/onboarding.service", () => ({
  onboardingService: {
    getOrganizationOnboarding: jest.fn(),
    completeOrganizationOnboarding: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken } from "@starter-kit/shared";
import { onboardingService } from "../../src/services/onboarding.service";

const mockOnboardingService = onboardingService as jest.Mocked<
  typeof onboardingService
>;

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL" = "OWNER") {
  const token = signAccessToken({
    userId: "user-1",
    orgId: "org-1",
    role,
  });

  return `accessToken=${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();

  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: "org-1",
    role: "OWNER",
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
      ownerUserId: "user-1",
    },
  });

  mockOnboardingService.getOrganizationOnboarding.mockResolvedValue({
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

  mockOnboardingService.completeOrganizationOnboarding.mockResolvedValue({
    organization: {
      id: "org-1",
      name: "Acme Legal",
      slug: "acme-legal",
      status: "ACTIVE",
      onboardingRequired: false,
    },
    settings: {
      timezone: "Asia/Beirut",
      language: "en",
      notificationPreferences: {
        contractUpdates: true,
        riskAlerts: true,
        aiInsights: true,
      },
    },
    permissions: {
      canCompleteOnboarding: false,
    },
  });
});

describe("GET /api/onboarding/organization", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/onboarding/organization");

    expect(res.status).toBe(401);
    expect(
      mockOnboardingService.getOrganizationOnboarding,
    ).not.toHaveBeenCalled();
  });

  it("uses the authenticated user's organization scope", async () => {
    const res = await request(app)
      .get("/api/onboarding/organization?organizationId=other-org")
      .set("Cookie", cookieFor("OWNER"));

    expect(res.status).toBe(200);
    expect(
      mockOnboardingService.getOrganizationOnboarding,
    ).toHaveBeenCalledWith({
      userId: "user-1",
      organizationId: "org-1",
      role: "OWNER",
    });
  });
});

describe("POST /api/onboarding/organization/complete", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app)
      .post("/api/onboarding/organization/complete")
      .send({
        name: "Acme Legal",
        timezone: "Asia/Beirut",
        language: "en",
      });

    expect(res.status).toBe(401);
    expect(
      mockOnboardingService.completeOrganizationOnboarding,
    ).not.toHaveBeenCalled();
  });

  it("validates required onboarding fields", async () => {
    const res = await request(app)
      .post("/api/onboarding/organization/complete")
      .set("Cookie", cookieFor("OWNER"))
      .send({
        name: "",
        timezone: "Not/AZone",
        language: "de",
      });

    expect(res.status).toBe(422);
    expect(
      mockOnboardingService.completeOrganizationOnboarding,
    ).not.toHaveBeenCalled();
  });

  it("completes onboarding using token organization scope", async () => {
    const payload = {
      name: "Acme Legal",
      timezone: "Asia/Beirut",
      language: "en",
      notificationPreferences: {
        contractUpdates: true,
        riskAlerts: true,
        aiInsights: true,
      },
    };

    const res = await request(app)
      .post("/api/onboarding/organization/complete?organizationId=other-org")
      .set("Cookie", cookieFor("OWNER"))
      .set("User-Agent", "jest")
      .send(payload);

    expect(res.status).toBe(200);
    expect(
      mockOnboardingService.completeOrganizationOnboarding,
    ).toHaveBeenCalledWith(
      {
        userId: "user-1",
        organizationId: "org-1",
        role: "OWNER",
      },
      payload,
      expect.objectContaining({
        ipAddress: expect.any(String),
        userAgent: "jest",
      }),
    );
    expect(res.body.data.organization.status).toBe("ACTIVE");
  });

  it("allows the assigned owner session while the organization is OWNER_ASSIGNED", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      role: "OWNER",
      status: "ACTIVE",
      organization: {
        status: "OWNER_ASSIGNED",
        ownerUserId: "user-1",
      },
    });

    const res = await request(app)
      .post("/api/onboarding/organization/complete")
      .set("Cookie", cookieFor("OWNER"))
      .send({
        name: "Acme Legal",
        timezone: "Asia/Beirut",
        language: "en",
      });

    expect(res.status).toBe(200);
    expect(
      mockOnboardingService.completeOrganizationOnboarding,
    ).toHaveBeenCalled();
  });
});
