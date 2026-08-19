import type { Request, Response, NextFunction } from "express";
import { legalKbInvestigatorService } from "../services/legal-kb-investigator.service";
import type { AskLegalKbBody } from "../schemas/legal-kb-investigator.schemas";

async function ask(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as AskLegalKbBody;

    const result = await legalKbInvestigatorService.ask(req.user!.orgId, body);

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export const legalKbInvestigatorController = { ask };
