import type { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyAccessToken, isJtiBlacklisted } from "@starter-kit/shared";
import type { AccessTokenPayload } from "@starter-kit/shared";
import type { AuthenticatedRequest } from "../types/express.types";

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

  try {
    const payload = verifyAccessToken(token);

    if (await isJtiBlacklisted(payload.jti)) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
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
