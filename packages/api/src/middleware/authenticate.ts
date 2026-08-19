import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
  getPrismaClient,
  verifyAccessToken,
  isJtiBlacklisted,
} from "@starter-kit/shared";
import type { AccessTokenPayload } from "@starter-kit/shared";
import type { AuthenticatedRequest } from "../types/express.types";

type DecodedAccessToken = Omit<AccessTokenPayload, "actorType"> & {
  actorType?: string;
  platformUserId?: string;
};

const prisma = getPrismaClient();

function organizationAllowsMemberAccess(status: string): boolean {
  return status === "ACTIVE";
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

  if (!organizationAllowsMemberAccess(authenticatedUser.organization.status)) {
    res.status(403).json({ error: "Organization is not active" });
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
