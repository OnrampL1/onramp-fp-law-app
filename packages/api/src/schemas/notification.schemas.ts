import { NotificationScope, NotificationType } from "@prisma/client";
import { z } from "zod";

// Default limit (10) matches the bell dropdown's pre-persistence cap so an
// unparameterized GET /notifications keeps today's dropdown behavior; the
// "View all" panel passes its own page/limit explicitly, same as the audit
// log's dedicated filters do.
export const listNotificationsQuerySchema = z.object({
  scope: z.nativeEnum(NotificationScope).optional(),
  type: z
    .union([z.nativeEnum(NotificationType), z.array(z.nativeEnum(NotificationType))])
    .optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const updateNotificationPreferencesSchema = z.object({
  contractExpiring: z.boolean().optional(),
  aiAnalysisCompleted: z.boolean().optional(),
  riskFlagsDetected: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
