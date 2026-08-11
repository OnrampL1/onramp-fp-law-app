import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/express.types";
import { contractInvestigatorService } from "../services/contract-investigator.service";
import type { ContractIdParam } from "../schemas/contract.schemas";
import type { AskInvestigatorBody } from "../schemas/contract-investigator.schemas";

async function ask(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: contractId } = req.params as unknown as ContractIdParam;
    const body = req.body as AskInvestigatorBody;

    const result = await contractInvestigatorService.ask(
      contractId,
      req.user.orgId,
      body,
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export const contractInvestigatorController = { ask };
