import type { NextFunction, Request, Response } from "express";
import { accessRequestService } from "../services/access-request.service";

export const accessRequestController = {
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await accessRequestService.submitAccessRequest(req.body);

      res.status(202).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
};
