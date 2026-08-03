import { getPrismaClient, isAssignableRole } from "@starter-kit/shared";
import type { User, UserRole, UserStatus } from "@prisma/client";
import { createError } from "../middleware/error-handler";
import { auditService } from "./audit.service";

const prisma = getPrismaClient();

interface PaginationInput {
  page: number;
  limit: number;
}

interface Actor {
  id: string;
  organizationId: string;
  role: UserRole;
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

function toPublicUser(user: User) {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class UserService {
  async listUsers(organizationId: string, { page, limit }: PaginationInput) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: { organizationId } }),
    ]);

    return {
      data: users.map(toPublicUser),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateRole(
    actor: Actor,
    targetUserId: string,
    role: UserRole,
    requestContext: RequestContext = {},
  ) {
    if (!isAssignableRole(role)) {
      throw createError("OWNER cannot be assigned through a role change", 422);
    }

    const target = await this.getOrgMember(actor.organizationId, targetUserId);

    if (target.id === actor.id) {
      throw createError("You cannot change your own role", 422);
    }
    if (target.role === "OWNER") {
      throw createError("The organization owner's role cannot be changed", 422);
    }

    if (role === "ADMIN" && actor.role !== "OWNER") {
      throw createError(
        "Only the organization owner can assign the administrator role",
        403,
      );
    }

    if (actor.role !== "OWNER" && target.role !== "INTERNAL") {
      throw createError(
        "Only the organization owner can change an administrator's role",
        403,
      );
    }

    const previousRole = target.role;
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data: { role },
      });

      await auditService.logEvent(tx, {
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action: "USER_ROLE_CHANGED",
        targetEntityType: "User",
        targetEntityId: target.id,
        oldValue: { role: previousRole },
        newValue: { role },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return user;
    });

    return toPublicUser(updated);
  }

  async updateStatus(
    actor: Actor,
    targetUserId: string,
    status: Extract<UserStatus, "ACTIVE" | "SUSPENDED">,
    requestContext: RequestContext = {},
  ) {
    const target = await this.getOrgMember(actor.organizationId, targetUserId);

    if (target.id === actor.id) {
      throw createError("You cannot change your own status", 422);
    }
    if (target.role === "OWNER") {
      throw createError(
        "The organization owner's status cannot be changed",
        422,
      );
    }

    const previousStatus = target.status;
    const action =
      status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED";

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data: { status },
      });

      await auditService.logEvent(tx, {
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action,
        targetEntityType: "User",
        targetEntityId: target.id,
        oldValue: { status: previousStatus },
        newValue: { status },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return user;
    });

    return toPublicUser(updated);
  }

  private async getOrgMember(
    organizationId: string,
    userId: string,
  ): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw createError("User not found", 404);
    }
    return user;
  }
}

export const userService = new UserService();
