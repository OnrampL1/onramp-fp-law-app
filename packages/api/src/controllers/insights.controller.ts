import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/express.types";
import { insightsService } from "../services/insights.service";
import type { InsightCategoryParam } from "../schemas/insights.schemas";

async function summary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await insightsService.getSummary(req.user.orgId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

async function contractsByCategory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { category } = req.params as unknown as InsightCategoryParam;
    const result = await insightsService.getContractsForCategory(
      req.user.orgId,
      category,
    );
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export const insightsController = {
  summary,
  contractsByCategory,
};
