import type { NextFunction, Request, Response } from "express";
import type { PlatformUserRole } from "@starter-kit/shared";

export function authorizePlatform(...roles: PlatformUserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.platformUser) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.platformUser.role)) {
      res.status(403).json({ error: "Insufficient platform permissions" });
      return;
    }

    next();
  };
}
