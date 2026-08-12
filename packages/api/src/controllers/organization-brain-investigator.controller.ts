import type { Request, Response, NextFunction } from "express";
import { organizationBrainInvestigatorService } from "../services/organization-brain-investigator.service";
import type { AskOrganizationBrainBody } from "../schemas/organization-brain-investigator.schemas";

async function ask(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as AskOrganizationBrainBody;

    const result = await organizationBrainInvestigatorService.ask(
      req.user!.orgId,
      body,
    );

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export const organizationBrainInvestigatorController = { ask };
