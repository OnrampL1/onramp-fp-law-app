import type { Job } from "bullmq";
import type { Prisma } from "@prisma/client";
import {
  getPrismaClient,
  isOrgNotificationEnabled,
  isPersonalNotificationEnabled,
  type NotificationExpiringSweepJobData,
  type NotificationExpiringSweepJobResult,
  type OrganizationNotificationPreferences,
  type UserNotificationPreferences,
} from "@starter-kit/shared";

const prisma = getPrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_WINDOW_DAYS = 30;

interface NotificationCandidate {
  organizationId: string;
  userId: string;
  scope: "ORG";
  type: "CONTRACT_EXPIRING";
  targetEntityType: "Contract";
  targetEntityId: string;
  contractId: string;
  data: Prisma.InputJsonValue;
}

export async function processNotificationExpiringSweepJob(
  _job: Job<
    NotificationExpiringSweepJobData,
    NotificationExpiringSweepJobResult
  >,
): Promise<NotificationExpiringSweepJobResult> {
  const now = new Date();

  const expiringContracts = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      expirationDate: {
        gte: now,
        lte: new Date(now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS),
      },
    },
    select: { id: true, title: true, organizationId: true, expirationDate: true },
  });

  if (expiringContracts.length === 0) {
    return { createdCount: 0 };
  }

  const organizationIds = Array.from(
    new Set(expiringContracts.map((c) => c.organizationId)),
  );

  // Only ACTIVE members can act on a notification (INVITED/SUSPENDED/
  // DEACTIVATED users can't log in to see it), so they're excluded from
  // fan-out entirely rather than getting a row they can never read.
  const [activeUsers, orgSettings] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: { in: organizationIds }, status: "ACTIVE" },
      select: { id: true, organizationId: true, notificationPreferences: true },
    }),
    prisma.organizationSettings.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { organizationId: true, notificationPreferences: true },
    }),
  ]);

  const orgPreferencesById = new Map(
    orgSettings.map((s) => [
      s.organizationId,
      s.notificationPreferences as OrganizationNotificationPreferences | null,
    ]),
  );

  const usersByOrg = new Map<string, typeof activeUsers>();
  for (const user of activeUsers) {
    const bucket = usersByOrg.get(user.organizationId) ?? [];
    bucket.push(user);
    usersByOrg.set(user.organizationId, bucket);
  }

  // Bulk-fetch every (userId, contractId) pair that already has a
  // CONTRACT_EXPIRING row, then filter candidates in memory — one query
  // instead of one EXISTS check per candidate row. A contract sits in the
  // 30-day window for up to 30 daily runs; this caps each recipient to a
  // single notification per contract's expiring window, not one per day.
  const contractIds = expiringContracts.map((c) => c.id);
  const existing = await prisma.notification.findMany({
    where: { type: "CONTRACT_EXPIRING", contractId: { in: contractIds } },
    select: { userId: true, contractId: true },
  });
  const existingPairs = new Set(
    existing.map((n) => `${n.userId}:${n.contractId}`),
  );

  const candidates: NotificationCandidate[] = [];

  for (const contract of expiringContracts) {
    const orgPreferences = orgPreferencesById.get(contract.organizationId);
    if (!isOrgNotificationEnabled(orgPreferences, "CONTRACT_EXPIRING")) {
      continue;
    }

    const orgUsers = usersByOrg.get(contract.organizationId) ?? [];
    for (const user of orgUsers) {
      if (existingPairs.has(`${user.id}:${contract.id}`)) continue;

      const personalPreferences =
        user.notificationPreferences as UserNotificationPreferences | null;
      if (!isPersonalNotificationEnabled(personalPreferences, "CONTRACT_EXPIRING")) {
        continue;
      }

      candidates.push({
        organizationId: contract.organizationId,
        userId: user.id,
        scope: "ORG",
        type: "CONTRACT_EXPIRING",
        targetEntityType: "Contract",
        targetEntityId: contract.id,
        contractId: contract.id,
        data: {
          contractTitle: contract.title,
          occurredAt: contract.expirationDate!.toISOString(),
        },
      });
    }
  }

  if (candidates.length === 0) {
    return { createdCount: 0 };
  }

  const { count } = await prisma.notification.createMany({ data: candidates });

  console.info(`[notification-expiring-sweep] Created ${count} notification(s)`);

  return { createdCount: count };
}
