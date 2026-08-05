import { notificationRepository } from "../repositories/notification.repository";
import type { NotificationItemDto } from "../types/notification.types";

const LIMIT_PER_TYPE = 5;
const TOTAL_LIMIT = 10;

async function listNotifications(
  organizationId: string,
): Promise<NotificationItemDto[]> {
  const [expiringContracts, recentAnalyses] = await Promise.all([
    notificationRepository.findExpiringContracts(organizationId, LIMIT_PER_TYPE),
    notificationRepository.findRecentCompletedAnalyses(
      organizationId,
      LIMIT_PER_TYPE,
    ),
  ]);

  // expirationDate is guaranteed non-null by the repository's where clause;
  // the filter just satisfies Prisma's nullable field type without an
  // unsafe assertion.
  const expiringItems: NotificationItemDto[] = expiringContracts
    .filter((contract) => contract.expirationDate !== null)
    .map((contract) => ({
      id: `contract-expiring:${contract.id}`,
      type: "CONTRACT_EXPIRING",
      contractId: contract.id,
      contractTitle: contract.title,
      occurredAt: contract.expirationDate!.toISOString(),
    }));

  const analysisItems: NotificationItemDto[] = recentAnalyses.map(
    (analysis) => ({
      id: `ai-analysis-completed:${analysis.id}`,
      type: "AI_ANALYSIS_COMPLETED",
      contractId: analysis.contractId,
      contractTitle: analysis.contract.title,
      occurredAt: analysis.createdAt.toISOString(),
    }),
  );

  // Expiring-soon first (more actionable), then recent analyses, capped.
  return [...expiringItems, ...analysisItems].slice(0, TOTAL_LIMIT);
}

export const notificationService = {
  listNotifications,
};
