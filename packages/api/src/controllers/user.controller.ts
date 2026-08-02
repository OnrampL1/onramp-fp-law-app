import type { Request, Response, NextFunction } from "express";
import type { AccessTokenPayload } from "@starter-kit/shared";
import { userService } from "../services/user.service";

function actorFrom(payload: AccessTokenPayload) {
  return { id: payload.userId, organizationId: payload.orgId };
}

function requestContextFrom(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get("user-agent") };
}

export const userController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as unknown as {
        page: number;
        limit: number;
      };
      const { data, pagination } = await userService.listUsers(
        req.user!.orgId,
        { page, limit },
      );
      res.json({ data, meta: { pagination } });
    } catch (err) {
      next(err);
    }
  },

  async updateRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await userService.updateRole(
        actorFrom(req.user!),
        req.params.id as string,
        req.body.role,
        requestContextFrom(req),
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await userService.updateStatus(
        actorFrom(req.user!),
        req.params.id as string,
        req.body.status,
        requestContextFrom(req),
      );
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },
};
