import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/express.types";
import { aiAnalysisService } from "../services/ai-analysis.service";
import type { ContractIdParam } from "../schemas/contract.schemas";
import type {
  AIAnalysisIdParam,
  ListAIAnalysesQuery,
} from "../schemas/ai-analysis.schemas";

async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId } = req.params as unknown as ContractIdParam;
    const { page, pageSize } = req.query as unknown as ListAIAnalysesQuery;

    const result = await aiAnalysisService.listAnalyses(
      contractId,
      req.user.orgId,
      { page, pageSize },
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId, analysisId } =
      req.params as unknown as AIAnalysisIdParam;

    const analysis = await aiAnalysisService.getAnalysisById(
      analysisId,
      contractId,
      req.user.orgId,
    );

    res.json({ data: analysis });
  } catch (error) {
    next(error);
  }
}

async function trigger(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId } = req.params as unknown as ContractIdParam;

    await aiAnalysisService.triggerAnalysis(
      contractId,
      req.user.orgId,
      req.user.userId,
    );

    res.status(202).json({ data: { message: "Analysis queued" } });
  } catch (error) {
    next(error);
  }
}

async function riskOverview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId } = req.params as unknown as ContractIdParam;

    const overview = await aiAnalysisService.getRiskOverview(
      contractId,
      req.user.orgId,
    );

    res.json({ data: overview });
  } catch (error) {
    next(error);
  }
}

async function summaryOverview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId } = req.params as unknown as ContractIdParam;

    const overview = await aiAnalysisService.getSummaryOverview(
      contractId,
      req.user.orgId,
    );

    res.json({ data: overview });
  } catch (error) {
    next(error);
  }
}

export const aiAnalysisController = {
  list,
  getById,
  trigger,
  riskOverview,
  summaryOverview,
};
