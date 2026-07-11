import crypto from "node:crypto";
import {
  getPrismaClient,
  hashPassword,
  verifyPassword,
  generateTokenPair,
  verifyRefreshToken,
  blacklistToken,
  isJtiBlacklisted,
  type AuthUser,
} from "@starter-kit/shared";
import type { User } from "@prisma/client";
import { createError } from "../middleware/error-handler";

const prisma = getPrismaClient();

interface LoginInput {
  email: string;
  password: string;
}

interface AcceptInvitationInput {
  invitationToken: string;
  fullName: string;
  password: string;
}

function toPublicUser(user: User): AuthUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export class AuthService {
  /**
   * There is no public self-registration in Clausio (BR-3/BR-17 — the only
   * way to join an Organization is by Invitation). This replaces the old
   * open "register" endpoint with the flow the Domain & Business Rules
   * actually define: a pending Invitation, validated and consumed, turns
   * into an ACTIVE User.
   */
  async acceptInvitation(input: AcceptInvitationInput) {
    const tokenHash = hashToken(input.invitationToken);
    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw createError("Invalid invitation", 400);
    }
    if (invitation.status === "ACCEPTED") {
      throw createError("This invitation has already been used", 409);
    }
    if (invitation.status === "REVOKED") {
      throw createError("This invitation has been revoked", 400);
    }
    if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
      if (invitation.status !== "EXPIRED") {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
      }
      throw createError("This invitation has expired", 400);
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          invitationId: invitation.id,
          email: invitation.email,
          passwordHash,
          fullName: input.fullName,
          role: invitation.role,
          status: "ACTIVE",
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });

      return created;
    });

    const tokens = generateTokenPair({
      userId: user.id,
      orgId: user.organizationId,
      role: user.role,
    });

    return { user: toPublicUser(user), ...tokens };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      throw createError("Invalid credentials", 401);
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw createError("Invalid credentials", 401);
    }
    if (user.status !== "ACTIVE") {
      throw createError("This account is not active", 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = generateTokenPair({
      userId: user.id,
      orgId: user.organizationId,
      role: user.role,
    });

    return { user: toPublicUser(user), ...tokens };
  }

  async refresh(rawRefreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw createError("Invalid or expired refresh token", 401);
    }

    if (await isJtiBlacklisted(payload.jti)) {
      throw createError("Invalid or expired refresh token", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || user.status !== "ACTIVE") {
      throw createError("Invalid or expired refresh token", 401);
    }

    // Rotation: the token just used can never be presented again.
    await blacklistToken(rawRefreshToken);

    return generateTokenPair({
      userId: user.id,
      orgId: user.organizationId,
      role: user.role,
    });
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    await Promise.all([
      accessToken ? blacklistToken(accessToken) : Promise.resolve(),
      refreshToken ? blacklistToken(refreshToken) : Promise.resolve(),
    ]);
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createError("User not found", 404);
    return toPublicUser(user);
  }
}

export const authService = new AuthService();
