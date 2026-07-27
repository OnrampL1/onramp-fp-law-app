import type { Prisma } from "@prisma/client";
import { getPrismaClient, isAdminRole } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import type { UpdateOrganizationSettingsInput } from "../schemas/settings.schemas";

const prisma = getPrismaClient();

interface SettingsActor {
  userId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "INTERNAL";
}

type AuditSnapshot = Record<string, Prisma.InputJsonValue | null>;

function toOrganizationSettingsResponse(
  organization: NonNullable<
    Awaited<ReturnType<typeof findOrganizationWithSettings>>
  >,
) {
  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
    },
    settings: {
      timezone: organization.settings?.timezone ?? "UTC",
      language: organization.settings?.language ?? "en",
      logoUrl: organization.settings?.logoUrl ?? null,
      notificationPreferences:
        organization.settings?.notificationPreferences ?? null,
      branding: organization.settings?.branding ?? null,
    },
    permissions: {
      canManageSettings:
        organization.members[0]?.role === "OWNER" ||
        organization.members[0]?.role === "ADMIN",
    },
  };
}

async function findOrganizationWithSettings(
  organizationId: string,
  userId: string,
) {
  return prisma.organization.findFirst({
    where: {
      id: organizationId,
      members: {
        some: {
          id: userId,
          organizationId,
          status: "ACTIVE",
        },
      },
    },
    include: {
      settings: true,
      members: {
        where: {
          id: userId,
          organizationId,
          status: "ACTIVE",
        },
        select: {
          role: true,
        },
        take: 1,
      },
    },
  });
}

function pickChangedValues(
  current: Awaited<ReturnType<typeof findOrganizationWithSettings>>,
  input: UpdateOrganizationSettingsInput,
) {
  if (!current) {
    return { oldValue: {}, newValue: {} };
  }

  const oldValue: AuditSnapshot = {};
  const newValue: AuditSnapshot = {};

  if (input.name !== undefined && input.name !== current.name) {
    oldValue.name = current.name;
    newValue.name = input.name;
  }

  if (
    input.timezone !== undefined &&
    input.timezone !== (current.settings?.timezone ?? "UTC")
  ) {
    oldValue.timezone = current.settings?.timezone ?? "UTC";
    newValue.timezone = input.timezone;
  }

  if (
    input.language !== undefined &&
    input.language !== (current.settings?.language ?? "en")
  ) {
    oldValue.language = current.settings?.language ?? "en";
    newValue.language = input.language;
  }

  if (
    input.logoUrl !== undefined &&
    input.logoUrl !== (current.settings?.logoUrl ?? null)
  ) {
    oldValue.logoUrl = current.settings?.logoUrl ?? null;
    newValue.logoUrl = input.logoUrl;
  }

  if (input.notificationPreferences !== undefined) {
    oldValue.notificationPreferences =
      current.settings?.notificationPreferences ?? null;
    newValue.notificationPreferences = input.notificationPreferences;
  }

  return { oldValue, newValue };
}

export class SettingsService {
  async getOrganizationSettings(userId: string, organizationId: string) {
    const organization = await findOrganizationWithSettings(
      organizationId,
      userId,
    );

    if (!organization) {
      throw createError("Organization settings not found", 404);
    }

    if (organization.status !== "ACTIVE") {
      throw createError("Organization is not active", 403);
    }

    return toOrganizationSettingsResponse(organization);
  }

  async updateOrganizationSettings(
    actor: SettingsActor,
    input: UpdateOrganizationSettingsInput,
    requestContext: { ipAddress?: string; userAgent?: string },
  ) {
    if (!isAdminRole(actor.role)) {
      throw createError("Insufficient permissions", 403);
    }

    const organization = await findOrganizationWithSettings(
      actor.organizationId,
      actor.userId,
    );

    if (!organization) {
      throw createError("Organization settings not found", 404);
    }

    if (organization.status !== "ACTIVE") {
      throw createError("Organization is not active", 403);
    }

    const { oldValue, newValue } = pickChangedValues(organization, input);

    const updated = await prisma.$transaction(async (tx) => {
      if (input.name !== undefined) {
        await tx.organization.update({
          where: { id: actor.organizationId },
          data: { name: input.name },
        });
      }

      await tx.organizationSettings.upsert({
        where: { organizationId: actor.organizationId },
        update: {
          ...(input.timezone !== undefined && { timezone: input.timezone }),
          ...(input.language !== undefined && { language: input.language }),
          ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
          ...(input.notificationPreferences !== undefined && {
            notificationPreferences: input.notificationPreferences,
          }),
        },
        create: {
          organizationId: actor.organizationId,
          timezone: input.timezone ?? "UTC",
          language: input.language ?? "en",
          logoUrl: input.logoUrl,
          notificationPreferences: input.notificationPreferences,
        },
      });

      if (Object.keys(newValue).length > 0) {
        await tx.auditLog.create({
          data: {
            organizationId: actor.organizationId,
            actorType: "USER",
            actorUserId: actor.userId,
            action: "ORGANIZATION_SETTINGS_UPDATED",
            targetEntityType: "Organization",
            targetEntityId: actor.organizationId,
            oldValue,
            newValue,
            ipAddress: requestContext.ipAddress,
            userAgent: requestContext.userAgent,
          },
        });
      }

      return tx.organization.findFirstOrThrow({
        where: { id: actor.organizationId },
        include: {
          settings: true,
          members: {
            where: {
              id: actor.userId,
              organizationId: actor.organizationId,
              status: "ACTIVE",
            },
            select: { role: true },
            take: 1,
          },
        },
      });
    });

    return toOrganizationSettingsResponse(updated);
  }
}

export const settingsService = new SettingsService();
