import type { NextFunction, Request, Response } from "express";
import { accessRequestService } from "../services/access-request.service";
import {
  type ApproveAccessRequestInput,
  type DeclineAccessRequestInput,
} from "../schemas/access-request.schemas";

function getParamId(req: Request): string {
  const id = req.params.id;

  return Array.isArray(id) ? id[0] : id;
}

function requestContextFrom(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

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

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const accessRequest = await accessRequestService.approveAccessRequest(
        { id: req.platformUser!.id },
        getParamId(req),
        req.body as ApproveAccessRequestInput,
        requestContextFrom(req),
      );

      res.json({ data: accessRequest });
    } catch (error) {
      next(error);
    }
  },

  async decline(req: Request, res: Response, next: NextFunction) {
    try {
      const accessRequest = await accessRequestService.declineAccessRequest(
        { id: req.platformUser!.id },
        getParamId(req),
        req.body as DeclineAccessRequestInput,
      );

      res.json({ data: accessRequest });
    } catch (error) {
      next(error);
    }
  },
};
