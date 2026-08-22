import type { Request, Response, NextFunction } from "express";
import { settingsService } from "../services/settings.service";

export const settingsController = {
  async getOrganizationSettings(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const settings = await settingsService.getOrganizationSettings({
        userId: req.user!.userId,
        organizationId: req.user!.orgId,
        role: req.user!.role,
      });

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

  async uploadOrganizationLogo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const settings = await settingsService.uploadOrganizationLogo(
        {
          userId: req.user!.userId,
          organizationId: req.user!.orgId,
          role: req.user!.role,
        },
        req.file,
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

  async deleteOrganizationLogo(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const settings = await settingsService.deleteOrganizationLogo(
        {
          userId: req.user!.userId,
          organizationId: req.user!.orgId,
          role: req.user!.role,
        },
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
