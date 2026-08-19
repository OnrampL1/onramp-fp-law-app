import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";

const mockPrisma = {
  platformUser: {
    findUnique: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  getPrismaClient: jest.fn(() => mockPrisma),
  isJtiBlacklisted: jest.fn(),
}));

import {
  isJtiBlacklisted,
  signAccessToken,
  signPlatformAccessToken,
} from "@starter-kit/shared";
import { authenticatePlatform } from "../../src/middleware/authenticate-platform";

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.get("/platform/probe", authenticatePlatform, (req, res) => {
    res.json({ data: req.platformUser });
  });
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  (isJtiBlacklisted as jest.Mock).mockResolvedValue(false);
});

describe("authenticatePlatform", () => {
  it("rejects missing cookies", async () => {
    const res = await request(buildApp()).get("/platform/probe");

    expect(res.status).toBe(401);
    expect(mockPrisma.platformUser.findUnique).not.toHaveBeenCalled();
  });

  it("rejects organization-user tokens", async () => {
    const token = signAccessToken({
      userId: "user-1",
      orgId: "org-1",
      role: "OWNER",
    });

    const res = await request(buildApp())
      .get("/platform/probe")
      .set("Cookie", `platformAccessToken=${token}`);

    expect(res.status).toBe(401);
    expect(mockPrisma.platformUser.findUnique).not.toHaveBeenCalled();
  });

  it("rejects blacklisted platform tokens", async () => {
    const token = signPlatformAccessToken({
      platformUserId: "platform-1",
      role: "SUPER_ADMIN",
    });
    (isJtiBlacklisted as jest.Mock).mockResolvedValue(true);

    const res = await request(buildApp())
      .get("/platform/probe")
      .set("Cookie", `accessToken=${token}`);

    expect(res.status).toBe(401);
    expect(mockPrisma.platformUser.findUnique).not.toHaveBeenCalled();
  });

  it("rejects suspended platform users", async () => {
    const token = signPlatformAccessToken({
      platformUserId: "platform-1",
      role: "SUPER_ADMIN",
    });
    mockPrisma.platformUser.findUnique.mockResolvedValue({
      id: "platform-1",
      email: "ops@clausio.test",
      fullName: "Ops User",
      role: "SUPER_ADMIN",
      status: "SUSPENDED",
    });

    const res = await request(buildApp())
      .get("/platform/probe")
      .set("Cookie", `platformAccessToken=${token}`);

    expect(res.status).toBe(401);
  });

  it("allows active platform users", async () => {
    const token = signPlatformAccessToken({
      platformUserId: "platform-1",
      role: "SUPER_ADMIN",
    });
    mockPrisma.platformUser.findUnique.mockResolvedValue({
      id: "platform-1",
      email: "ops@clausio.test",
      fullName: "Ops User",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    });

    const res = await request(buildApp())
      .get("/platform/probe")
      .set("Cookie", `platformAccessToken=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: "platform-1",
      email: "ops@clausio.test",
      fullName: "Ops User",
      role: "SUPER_ADMIN",
    });
  });
});
