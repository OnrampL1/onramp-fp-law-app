import request from "supertest";

const mockPrisma = {
  platformUser: {
    findUnique: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  getPrismaClient: jest.fn(() => mockPrisma),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/access-request.service", () => ({
  accessRequestService: {
    listAccessRequests: jest.fn(),
    getAccessRequest: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken, signPlatformAccessToken } from "@starter-kit/shared";
import { accessRequestService } from "../../src/services/access-request.service";

const mockAccessRequestService = accessRequestService as jest.Mocked<
  typeof accessRequestService
>;

function platformCookieFor(role: "SUPER_ADMIN" | "SUPPORT_ENGINEER") {
  const token = signPlatformAccessToken({
    platformUserId: "platform-1",
    role,
  });

  return `platformAccessToken=${token}`;
}

function orgCookie() {
  const token = signAccessToken({
    userId: "user-1",
    orgId: "org-1",
    role: "OWNER",
  });

  return `accessToken=${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();

  mockPrisma.platformUser.findUnique.mockResolvedValue({
    id: "platform-1",
    email: "platform.admin@clausio.local",
    fullName: "Platform Admin",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
  });

  mockAccessRequestService.listAccessRequests.mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });

  mockAccessRequestService.getAccessRequest.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000501",
    contactFirstName: "Alex",
    contactLastName: "Morgan",
    contactEmail: "alex@example.com",
    organizationName: "Acme Legal Ops",
    websiteUrl: "https://acme.example",
    companySize: "ELEVEN_TO_FIFTY",
    country: "Lebanon",
    intendedUse: "We want to manage legal contracts in one secure workspace.",
    notes: "Mostly vendor agreements.",
    status: "PENDING",
    reviewedAt: null,
    declineReason: null,
    organization: null,
    reviewedByPlatformUser: null,
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
  });
});

describe("platform access request routes", () => {
  it("requires platform authentication to list requests", async () => {
    const res = await request(app).get("/api/platform/access-requests");

    expect(res.status).toBe(401);
    expect(mockAccessRequestService.listAccessRequests).not.toHaveBeenCalled();
  });

  it("rejects normal organization-user tokens", async () => {
    const res = await request(app)
      .get("/api/platform/access-requests")
      .set("Cookie", orgCookie());

    expect(res.status).toBe(401);
    expect(mockAccessRequestService.listAccessRequests).not.toHaveBeenCalled();
  });

  it("allows SUPER_ADMIN to list access requests", async () => {
    const res = await request(app)
      .get("/api/platform/access-requests")
      .set("Cookie", platformCookieFor("SUPER_ADMIN"));

    expect(res.status).toBe(200);
    expect(mockAccessRequestService.listAccessRequests).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it("allows SUPPORT_ENGINEER to list access requests", async () => {
    mockPrisma.platformUser.findUnique.mockResolvedValue({
      id: "platform-2",
      email: "support@clausio.local",
      fullName: "Support Engineer",
      role: "SUPPORT_ENGINEER",
      status: "ACTIVE",
    });

    const res = await request(app)
      .get("/api/platform/access-requests")
      .set("Cookie", platformCookieFor("SUPPORT_ENGINEER"));

    expect(res.status).toBe(200);
  });

  it("validates list filters", async () => {
    const res = await request(app)
      .get("/api/platform/access-requests")
      .query({ status: "INVALID" })
      .set("Cookie", platformCookieFor("SUPER_ADMIN"));

    expect(res.status).toBe(422);
    expect(mockAccessRequestService.listAccessRequests).not.toHaveBeenCalled();
  });

  it("allows Platform Users to view one access request", async () => {
    const res = await request(app)
      .get("/api/platform/access-requests/00000000-0000-4000-8000-000000000501")
      .set("Cookie", platformCookieFor("SUPER_ADMIN"));

    expect(res.status).toBe(200);
    expect(mockAccessRequestService.getAccessRequest).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000501",
    );
  });

  it("validates request id params", async () => {
    const res = await request(app)
      .get("/api/platform/access-requests/not-a-uuid")
      .set("Cookie", platformCookieFor("SUPER_ADMIN"));

    expect(res.status).toBe(422);
    expect(mockAccessRequestService.getAccessRequest).not.toHaveBeenCalled();
  });
});
