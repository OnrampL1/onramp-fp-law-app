import {
  blacklistToken,
  generatePlatformTokenPair,
  getPrismaClient,
  isJtiBlacklisted,
  verifyPassword,
  verifyPlatformRefreshToken,
  type PlatformAuthUser,
} from "@starter-kit/shared";
import type { PlatformUser } from "@prisma/client";
import { createError } from "../middleware/error-handler";

const prisma = getPrismaClient();

interface PlatformLoginInput {
  email: string;
  password: string;
}

function toPublicPlatformUser(user: PlatformUser): PlatformAuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

export class PlatformAuthService {
  async login(input: PlatformLoginInput) {
    const platformUser = await prisma.platformUser.findUnique({
      where: { email: input.email },
    });

    if (!platformUser) {
      throw createError("Invalid credentials", 401);
    }

    const valid = await verifyPassword(
      input.password,
      platformUser.passwordHash,
    );
    if (!valid) {
      throw createError("Invalid credentials", 401);
    }

    if (platformUser.status !== "ACTIVE") {
      throw createError("This platform account is not active", 401);
    }

    const updated = await prisma.platformUser.update({
      where: { id: platformUser.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = generatePlatformTokenPair({
      platformUserId: updated.id,
      role: updated.role,
    });

    return { platformUser: toPublicPlatformUser(updated), ...tokens };
  }

  async refresh(rawRefreshToken: string) {
    let payload;
    try {
      payload = verifyPlatformRefreshToken(rawRefreshToken);
    } catch {
      throw createError("Invalid or expired refresh token", 401);
    }

    if (await isJtiBlacklisted(payload.jti)) {
      throw createError("Invalid or expired refresh token", 401);
    }

    const platformUser = await prisma.platformUser.findUnique({
      where: { id: payload.platformUserId },
    });

    if (!platformUser || platformUser.status !== "ACTIVE") {
      throw createError("Invalid or expired refresh token", 401);
    }

    await blacklistToken(rawRefreshToken);

    return generatePlatformTokenPair({
      platformUserId: platformUser.id,
      role: platformUser.role,
    });
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    await Promise.all([
      accessToken ? blacklistToken(accessToken) : Promise.resolve(),
      refreshToken ? blacklistToken(refreshToken) : Promise.resolve(),
    ]);
  }

  async getProfile(platformUserId: string): Promise<PlatformAuthUser> {
    const platformUser = await prisma.platformUser.findUnique({
      where: { id: platformUserId },
    });

    if (!platformUser || platformUser.status !== "ACTIVE") {
      throw createError("Platform user not found", 404);
    }

    return toPublicPlatformUser(platformUser);
  }
}

export const platformAuthService = new PlatformAuthService();
