import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
  getPrismaClient,
  isJtiBlacklisted,
  verifyPlatformAccessToken,
  type PlatformAccessTokenPayload,
  type PlatformAuthUser,
} from "@starter-kit/shared";

const prisma = getPrismaClient();

declare global {
  namespace Express {
    interface Request {
      platformUser?: PlatformAuthUser;
      platformToken?: PlatformAccessTokenPayload;
    }
  }
}

export async function authenticatePlatform(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.platformAccessToken as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let payload: PlatformAccessTokenPayload;
  try {
    payload = verifyPlatformAccessToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  let blacklisted: boolean;
  try {
    blacklisted = await isJtiBlacklisted(payload.jti);
  } catch (err) {
    console.error("[authenticatePlatform] Token blacklist check failed:", err);
    res
      .status(503)
      .json({ error: "Authentication service temporarily unavailable" });
    return;
  }

  if (blacklisted) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const platformUser = await prisma.platformUser.findUnique({
    where: { id: payload.platformUserId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
    },
  });

  if (!platformUser || platformUser.status !== "ACTIVE") {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.platformToken = payload;
  req.platformUser = {
    id: platformUser.id,
    email: platformUser.email,
    fullName: platformUser.fullName,
    role: platformUser.role,
  };

  next();
}

export function withPlatformAuth(
  handler: (
    req: Request & {
      platformUser: PlatformAuthUser;
      platformToken: PlatformAccessTokenPayload;
    },
    res: Response,
    next: NextFunction,
  ) => void | Promise<void>,
): RequestHandler {
  return handler as unknown as RequestHandler;
}
