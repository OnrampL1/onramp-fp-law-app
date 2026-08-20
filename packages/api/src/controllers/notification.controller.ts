import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/express.types";
import { notificationService } from "../services/notification.service";
import { createError } from "../middleware/error-handler";
import type { ListNotificationsQuery } from "../schemas/notification.schemas";

async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListNotificationsQuery;
    const result = await notificationService.listNotifications(
      req.user.userId,
      query,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function markRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const notification = await notificationService.markRead(
      req.user.userId,
      req.params.id as string,
    );
    if (!notification) {
      throw createError("Notification not found", 404);
    }
    res.json({ data: notification });
  } catch (error) {
    next(error);
  }
}

async function markAllRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await notificationService.markAllRead(req.user.userId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

async function getPreferences(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const preferences = await notificationService.getPersonalPreferences(
      req.user.userId,
    );
    res.json({ data: preferences });
  } catch (error) {
    next(error);
  }
}

async function updatePreferences(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const preferences = await notificationService.updatePersonalPreferences(
      req.user.userId,
      req.body,
    );
    res.json({ data: preferences });
  } catch (error) {
    next(error);
  }
}

export const notificationController = {
  list,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
};
