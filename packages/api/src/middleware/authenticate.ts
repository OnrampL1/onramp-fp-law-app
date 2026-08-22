import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
  getPrismaClient,
  verifyAccessToken,
  isJtiBlacklisted,
} from "@starter-kit/shared";
import type { AccessTokenPayload } from "@starter-kit/shared";
import type { AuthenticatedRequest } from "../types/express.types";
import type { OrganizationStatus, UserRole } from "@prisma/client";

type DecodedAccessToken = Omit<AccessTokenPayload, "actorType"> & {
  actorType?: string;
  platformUserId?: string;
};

const prisma = getPrismaClient();

interface AuthenticatedUserSnapshot {
  id: string;
  organizationId: string;
  role: UserRole;
  organization: {
    status: OrganizationStatus;
    ownerUserId: string | null;
  };
}

function isOnboardingRequiredForUser(user: AuthenticatedUserSnapshot): boolean {
  return (
    user.organization.status === "OWNER_ASSIGNED" &&
    user.role === "OWNER" &&
    user.organization.ownerUserId === user.id
  );
}

function organizationAllowsAuthenticatedSession(
  user: AuthenticatedUserSnapshot,
): boolean {
  return (
    user.organization.status === "ACTIVE" || isOnboardingRequiredForUser(user)
  );
}

function isOnboardingSafeRequest(req: Request): boolean {
  const routePath = `${req.baseUrl}${req.path}`;

  return (
    (req.method === "GET" && routePath === "/api/auth/me") ||
    (req.method === "POST" && routePath === "/api/auth/logout") ||
    (req.method === "POST" && routePath === "/api/auth/change-password") ||
    (req.method === "GET" && routePath === "/api/settings/organization") ||
    (req.method === "POST" &&
      routePath === "/api/settings/organization/logo") ||
    (req.method === "DELETE" &&
      routePath === "/api/settings/organization/logo") ||
    routePath.startsWith("/api/onboarding")
  );
}

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.accessToken as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let payload: AccessTokenPayload;

  try {
    const decoded = verifyAccessToken(token) as DecodedAccessToken;

    if (
      decoded.actorType === "PLATFORM_USER" ||
      decoded.platformUserId ||
      !decoded.userId ||
      !decoded.orgId
    ) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    payload = {
      actorType: "USER",
      userId: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role,
      jti: decoded.jti,
    };
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  let blacklisted: boolean;
  try {
    blacklisted = await isJtiBlacklisted(payload.jti);
  } catch (err) {
    console.error("[authenticate] Token blacklist check failed:", err);
    res
      .status(503)
      .json({ error: "Authentication service temporarily unavailable" });
    return;
  }

  if (blacklisted) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  let authenticatedUser;
  try {
    authenticatedUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        organizationId: true,
        role: true,
        status: true,
        organization: {
          select: {
            status: true,
            ownerUserId: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("[authenticate] User status check failed:", err);
    res
      .status(503)
      .json({ error: "Authentication service temporarily unavailable" });
    return;
  }

  if (
    !authenticatedUser ||
    authenticatedUser.status !== "ACTIVE" ||
    authenticatedUser.organizationId !== payload.orgId
  ) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  if (!organizationAllowsAuthenticatedSession(authenticatedUser)) {
    res.status(403).json({ error: "Organization is not active" });
    return;
  }

  if (
    isOnboardingRequiredForUser(authenticatedUser) &&
    !isOnboardingSafeRequest(req)
  ) {
    res.status(403).json({ error: "Organization onboarding is required" });
    return;
  }

  payload = {
    ...payload,
    role: authenticatedUser.role,
  };

  req.user = payload;
  next();
}

export function withAuth(
  handler: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => void | Promise<void>,
): RequestHandler {
  return handler as unknown as RequestHandler;
}
