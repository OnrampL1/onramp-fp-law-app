import type { Request, Response, NextFunction } from "express";
import { settingsService } from "../services/settings.service";

export const settingsController = {
  async getOrganizationSettings(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const settings = await settingsService.getOrganizationSettings(
        req.user!.userId,
        req.user!.orgId,
      );

      res.json({ data: settings });
    } catch (err) {
      next(err);
    }
  },

  async updateOrganizationSettings(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const settings = await settingsService.updateOrganizationSettings(
        {
          userId: req.user!.userId,
          organizationId: req.user!.orgId,
          role: req.user!.role,
        },
        req.body,
        {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      );

      res.json({ data: settings });
    } catch (err) {
      next(err);
    }
  },
};
