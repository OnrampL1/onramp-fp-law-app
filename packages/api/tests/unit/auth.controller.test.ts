import request from "supertest";
import { app } from "../../app";

jest.mock("../../src/services/auth.service", () => ({
  authService: {
    acceptInvitation: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  },
}));

import { authService } from "../../src/services/auth.service";
const mockAuthService = authService as jest.Mocked<typeof authService>;

// ─── POST /api/auth/accept-invitation ─────────────────────────────────────────

describe("POST /api/auth/accept-invitation", () => {
  it("returns 201 with user data on success", async () => {
    mockAuthService.acceptInvitation.mockResolvedValue({
      user: {
        id: "uuid-1",
        organizationId: "org-uuid-1",
        email: "alice@example.com",
        fullName: "Alice",
        role: "INTERNAL",
      },
      accessToken: "access.token.here",
      refreshToken: "refresh.token.here",
    });

    const res = await request(app).post("/api/auth/accept-invitation").send({
      invitationToken: "raw-invitation-token",
      fullName: "Alice",
      password: "SecurePass1",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe("alice@example.com");
  });

  it("returns 422 when the invitation token is missing", async () => {
    const res = await request(app).post("/api/auth/accept-invitation").send({
      fullName: "Alice",
      password: "SecurePass1",
    });

    expect(res.status).toBe(422);
  });

  it("returns 422 when password is too weak", async () => {
    const res = await request(app).post("/api/auth/accept-invitation").send({
      invitationToken: "raw-invitation-token",
      fullName: "Alice",
      password: "short",
    });

    expect(res.status).toBe(422);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 200 with tokens on valid credentials", async () => {
    mockAuthService.login.mockResolvedValue({
      user: {
        id: "uuid-1",
        organizationId: "org-uuid-1",
        email: "alice@example.com",
        fullName: "Alice",
        role: "OWNER",
      },
      accessToken: "access.token.here",
      refreshToken: "refresh.token.here",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "SecurePass1" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("user");
    expect(res.body.data.user.email).toBe("alice@example.com");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("returns 422 when body is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(422);
  });
});
