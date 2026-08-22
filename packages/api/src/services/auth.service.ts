import {
  getPrismaClient,
  hashPassword,
  verifyPassword,
  generateTokenPair,
  verifyRefreshToken,
  blacklistToken,
  isJtiBlacklisted,
  hashToken,
  type AuthUser,
} from "@starter-kit/shared";
import { Prisma, type OrganizationStatus, type User } from "@prisma/client";
import { createError } from "../middleware/error-handler";
import { auditService } from "./audit.service";

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

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface OrganizationAccessSnapshot {
  status: OrganizationStatus;
  ownerUserId?: string | null;
}

function isOnboardingRequiredForUser(
  user: Pick<User, "id" | "role">,
  organization: OrganizationAccessSnapshot,
): boolean {
  return (
    organization.status === "OWNER_ASSIGNED" &&
    user.role === "OWNER" &&
    organization.ownerUserId === user.id
  );
}

function organizationAllowsAuthenticatedSession(
  user: Pick<User, "id" | "role">,
  organization: OrganizationAccessSnapshot,
): boolean {
  return (
    organization.status === "ACTIVE" ||
    isOnboardingRequiredForUser(user, organization)
  );
}

function toPublicUser(
  user: User,
  organization: OrganizationAccessSnapshot,
): AuthUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    organizationStatus: organization.status,
    onboardingRequired: isOnboardingRequiredForUser(user, organization),
    mustChangePassword: user.mustChangePassword,
  };
}

export class AuthService {
  /**
   * There is no public self-registration in Clausio (BR-3/BR-17 — the only
   * way to join an Organization is by Invitation). This replaces the old
   * open "register" endpoint with the flow the Domain & Business Rules
   * actually define: a pending Invitation, validated and consumed, turns
   * into an ACTIVE User.
   */
  async acceptInvitation(
    input: AcceptInvitationInput,
    requestContext: RequestContext = {},
  ) {
    const tokenHash = hashToken(input.invitationToken);
    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        organization: {
          select: {
            status: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!invitation) {
      throw createError("Invalid invitation", 400);
    }
    if (invitation.organization.status !== "ACTIVE") {
      throw createError("Organization is not active", 403);
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

    let user: User;
    try {
      user = await prisma.$transaction(async (tx) => {
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

        await auditService.logEvent(tx, {
          organizationId: invitation.organizationId,
          actorUserId: created.id,
          action: "INVITATION_ACCEPTED",
          targetEntityType: "Invitation",
          targetEntityId: invitation.id,
          oldValue: { status: "PENDING" },
          newValue: { status: "ACCEPTED" },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
        });

        return created;
      });
    } catch (err) {
      // Two concurrent requests can both pass the status checks above before
      // either commits — the second one's unique-constraint violation
      // (email or invitationId already claimed) means someone else won the
      // race, not a server error.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw createError("This invitation has already been used", 409);
      }
      throw err;
    }

    const tokens = generateTokenPair({
      userId: user.id,
      orgId: user.organizationId,
      role: user.role,
    });

    return { user: toPublicUser(user, invitation.organization), ...tokens };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        organization: {
          select: {
            status: true,
            ownerUserId: true,
          },
        },
      },
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
    if (!organizationAllowsAuthenticatedSession(user, user.organization)) {
      throw createError("Organization is not active", 403);
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

    return { user: toPublicUser(user, user.organization), ...tokens };
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
      include: {
        organization: {
          select: {
            status: true,
            ownerUserId: true,
          },
        },
      },
    });
    if (!user || user.status !== "ACTIVE") {
      throw createError("Invalid or expired refresh token", 401);
    }
    if (!organizationAllowsAuthenticatedSession(user, user.organization)) {
      throw createError("Organization is not active", 403);
    }

    // Rotation: the token just used can never be presented again.
    await blacklistToken(rawRefreshToken);

    return generateTokenPair({
      userId: user.id,
      orgId: user.organizationId,
      role: user.role,
    });
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== "ACTIVE") {
      throw createError("Invalid credentials", 401);
    }

    const currentPasswordIsValid = await verifyPassword(
      input.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordIsValid) {
      throw createError("Invalid credentials", 401);
    }

    const passwordHash = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    await Promise.all([
      accessToken ? blacklistToken(accessToken) : Promise.resolve(),
      refreshToken ? blacklistToken(refreshToken) : Promise.resolve(),
    ]);
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            status: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!user) throw createError("User not found", 404);

    if (!organizationAllowsAuthenticatedSession(user, user.organization)) {
      throw createError("Organization is not active", 403);
    }

    return toPublicUser(user, user.organization);
  }
}

export const authService = new AuthService();
