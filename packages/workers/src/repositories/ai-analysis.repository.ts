import {
  getPrismaClient,
  isOrgNotificationEnabled,
  isPersonalNotificationEnabled,
  type OrganizationNotificationPreferences,
  type RiskSchemaV3,
  type UserNotificationPreferences,
} from "@starter-kit/shared";
import type { NotificationType, Prisma } from "@prisma/client";

// Only HIGH/CRITICAL flags are worth an interruption — LOW/MEDIUM findings
// are still visible on the contract's risk tab, they just don't page the
// uploader. This is a judgment call (not specified anywhere in the domain
// docs), made to keep "risk alert" meaning an actionable alert rather than
// firing on every re-analysis that turns up a routine LOW flag.
const ALERT_WORTHY_SEVERITIES = ["HIGH", "CRITICAL"] as const;
const SEVERITY_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

const prisma = getPrismaClient();

type AnalysisType = "SUMMARY" | "RISK" | "CLAUSE_QUERY" | "METADATA";

export interface CompletedAnalysisInput {
  contractId: string;
  createdByUserId: string;
  organizationId: string;
  type: AnalysisType;
  promptUsed: string;
  promptVersion: string;
  schemaVersion: string;
  result: unknown;
  modelVersion: string;
  tokensUsed: number;
}

// Shared org-gate -> ACTIVE-status -> personal-gate check for both
// notification types below. PERSONAL scope always resolves to the
// contract's uploader — there's no reviewer/assignee concept in the domain
// model, so "for you" can only ever mean "you uploaded this".
async function isRecipientEligible(
  tx: Prisma.TransactionClient,
  organizationId: string,
  uploaderId: string,
  type: NotificationType,
): Promise<boolean> {
  const orgSettings = await tx.organizationSettings.findUnique({
    where: { organizationId },
    select: { notificationPreferences: true },
  });
  const orgPreferences =
    orgSettings?.notificationPreferences as OrganizationNotificationPreferences | null;
  if (!isOrgNotificationEnabled(orgPreferences, type)) return false;

  const recipient = await tx.user.findUnique({
    where: { id: uploaderId },
    select: { status: true, notificationPreferences: true },
  });
  if (!recipient || recipient.status !== "ACTIVE") return false;

  const personalPreferences =
    recipient.notificationPreferences as UserNotificationPreferences | null;
  return isPersonalNotificationEnabled(personalPreferences, type);
}

export async function markAnalysisCompleted(
  input: CompletedAnalysisInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const analysis = await tx.aIAnalysis.create({
      data: {
        contractId: input.contractId,
        createdByUserId: input.createdByUserId,
        type: input.type,
        status: "COMPLETED",
        promptUsed: input.promptUsed,
        promptVersion: input.promptVersion,
        schemaVersion: input.schemaVersion,
        result: input.result as Prisma.InputJsonValue,
        modelVersion: input.modelVersion,
        tokensUsed: input.tokensUsed,
      },
    });

    const contract = await tx.contract.findUnique({
      where: { id: input.contractId },
      select: { title: true, uploadedByUserId: true },
    });

    // RiskFlag always mirrors the *latest* completed RISK analysis for a
    // contract — re-analysis is an existing, supported flow (see
    // getRiskOverview's "latest by createdAt" read pattern), so previous
    // rows for this contract are replaced, not accumulated.
    if (input.type === "RISK") {
      const risk = input.result as RiskSchemaV3;

      await tx.riskFlag.deleteMany({
        where: { contractId: input.contractId },
      });

      if (risk.flags.length > 0) {
        await tx.riskFlag.createMany({
          data: risk.flags.map((flag) => ({
            organizationId: input.organizationId,
            contractId: input.contractId,
            analysisId: analysis.id,
            severity: flag.severity,
            category: flag.category,
            description: flag.description,
            sourceText: flag.sourceText,
          })),
        });
      }

      // RISK_FLAG_DETECTED — PERSONAL scope. Deliberately not fanned out
      // ORG-wide: a risk flag describes a specific contract's legal
      // exposure, which isn't every member's business by default — the
      // org-wide "riskAlerts" toggle in Settings still lets an admin mute
      // this for everyone, same as it already gates aiInsights, but the
      // notification itself only ever reaches someone who already has
      // access to the contract (its uploader).
      const alertWorthyFlags = risk.flags.filter((flag) =>
        (ALERT_WORTHY_SEVERITIES as readonly string[]).includes(flag.severity),
      );

      if (
        contract &&
        alertWorthyFlags.length > 0 &&
        (await isRecipientEligible(
          tx,
          input.organizationId,
          contract.uploadedByUserId,
          "RISK_FLAG_DETECTED",
        ))
      ) {
        const topFlag = alertWorthyFlags.reduce((top, flag) =>
          SEVERITY_RANK[flag.severity] > SEVERITY_RANK[top.severity] ? flag : top,
        );

        await tx.notification.create({
          data: {
            organizationId: input.organizationId,
            userId: contract.uploadedByUserId,
            actorUserId: input.createdByUserId,
            scope: "PERSONAL",
            type: "RISK_FLAG_DETECTED",
            targetEntityType: "Contract",
            targetEntityId: input.contractId,
            contractId: input.contractId,
            data: {
              contractTitle: contract.title,
              occurredAt: new Date().toISOString(),
              severity: topFlag.severity,
              category: topFlag.category,
              flagCount: alertWorthyFlags.length,
            },
          },
        });
      }
    }

    // AI_ANALYSIS_COMPLETED — fires for every completed analysis type
    // (SUMMARY/RISK/CLAUSE_QUERY/METADATA), independent of and in addition
    // to RISK_FLAG_DETECTED above; the two have separate preference toggles
    // in Settings on purpose, so a RISK completion with a critical flag can
    // produce both notifications.
    if (
      contract &&
      (await isRecipientEligible(
        tx,
        input.organizationId,
        contract.uploadedByUserId,
        "AI_ANALYSIS_COMPLETED",
      ))
    ) {
      await tx.notification.create({
        data: {
          organizationId: input.organizationId,
          userId: contract.uploadedByUserId,
          actorUserId: input.createdByUserId,
          scope: "PERSONAL",
          type: "AI_ANALYSIS_COMPLETED",
          targetEntityType: "Contract",
          targetEntityId: input.contractId,
          contractId: input.contractId,
          data: {
            contractTitle: contract.title,
            occurredAt: new Date().toISOString(),
          },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorType: "SYSTEM",
        action: "AI_ANALYSIS_COMPLETED",
        targetEntityType: "AIAnalysis",
        targetEntityId: analysis.id,
        contractId: input.contractId,
        newValue: { type: input.type, status: "COMPLETED" },
      },
    });
  });
}

export interface FailedAnalysisInput {
  contractId: string;
  createdByUserId: string;
  organizationId: string;
  type: AnalysisType;
  promptUsed: string;
  errorMessage: string;
}

export async function markAnalysisFailed(
  input: FailedAnalysisInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const analysis = await tx.aIAnalysis.create({
      data: {
        contractId: input.contractId,
        createdByUserId: input.createdByUserId,
        type: input.type,
        status: "FAILED",
        promptUsed: input.promptUsed,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorType: "SYSTEM",
        action: "AI_ANALYSIS_FAILED",
        targetEntityType: "AIAnalysis",
        targetEntityId: analysis.id,
        contractId: input.contractId,
        newValue: {
          type: input.type,
          status: "FAILED",
          error: input.errorMessage,
        },
      },
    });
  });
}
