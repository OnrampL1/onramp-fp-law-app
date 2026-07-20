import type { Job } from "bullmq";
import { getPrismaClient } from "@starter-kit/shared";
import type {
  InvitationExpiryJobData,
  InvitationExpiryJobResult,
} from "@starter-kit/shared";

const prisma = getPrismaClient();

// Mirrors InvitationService.expireStaleInvitations in packages/api — kept as
// a direct Prisma query here (rather than importing the API service) since
// packages/workers has no dependency on packages/api and this is the only
// query it would need from it. No AuditLog entry is written: there is no
// INVITATION_EXPIRED action in the AuditAction enum today.
export async function processInvitationExpiryJob(
  _job: Job<InvitationExpiryJobData, InvitationExpiryJobResult>,
): Promise<InvitationExpiryJobResult> {
  const { count } = await prisma.invitation.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });

  if (count > 0) {
    console.info(`[invitation-expiry] Expired ${count} stale invitation(s)`);
  }

  return { expiredCount: count };
}
