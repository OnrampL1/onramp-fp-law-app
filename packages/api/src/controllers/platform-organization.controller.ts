import type { Request, Response, NextFunction } from "express";
import { platformOrganizationService } from "../services/platform-organization.service";

export const platformOrganizationController = {
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
