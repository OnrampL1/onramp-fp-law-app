const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockVerifyPassword = jest.fn();
const mockGenerateTokenPair = jest.fn();
const mockHashPassword = jest.fn();
const mockVerifyRefreshToken = jest.fn();
const mockBlacklistToken = jest.fn();
const mockIsJtiBlacklisted = jest.fn();
const mockHashToken = jest.fn();

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockPrisma,
  verifyPassword: mockVerifyPassword,
  generateTokenPair: mockGenerateTokenPair,
  hashPassword: mockHashPassword,
  verifyRefreshToken: mockVerifyRefreshToken,
  blacklistToken: mockBlacklistToken,
  isJtiBlacklisted: mockIsJtiBlacklisted,
  hashToken: mockHashToken,
}));

import { authService } from "../../src/services/auth.service";

function userRow(overrides = {}) {
  return {
    id: "owner-1",
    organizationId: "org-1",
    email: "owner@acme.test",
    passwordHash: "hashed-password",
    fullName: "Owner User",
    role: "OWNER",
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
      ownerUserId: "owner-1",
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockVerifyPassword.mockResolvedValue(true);
  mockGenerateTokenPair.mockReturnValue({
    accessToken: "access-token",
    refreshToken: "refresh-token",
  });
});

describe("AuthService.login", () => {
  it("selects ownerUserId when loading the organization for login", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow());

    await authService.login({
      email: "owner@acme.test",
      password: "Password123!",
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "owner@acme.test" },
      include: {
        organization: {
          select: {
            status: true,
            ownerUserId: true,
          },
        },
      },
    });
  });

  it("allows the assigned owner to log into an owner-assigned organization for onboarding", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      userRow({
        organization: {
          status: "OWNER_ASSIGNED",
          ownerUserId: "owner-1",
        },
      }),
    );

    const result = await authService.login({
      email: "owner@acme.test",
      password: "Password123!",
    });

    expect(result).toEqual({
      user: {
        id: "owner-1",
        organizationId: "org-1",
        email: "owner@acme.test",
        fullName: "Owner User",
        role: "OWNER",
        organizationStatus: "OWNER_ASSIGNED",
        onboardingRequired: true,
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "owner-1" },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it("rejects non-assigned owners in owner-assigned organizations", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      userRow({
        id: "other-owner-1",
        organization: {
          status: "OWNER_ASSIGNED",
          ownerUserId: "owner-1",
        },
      }),
    );

    await expect(
      authService.login({
        email: "owner@acme.test",
        password: "Password123!",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Organization is not active",
    });

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockGenerateTokenPair).not.toHaveBeenCalled();
  });

  it("returns onboardingRequired false for active organizations", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow());

    const result = await authService.login({
      email: "owner@acme.test",
      password: "Password123!",
    });

    expect(result.user.organizationStatus).toBe("ACTIVE");
    expect(result.user.onboardingRequired).toBe(false);
  });
});
