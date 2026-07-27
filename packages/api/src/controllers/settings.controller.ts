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
};
