import type { Prisma, NotificationType } from "@prisma/client";
import type { UserNotificationPreferences } from "@starter-kit/shared";
import { notificationRepository } from "../repositories/notification.repository";
import type {
  ListNotificationsQuery,
  UpdateNotificationPreferencesInput,
} from "../schemas/notification.schemas";
import type {
  NotificationItemDto,
  NotificationListResult,
} from "../types/notification.types";

interface NotificationDataPayload {
  contractTitle: string;
  occurredAt: string;
  severity?: string;
  category?: string;
  flagCount?: number;
}

function toDto(row: {
  id: string;
  type: NotificationType;
  scope: "ORG" | "PERSONAL";
  contractId: string | null;
  data: Prisma.JsonValue;
  read: boolean;
  readAt: Date | null;
}): NotificationItemDto {
  const data = row.data as unknown as NotificationDataPayload;

  return {
    id: row.id,
    type: row.type,
    scope: row.scope,
    contractId: row.contractId!,
    contractTitle: data.contractTitle,
    occurredAt: data.occurredAt,
    severity: data.severity,
    category: data.category,
    flagCount: data.flagCount,
    read: row.read,
    readAt: row.readAt?.toISOString() ?? null,
  };
}

async function listNotifications(
  userId: string,
  query: ListNotificationsQuery,
): Promise<NotificationListResult> {
  const { rows, total } = await notificationRepository.list(
    userId,
    {
      scope: query.scope,
      type: query.type,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    },
    { page: query.page, limit: query.limit },
  );

  return {
    data: rows.map(toDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

async function markRead(
  userId: string,
  id: string,
): Promise<NotificationItemDto | null> {
  const row = await notificationRepository.markRead(id, userId);
  return row ? toDto(row) : null;
}

async function markAllRead(userId: string): Promise<{ updatedCount: number }> {
  const result = await notificationRepository.markAllRead(userId);
  return { updatedCount: result.count };
}

async function getPersonalPreferences(
  userId: string,
): Promise<UserNotificationPreferences> {
  const user = await notificationRepository.getUserPreferences(userId);
  return (user.notificationPreferences as UserNotificationPreferences | null) ?? {};
}

async function updatePersonalPreferences(
  userId: string,
  input: UpdateNotificationPreferencesInput,
): Promise<UserNotificationPreferences> {
  const current = await getPersonalPreferences(userId);
  const next = { ...current, ...input };
  const updated = await notificationRepository.updateUserPreferences(userId, next);
  return (updated.notificationPreferences as UserNotificationPreferences | null) ?? {};
}

export const notificationService = {
  listNotifications,
  markRead,
  markAllRead,
  getPersonalPreferences,
  updatePersonalPreferences,
};
