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

jest.mock("../../src/services/platform-organization.service", () => ({
  platformOrganizationService: {
    listOrganizations: jest.fn(),
    getOrganization: jest.fn(),
    createOrganization: jest.fn(),
    assignFirstOwner: jest.fn(),
    updateOrganizationStatus: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken, signPlatformAccessToken } from "@starter-kit/shared";
import { platformOrganizationService } from "../../src/services/platform-organization.service";

const mockPlatformOrganizationService =
  platformOrganizationService as jest.Mocked<
    typeof platformOrganizationService
  >;

function platformCookieFor(role: "SUPER_ADMIN" | "SUPPORT_ENGINEER") {
  const token = signPlatformAccessToken({
    platformUserId: "platform-1",
    role,
  });

  return `accessToken=${token}`;
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

  mockPlatformOrganizationService.listOrganizations.mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });

  mockPlatformOrganizationService.getOrganization.mockResolvedValue({
    id: "org-1",
    name: "Acme",
    slug: "acme",
    status: "ACTIVE",
    ownerAssignedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: null,
    counts: {
      members: 0,
      invitations: 0,
      contracts: 0,
      auditLogs: 0,
    },
  });

  mockPlatformOrganizationService.createOrganization.mockResolvedValue({
    id: "org-1",
    name: "Acme",
    slug: "acme",
    status: "CREATED",
    ownerAssignedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: null,
    counts: {
      members: 0,
      invitations: 0,
      contracts: 0,
      auditLogs: 0,
    },
  });

  mockPlatformOrganizationService.assignFirstOwner.mockResolvedValue({
    id: "org-1",
    name: "Acme",
    slug: "acme",
    status: "OWNER_ASSIGNED",
    ownerAssignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: {
      id: "owner-1",
      email: "owner@acme.test",
      fullName: "Owner User",
      role: "OWNER",
      status: "ACTIVE",
    },
    counts: {
      members: 1,
      invitations: 0,
      contracts: 0,
      auditLogs: 1,
    },
  });

  mockPlatformOrganizationService.updateOrganizationStatus.mockResolvedValue({
    id: "org-1",
    name: "Acme",
    slug: "acme",
    status: "ACTIVE",
    ownerAssignedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: {
      id: "owner-1",
      email: "owner@acme.test",
      fullName: "Owner User",
      role: "OWNER",
      status: "ACTIVE",
    },
    counts: {
      members: 1,
      invitations: 0,
      contracts: 0,
      auditLogs: 2,
    },
  });
});

describe("platform organization routes", () => {
  it("requires platform authentication", async () => {
    const res = await request(app).get("/api/platform/organizations");

    expect(res.status).toBe(401);
    expect(
      mockPlatformOrganizationService.listOrganizations,
    ).not.toHaveBeenCalled();
  });

  it("rejects normal organization-user tokens", async () => {
    const res = await request(app)
      .get("/api/platform/organizations")
      .set("Cookie", orgCookie());

    expect(res.status).toBe(401);
    expect(
      mockPlatformOrganizationService.listOrganizations,
    ).not.toHaveBeenCalled();
  });

  it("allows SUPPORT_ENGINEER to list organizations", async () => {
    mockPrisma.platformUser.findUnique.mockResolvedValue({
      id: "platform-2",
      email: "support@clausio.local",
      fullName: "Support Engineer",
      role: "SUPPORT_ENGINEER",
      status: "ACTIVE",
    });

    const res = await request(app)
      .get("/api/platform/organizations")
      .set("Cookie", platformCookieFor("SUPPORT_ENGINEER"));

    expect(res.status).toBe(200);
    expect(
      mockPlatformOrganizationService.listOrganizations,
    ).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it("allows SUPER_ADMIN to create organizations", async () => {
    const res = await request(app)
      .post("/api/platform/organizations")
      .set("Cookie", platformCookieFor("SUPER_ADMIN"))
      .send({
        name: "Acme Legal",
        slug: "acme-legal",
        timezone: "UTC",
        language: "en",
      });

    expect(res.status).toBe(201);
    expect(
      mockPlatformOrganizationService.createOrganization,
    ).toHaveBeenCalledWith(
      { id: "platform-1" },
      {
        name: "Acme Legal",
        slug: "acme-legal",
        timezone: "UTC",
        language: "en",
      },
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
  });

  it("denies SUPPORT_ENGINEER from creating organizations", async () => {
    mockPrisma.platformUser.findUnique.mockResolvedValue({
      id: "platform-2",
      email: "support@clausio.local",
      fullName: "Support Engineer",
      role: "SUPPORT_ENGINEER",
      status: "ACTIVE",
    });

    const res = await request(app)
      .post("/api/platform/organizations")
      .set("Cookie", platformCookieFor("SUPPORT_ENGINEER"))
      .send({
        name: "Acme Legal",
        slug: "acme-legal",
      });

    expect(res.status).toBe(403);
    expect(
      mockPlatformOrganizationService.createOrganization,
    ).not.toHaveBeenCalled();
  });

  it("validates create organization body", async () => {
    const res = await request(app)
      .post("/api/platform/organizations")
      .set("Cookie", platformCookieFor("SUPER_ADMIN"))
      .send({
        name: "A",
        slug: "Bad Slug!",
      });

    expect(res.status).toBe(422);
    expect(
      mockPlatformOrganizationService.createOrganization,
    ).not.toHaveBeenCalled();
  });

  it("allows SUPER_ADMIN to assign the first owner", async () => {
    const res = await request(app)
      .post(
        "/api/platform/organizations/00000000-0000-4000-8000-000000000001/owner",
      )
      .set("Cookie", platformCookieFor("SUPER_ADMIN"))
      .send({
        email: "owner@acme.test",
        fullName: "Owner User",
        password: "Password123!",
      });

    expect(res.status).toBe(200);
    expect(mockPlatformOrganizationService.assignFirstOwner).toHaveBeenCalled();
  });

  it("allows SUPER_ADMIN to update organization status", async () => {
    const res = await request(app)
      .patch(
        "/api/platform/organizations/00000000-0000-4000-8000-000000000001/status",
      )
      .set("Cookie", platformCookieFor("SUPER_ADMIN"))
      .send({ status: "ACTIVE" });

    expect(res.status).toBe(200);
    expect(
      mockPlatformOrganizationService.updateOrganizationStatus,
    ).toHaveBeenCalled();
  });

  it("rejects unsupported lifecycle target statuses", async () => {
    const res = await request(app)
      .patch(
        "/api/platform/organizations/00000000-0000-4000-8000-000000000001/status",
      )
      .set("Cookie", platformCookieFor("SUPER_ADMIN"))
      .send({ status: "CREATED" });

    expect(res.status).toBe(422);
    expect(
      mockPlatformOrganizationService.updateOrganizationStatus,
    ).not.toHaveBeenCalled();
  });
});
