import type { NextFunction, Request, Response } from "express";
import { accessRequestService } from "../services/access-request.service";

export const platformAccessRequestController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data, pagination } =
        await accessRequestService.listAccessRequests(
          req.query as unknown as {
            search?: string;
            status?: "PENDING" | "APPROVED" | "DECLINED";
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
      const accessRequest = await accessRequestService.getAccessRequest(
        req.params.id as string,
      );

      res.json({ data: accessRequest });
    } catch (err) {
      next(err);
    }
  },
};
