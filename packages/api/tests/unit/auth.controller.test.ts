import request from "supertest";

jest.mock("../../src/services/auth.service", () => ({
  authService: {
    acceptInvitation: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    changePassword: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  },
}));

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

import { app } from "../../app";
import { signAccessToken } from "@starter-kit/shared";
import { authService } from "../../src/services/auth.service";
const mockAuthService = authService as jest.Mocked<typeof authService>;

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL" = "INTERNAL") {
  const token = signAccessToken({ userId: "user-1", orgId: "org-1", role });
  return `accessToken=${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: "org-1",
    role: "INTERNAL",
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
    },
  });
});
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

describe("POST /api/auth/change-password", () => {
  it("blocks authenticated organization routes when the organization is suspended", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      role: "OWNER",
      status: "ACTIVE",
      organization: {
        status: "SUSPENDED",
      },
    });

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookieFor("OWNER"))
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123",
        confirmNewPassword: "NewPassword123",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Organization is not active");
    expect(mockAuthService.changePassword).not.toHaveBeenCalled();
  });

  it("returns 401 with no session", async () => {
    const res = await request(app).post("/api/auth/change-password").send({
      currentPassword: "Password123!",
      newPassword: "NewPassword123",
      confirmNewPassword: "NewPassword123",
    });

    expect(res.status).toBe(401);
    expect(mockAuthService.changePassword).not.toHaveBeenCalled();
  });

  it("returns 422 when password confirmation does not match", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookieFor())
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123",
        confirmNewPassword: "DifferentPassword123",
      });

    expect(res.status).toBe(422);
    expect(mockAuthService.changePassword).not.toHaveBeenCalled();
  });

  it("changes the current user's password and clears auth cookies", async () => {
    mockAuthService.changePassword.mockResolvedValue(undefined);
    mockAuthService.logout.mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookieFor("ADMIN"))
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123",
        confirmNewPassword: "NewPassword123",
      });

    expect(res.status).toBe(200);
    expect(mockAuthService.changePassword).toHaveBeenCalledWith("user-1", {
      currentPassword: "Password123!",
      newPassword: "NewPassword123",
    });
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(res.body.data.message).toBe(
      "Password changed successfully. Please sign in again.",
    );

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((cookie) => cookie.startsWith("accessToken=;"))).toBe(
      true,
    );
    expect(cookies.some((cookie) => cookie.startsWith("refreshToken=;"))).toBe(
      true,
    );
  });

  it("returns 401 when the current password is wrong", async () => {
    const err = new Error("Invalid credentials") as Error & {
      statusCode: number;
      isOperational: boolean;
    };
    err.statusCode = 401;
    err.isOperational = true;

    mockAuthService.changePassword.mockRejectedValue(err);

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookieFor())
      .send({
        currentPassword: "WrongPassword123",
        newPassword: "NewPassword123",
        confirmNewPassword: "NewPassword123",
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });
});
