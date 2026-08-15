import type { Request, Response, NextFunction } from "express";
import { platformOrganizationService } from "../services/platform-organization.service";

function requestContextFrom(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get("user-agent") };
}

export const platformOrganizationController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organization = await platformOrganizationService.createOrganization(
        { id: req.platformUser!.id },
        req.body,
        requestContextFrom(req),
      );

      res.status(201).json({ data: organization });
    } catch (err) {
      next(err);
    }
  },

  async assignFirstOwner(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const organization = await platformOrganizationService.assignFirstOwner(
        { id: req.platformUser!.id },
        req.params.id as string,
        req.body,
        requestContextFrom(req),
      );

      res.json({ data: organization });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, pagination } =
        await platformOrganizationService.listOrganizations(
          req.query as unknown as {
            search?: string;
            status?:
              | "CREATED"
              | "OWNER_ASSIGNED"
              | "ACTIVE"
              | "SUSPENDED"
              | "ARCHIVED";
            page: number;
            limit: number;
          },
        );

      res.json({ data, meta: { pagination } });
    } catch (err) {
      next(err);
    }
  },

  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const organization = await platformOrganizationService.getOrganization(
        req.params.id as string,
      );

      res.json({ data: organization });
    } catch (err) {
      next(err);
    }
  },
};
