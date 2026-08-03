import request from "supertest";

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/user.service", () => ({
  userService: {
    listUsers: jest.fn(),
    updateRole: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken } from "@starter-kit/shared";
import { userService } from "../../src/services/user.service";

const mockUserService = userService as jest.Mocked<typeof userService>;

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL") {
  const token = signAccessToken({ userId: "user-1", orgId: "org-1", role });
  return `accessToken=${token}`;
}

// ─── GET /api/users ────────────────────────────────────────────────────────────

describe("GET /api/users", () => {
  it("returns 401 with no session", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  it("returns 200 for an INTERNAL user — viewing the roster isn't admin-only", async () => {
    mockUserService.listUsers.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const res = await request(app)
      .get("/api/users")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(200);
  });

  it("returns 200 for an ADMIN user", async () => {
    mockUserService.listUsers.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const res = await request(app)
      .get("/api/users")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 200 for an OWNER user", async () => {
    mockUserService.listUsers.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const res = await request(app)
      .get("/api/users")
      .set("Cookie", cookieFor("OWNER"));

    expect(res.status).toBe(200);
  });
});

// ─── PUT /api/users/:id/role ───────────────────────────────────────────────────

describe("PUT /api/users/:id/role", () => {
  it("returns 422 when role is OWNER", async () => {
    const res = await request(app)
      .put("/api/users/target-1/role")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ role: "OWNER" });

    expect(res.status).toBe(422);
    expect(mockUserService.updateRole).not.toHaveBeenCalled();
  });

  it("returns 422 for an unknown role", async () => {
    const res = await request(app)
      .put("/api/users/target-1/role")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ role: "SUPERUSER" });

    expect(res.status).toBe(422);
  });

  it("returns 200 on a valid role change", async () => {
    mockUserService.updateRole.mockResolvedValue({
      id: "target-1",
      role: "ADMIN",
    } as never);

    const res = await request(app)
      .put("/api/users/target-1/role")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ role: "ADMIN" });

    expect(res.status).toBe(200);
    expect(mockUserService.updateRole).toHaveBeenCalledWith(
      { id: "user-1", organizationId: "org-1", role: "ADMIN" },
      "target-1",
      "ADMIN",
      expect.objectContaining({ ipAddress: expect.any(String) }),
    );
  });

  it("returns 403 for an INTERNAL caller", async () => {
    const res = await request(app)
      .put("/api/users/target-1/role")
      .set("Cookie", cookieFor("INTERNAL"))
      .send({ role: "ADMIN" });

    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/users/:id/status ─────────────────────────────────────────────────

describe("PUT /api/users/:id/status", () => {
  it("returns 422 for an unknown status", async () => {
    const res = await request(app)
      .put("/api/users/target-1/status")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ status: "DEACTIVATED" });

    expect(res.status).toBe(422);
  });

  it("returns 200 when disabling a user", async () => {
    mockUserService.updateStatus.mockResolvedValue({
      id: "target-1",
      status: "SUSPENDED",
    } as never);

    const res = await request(app)
      .put("/api/users/target-1/status")
      .set("Cookie", cookieFor("ADMIN"))
      .send({ status: "SUSPENDED" });

    expect(res.status).toBe(200);
  });
});
