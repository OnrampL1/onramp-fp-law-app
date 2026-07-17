import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, isJtiBlacklisted } from "@starter-kit/shared";
import type { AccessTokenPayload } from "@starter-kit/shared";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
    payload = verifyAccessToken(token);
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

  req.user = payload;
  next();
}
