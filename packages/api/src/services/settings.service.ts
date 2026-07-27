import { getPrismaClient } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";

const prisma = getPrismaClient();

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
}

export const settingsService = new SettingsService();
