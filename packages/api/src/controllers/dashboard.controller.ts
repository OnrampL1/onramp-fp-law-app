import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/express.types";
import { dashboardService } from "../services/dashboard.service";

async function summary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await dashboardService.getSummary(req.user.orgId);

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export const dashboardController = {
  summary,
};
