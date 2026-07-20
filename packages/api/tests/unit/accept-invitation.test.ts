// AuthService.acceptInvitation has its own file rather than living in
// auth.service.test.ts, because — despite the name — that file only tests
// shared/auth/password and shared/auth/jwt utilities directly; it never
// exercises AuthService itself.

const mockDb = {
  invitation: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
};

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockDb,
  hashPassword: jest.fn(async () => "hashed-password"),
  verifyPassword: jest.fn(),
  generateTokenPair: jest.fn(() => ({
    accessToken: "access.token",
    refreshToken: "refresh.token",
  })),
  verifyRefreshToken: jest.fn(),
  blacklistToken: jest.fn(),
  isJtiBlacklisted: jest.fn(),
  hashToken: (raw: string) => `hashed-${raw}`,
}));

import { authService } from "../../src/services/auth.service";

const baseInput = {
  invitationToken: "raw-token",
  fullName: "Jordan Lee",
  password: "SecurePass1",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AuthService.acceptInvitation", () => {
  it("throws 400 for an unknown token", async () => {
    mockDb.invitation.findUnique.mockResolvedValue(null);

    await expect(
      authService.acceptInvitation(baseInput),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("throws 409 for an already-accepted invitation and creates no user", async () => {
    mockDb.invitation.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "ACCEPTED",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      authService.acceptInvitation(baseInput),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("throws 400 for a revoked invitation and creates no user", async () => {
    mockDb.invitation.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "REVOKED",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      authService.acceptInvitation(baseInput),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("throws 400 for an invitation past its expiresAt, creates no user, and flips it to EXPIRED", async () => {
    mockDb.invitation.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() - 60_000), // already past
    });

    await expect(
      authService.acceptInvitation(baseInput),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockDb.user.create).not.toHaveBeenCalled();
    expect(mockDb.invitation.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "EXPIRED" },
    });
  });

  it("throws 400 for an invitation already marked EXPIRED and does not re-update it", async () => {
    mockDb.invitation.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "EXPIRED",
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      authService.acceptInvitation(baseInput),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockDb.user.create).not.toHaveBeenCalled();
    expect(mockDb.invitation.update).not.toHaveBeenCalled();
  });

  it("creates an ACTIVE user and flips the invitation to ACCEPTED for a valid pending invitation", async () => {
    mockDb.invitation.findUnique.mockResolvedValue({
      id: "inv-1",
      organizationId: "org-1",
      email: "invitee@example.com",
      role: "INTERNAL",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockDb.user.create.mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      email: "invitee@example.com",
      fullName: "Jordan Lee",
      role: "INTERNAL",
    });

    const result = await authService.acceptInvitation(baseInput);

    expect(mockDb.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "invitee@example.com",
          role: "INTERNAL",
          status: "ACTIVE",
        }),
      }),
    );
    expect(mockDb.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({ status: "ACCEPTED" }),
      }),
    );
    expect(result.user.email).toBe("invitee@example.com");
    expect(result.accessToken).toBe("access.token");
  });
});
