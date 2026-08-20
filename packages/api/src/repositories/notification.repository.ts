import { Prisma, type NotificationType } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";

const prisma = getPrismaClient();

export interface NotificationFilters {
  scope?: "ORG" | "PERSONAL";
  type?: NotificationType | NotificationType[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  actorUserId?: string;
  scope: "ORG" | "PERSONAL";
  type: NotificationType;
  targetEntityType: string;
  targetEntityId: string;
  contractId?: string;
  data?: Prisma.InputJsonValue;
}

function buildWhere(
  userId: string,
  filters: NotificationFilters,
): Prisma.NotificationWhereInput {
  return {
    userId,
    ...(filters.scope && { scope: filters.scope }),
    ...(filters.type && {
      type: Array.isArray(filters.type) ? { in: filters.type } : filters.type,
    }),
    ...((filters.dateFrom || filters.dateTo) && {
      createdAt: {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo && { lte: filters.dateTo }),
      },
    }),
  };
}

// The single write path for a PERSONAL-scope notification created inside an
// existing transaction (see ai-analysis.repository.ts's create()) — takes
// `tx` so the notification write can never land outside the same
// transaction as the event it documents, same invariant as
// auditService.logEvent.
async function create(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
) {
  return tx.notification.create({ data: input });
}

async function list(
  userId: string,
  filters: NotificationFilters,
  { page, limit }: PaginationInput,
) {
  const where = buildWhere(userId, filters);

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return { rows, total };
}

async function markRead(id: string, userId: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId, read: false },
    data: { read: true, readAt: new Date() },
  });

  if (result.count === 0) return null;

  return prisma.notification.findFirst({ where: { id, userId } });
}

async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

async function getUserPreferences(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { notificationPreferences: true },
  });
}

async function updateUserPreferences(
  userId: string,
  preferences: Prisma.InputJsonValue,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { notificationPreferences: preferences },
    select: { notificationPreferences: true },
  });
}

export const notificationRepository = {
  create,
  list,
  markRead,
  markAllRead,
  getUserPreferences,
  updateUserPreferences,
};
