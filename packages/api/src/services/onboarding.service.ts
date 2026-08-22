import { Prisma, type UserRole } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import { auditService } from "./audit.service";
import type { CompleteOrganizationOnboardingInput } from "../schemas/onboarding.schemas";

const prisma = getPrismaClient();

interface OnboardingActor {
  userId: string;
  organizationId: string;
  role: UserRole;
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

type OrganizationWithSettings = Prisma.OrganizationGetPayload<{
  include: {
    settings: true;
  };
}>;

function isAssignedOwner(
  organization: OrganizationWithSettings,
  actor: OnboardingActor,
): boolean {
  return actor.role === "OWNER" && organization.ownerUserId === actor.userId;
}

function onboardingRequired(
  organization: OrganizationWithSettings,
  actor: OnboardingActor,
): boolean {
  return (
    organization.status === "OWNER_ASSIGNED" &&
    isAssignedOwner(organization, actor)
  );
}

function toOnboardingResponse(
  organization: OrganizationWithSettings,
  actor: OnboardingActor,
) {
  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      onboardingRequired: onboardingRequired(organization, actor),
    },
    settings: {
      timezone: organization.settings?.timezone ?? "UTC",
      language: organization.settings?.language ?? "en",
      notificationPreferences:
        organization.settings?.notificationPreferences ?? null,
    },
    permissions: {
      canCompleteOnboarding:
        organization.status === "OWNER_ASSIGNED" &&
        isAssignedOwner(organization, actor),
    },
  };
}

function assertReadableOnboardingState(
  organization: OrganizationWithSettings,
  actor: OnboardingActor,
): void {
  if (organization.status === "ACTIVE") {
    return;
  }

  if (
    organization.status === "OWNER_ASSIGNED" &&
    isAssignedOwner(organization, actor)
  ) {
    return;
  }

  throw createError("Organization is not active", 403);
}

function assertCanCompleteOnboarding(
  organization: OrganizationWithSettings,
  actor: OnboardingActor,
): void {
  if (!isAssignedOwner(organization, actor)) {
    throw createError(
      "Only the assigned organization owner can complete onboarding",
      403,
    );
  }

  if (organization.status === "ACTIVE") {
    return;
  }

  if (organization.status === "OWNER_ASSIGNED") {
    return;
  }

  throw createError("Organization is not ready for onboarding", 409);
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function pickSettingsAuditValues(
  organization: OrganizationWithSettings,
  input: CompleteOrganizationOnboardingInput,
) {
  const oldValue: Record<string, Prisma.InputJsonValue | null> = {};
  const newValue: Record<string, Prisma.InputJsonValue | null> = {};

  if (organization.name !== input.name) {
    oldValue.name = organization.name;
    newValue.name = input.name;
  }

  const currentTimezone = organization.settings?.timezone ?? "UTC";
  if (currentTimezone !== input.timezone) {
    oldValue.timezone = currentTimezone;
    newValue.timezone = input.timezone;
  }

  const currentLanguage = organization.settings?.language ?? "en";
  if (currentLanguage !== input.language) {
    oldValue.language = currentLanguage;
    newValue.language = input.language;
  }

  const currentNotificationPreferences =
    organization.settings?.notificationPreferences ?? null;
  const nextNotificationPreferences = input.notificationPreferences ?? null;

  if (!jsonEqual(currentNotificationPreferences, nextNotificationPreferences)) {
    oldValue.notificationPreferences =
      currentNotificationPreferences as Prisma.InputJsonValue | null;
    newValue.notificationPreferences =
      nextNotificationPreferences as Prisma.InputJsonValue | null;
  }

  return { oldValue, newValue };
}

export class OnboardingService {
  async getOrganizationOnboarding(actor: OnboardingActor) {
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      include: { settings: true },
    });

    if (!organization) {
      throw createError("Organization not found", 404);
    }

    assertReadableOnboardingState(organization, actor);

    return toOnboardingResponse(organization, actor);
  }

  async completeOrganizationOnboarding(
    actor: OnboardingActor,
    input: CompleteOrganizationOnboardingInput,
    requestContext: RequestContext = {},
  ) {
    const current = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      include: { settings: true },
    });

    if (!current) {
      throw createError("Organization not found", 404);
    }

    assertCanCompleteOnboarding(current, actor);

    if (current.status === "ACTIVE") {
      return toOnboardingResponse(current, actor);
    }

    const { oldValue, newValue } = pickSettingsAuditValues(current, input);

    const completed = await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: current.id },
        data: {
          name: input.name,
          status: "ACTIVE",
        },
      });

      await tx.organizationSettings.upsert({
        where: { organizationId: current.id },
        update: {
          timezone: input.timezone,
          language: input.language,
          notificationPreferences:
            input.notificationPreferences ?? Prisma.JsonNull,
        },
        create: {
          organizationId: current.id,
          timezone: input.timezone,
          language: input.language,
          notificationPreferences:
            input.notificationPreferences ?? Prisma.JsonNull,
        },
      });

      if (Object.keys(newValue).length > 0) {
        await auditService.logEvent(tx, {
          organizationId: current.id,
          actorType: "USER",
          actorUserId: actor.userId,
          action: "ORGANIZATION_SETTINGS_UPDATED",
          targetEntityType: "Organization",
          targetEntityId: current.id,
          oldValue,
          newValue,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
        });
      }

      await auditService.logEvent(tx, {
        organizationId: current.id,
        actorType: "USER",
        actorUserId: actor.userId,
        action: "ORGANIZATION_ACTIVATED",
        targetEntityType: "Organization",
        targetEntityId: current.id,
        oldValue: { status: current.status },
        newValue: { status: "ACTIVE", source: "OWNER_ONBOARDING" },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return tx.organization.findUniqueOrThrow({
        where: { id: current.id },
        include: { settings: true },
      });
    });

    return toOnboardingResponse(completed, actor);
  }
}

export const onboardingService = new OnboardingService();
