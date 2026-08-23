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

  async getOrganizationLogoFile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const file = await settingsService.getOrganizationLogoFile({
        userId: req.user!.userId,
        organizationId: req.user!.orgId,
        role: req.user!.role,
      });

      res.setHeader("Content-Type", file.contentType);
      if (file.contentLength !== undefined) {
        res.setHeader("Content-Length", file.contentLength);
      }
      // Deliberately no Content-Disposition — this is rendered inline via
      // <img src>, not downloaded (contrast contract/organization-brain
      // getFile, which force an attachment download).

      file.body.on("error", (streamErr) => {
        // Mirrors contract.controller.ts's getFile — headers may already be
        // sent by the time S3 errors mid-stream.
        if (res.headersSent) {
          res.destroy(streamErr);
          return;
        }
        next(streamErr);
      });
      file.body.pipe(res);
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
