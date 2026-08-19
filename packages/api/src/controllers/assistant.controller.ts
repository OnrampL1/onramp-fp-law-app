import type { Request, Response, NextFunction } from "express";
import { assistantService } from "../services/assistant.service";
import type { AskAssistantBody } from "../schemas/assistant.schemas";

async function ask(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as AskAssistantBody;

    const result = await assistantService.ask(req.user!.orgId, body);

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export const assistantController = { ask };
