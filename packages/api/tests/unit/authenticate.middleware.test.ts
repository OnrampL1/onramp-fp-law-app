import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  getPrismaClient: jest.fn(() => mockPrisma),
  isJtiBlacklisted: jest.fn(),
}));

import { isJtiBlacklisted, signAccessToken } from "@starter-kit/shared";
import { authenticate } from "../../src/middleware/authenticate";

function cookieFor(
  userId = "user-1",
  orgId = "org-1",
  role: "OWNER" | "ADMIN" | "INTERNAL" = "OWNER",
) {
  const token = signAccessToken({ userId, orgId, role });
  return `accessToken=${token}`;
}

function buildApp() {
  const app = express();
  app.use(cookieParser());

  app.get("/api/auth/me", authenticate, (req, res) => {
    res.json({ data: req.user });
  });

  app.get("/api/onboarding/organization", authenticate, (req, res) => {
    res.json({ data: req.user });
  });

  app.get("/api/settings/organization", authenticate, (req, res) => {
    res.json({ data: req.user });
  });

  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  (isJtiBlacklisted as jest.Mock).mockResolvedValue(false);

  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: "org-1",
    role: "INTERNAL",
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
      ownerUserId: "owner-1",
    },
  });
});

describe("authenticate onboarding organization state", () => {
  it("allows active organization members through normal protected routes", async () => {
    const res = await request(buildApp())
      .get("/api/settings/organization")
      .set("Cookie", cookieFor("user-1", "org-1", "INTERNAL"));

    expect(res.status).toBe(200);
  });

  it("allows the assigned owner of an OWNER_ASSIGNED organization to call auth/me", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "owner-1",
      organizationId: "org-1",
      role: "OWNER",
      status: "ACTIVE",
      organization: {
        status: "OWNER_ASSIGNED",
        ownerUserId: "owner-1",
      },
    });

    const res = await request(buildApp())
      .get("/api/auth/me")
      .set("Cookie", cookieFor("owner-1", "org-1", "OWNER"));

    expect(res.status).toBe(200);
  });

  it("allows the assigned owner of an OWNER_ASSIGNED organization to call onboarding routes", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "owner-1",
      organizationId: "org-1",
      role: "OWNER",
      status: "ACTIVE",
      organization: {
        status: "OWNER_ASSIGNED",
        ownerUserId: "owner-1",
      },
    });

    const res = await request(buildApp())
      .get("/api/onboarding/organization")
      .set("Cookie", cookieFor("owner-1", "org-1", "OWNER"));

    expect(res.status).toBe(200);
  });

  it("blocks normal protected routes until owner onboarding is completed", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "owner-1",
      organizationId: "org-1",
      role: "OWNER",
      status: "ACTIVE",
      organization: {
        status: "OWNER_ASSIGNED",
        ownerUserId: "owner-1",
      },
    });

    const res = await request(buildApp())
      .get("/api/settings/organization")
      .set("Cookie", cookieFor("owner-1", "org-1", "OWNER"));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Organization onboarding is required");
  });

  it("does not allow non-owners into OWNER_ASSIGNED organizations", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "admin-1",
      organizationId: "org-1",
      role: "ADMIN",
      status: "ACTIVE",
      organization: {
        status: "OWNER_ASSIGNED",
        ownerUserId: "owner-1",
      },
    });

    const res = await request(buildApp())
      .get("/api/auth/me")
      .set("Cookie", cookieFor("admin-1", "org-1", "ADMIN"));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Organization is not active");
  });
});
