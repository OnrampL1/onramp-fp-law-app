import request from "supertest";

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/dashboard.service", () => ({
  dashboardService: {
    getSummary: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken } from "@starter-kit/shared";
import { dashboardService } from "../../src/services/dashboard.service";

const mockDashboardService = dashboardService as jest.Mocked<
  typeof dashboardService
>;

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL") {
  const token = signAccessToken({ userId: "user-1", orgId: "org-1", role });
  return `accessToken=${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();

  mockDashboardService.getSummary.mockResolvedValue({
    contracts: {
      total: 0,
      legalStateCounts: {
        DRAFT: 0,
        ACTIVE: 0,
        EXPIRED: 0,
        TERMINATED: 0,
        UNSET: 0,
      },
      businessStatusCounts: {
        DRAFT: 0,
        UNDER_REVIEW: 0,
        COMPLETED: 0,
        ARCHIVED: 0,
      },
      expiringSoonCount: 0,
      recent: [],
      expiringSoon: [],
    },
  });
});

describe("GET /api/dashboard/summary", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const res = await request(app).get("/api/dashboard/summary");

    expect(res.status).toBe(401);
    expect(mockDashboardService.getSummary).not.toHaveBeenCalled();
  });

  it("uses organization scope from the authenticated token", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary?organizationId=other-org")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(200);
    expect(mockDashboardService.getSummary).toHaveBeenCalledWith("org-1");
  });

  it("allows owners, admins, and internal users to read dashboard summary", async () => {
    for (const role of ["OWNER", "ADMIN", "INTERNAL"] as const) {
      const res = await request(app)
        .get("/api/dashboard/summary")
        .set("Cookie", cookieFor(role));

      expect(res.status).toBe(200);
    }

    expect(mockDashboardService.getSummary).toHaveBeenCalledTimes(3);
  });

  it("returns the dashboard summary envelope", async () => {
    mockDashboardService.getSummary.mockResolvedValue({
      contracts: {
        total: 1,
        legalStateCounts: {
          DRAFT: 0,
          ACTIVE: 1,
          EXPIRED: 0,
          TERMINATED: 0,
          UNSET: 0,
        },
        businessStatusCounts: {
          DRAFT: 0,
          UNDER_REVIEW: 1,
          COMPLETED: 0,
          ARCHIVED: 0,
        },
        expiringSoonCount: 1,
        recent: [],
        expiringSoon: [],
      },
    });

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        contracts: {
          total: 1,
          legalStateCounts: {
            DRAFT: 0,
            ACTIVE: 1,
            EXPIRED: 0,
            TERMINATED: 0,
            UNSET: 0,
          },
          businessStatusCounts: {
            DRAFT: 0,
            UNDER_REVIEW: 1,
            COMPLETED: 0,
            ARCHIVED: 0,
          },
          expiringSoonCount: 1,
          recent: [],
          expiringSoon: [],
        },
      },
    });
  });
});
