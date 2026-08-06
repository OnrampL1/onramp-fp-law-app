import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/express.types";
import { notificationService } from "../services/notification.service";

async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await notificationService.listNotifications(req.user.orgId);
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
}

export const notificationController = {
  list,
};
