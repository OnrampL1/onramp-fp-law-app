import crypto from "node:crypto";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import {
  deleteFile,
  getPresignedUrl,
  getPrismaClient,
  isAdminRole,
  isOwnerRole,
  uploadFile,
  type OrganizationNotificationPreferences,
} from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import {
  ALLOWED_ORGANIZATION_LOGO_EXTENSIONS,
  ORGANIZATION_LOGO_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
} from "../constants/organization-logo.constants";
import type { UpdateOrganizationSettingsInput } from "../schemas/settings.schemas";

const prisma = getPrismaClient();

interface SettingsActor {
  userId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "INTERNAL";
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

type AuditSnapshot = Record<string, Prisma.InputJsonValue | null>;

function hasPngSignature(buffer: Buffer): boolean {
  return buffer
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function hasJpegSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
}

function hasWebpSignature(buffer: Buffer): boolean {
  return (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function validateUploadedLogoFile(file: Express.Multer.File): void {
  if (file.size === 0 || file.buffer.length === 0) {
    throw createError("Organization logo file cannot be empty", 422);
  }

  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".png" && !hasPngSignature(file.buffer)) {
    throw createError("Uploaded PNG file is invalid", 422);
  }

  if (
    (extension === ".jpg" || extension === ".jpeg") &&
    !hasJpegSignature(file.buffer)
  ) {
    throw createError("Uploaded JPEG file is invalid", 422);
  }

  if (extension === ".webp" && !hasWebpSignature(file.buffer)) {
    throw createError("Uploaded WebP file is invalid", 422);
  }

  const hasAllowedExtension = ALLOWED_ORGANIZATION_LOGO_EXTENSIONS.some(
    (allowedExtension) => allowedExtension === extension,
  );

  if (!hasAllowedExtension) {
    throw createError("Unsupported organization logo file type", 422);
  }
}

function sanitizeLogoFileName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, extension);
  const safeBaseName = baseName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${safeBaseName || "organization-logo"}${extension}`;
}

function createOrganizationLogoStorageKey({
  organizationId,
  fileName,
}: {
  organizationId: string;
  fileName: string;
}): string {
  return `organization-logos/${organizationId}/${crypto.randomUUID()}-${fileName}`;
}

async function toOrganizationSettingsResponse(
  organization: NonNullable<
    Awaited<ReturnType<typeof findOrganizationWithSettings>>
  >,
) {
  const role = organization.members[0]?.role;
  const logoStorageKey = organization.settings?.logoStorageKey ?? null;

  const logoUrl = logoStorageKey
    ? await getPresignedUrl(
        logoStorageKey,
        ORGANIZATION_LOGO_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
      )
    : null;

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
      logoUrl,
      logoUrlExpiresInSeconds: logoUrl
        ? ORGANIZATION_LOGO_DOWNLOAD_URL_EXPIRES_IN_SECONDS
        : null,
      notificationPreferences:
        organization.settings?.notificationPreferences ?? null,
      branding: organization.settings?.branding ?? null,
    },
    permissions: {
      canManageSettings: role ? isAdminRole(role) : false,
      canRenameOrganization: role ? isOwnerRole(role) : false,
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

    return await toOrganizationSettingsResponse(organization);
  }

  async updateOrganizationSettings(
    actor: SettingsActor,
    input: UpdateOrganizationSettingsInput,
    requestContext: { ipAddress?: string; userAgent?: string },
  ) {
    const attemptsOrganizationRename = input.name !== undefined;

    if (!isAdminRole(actor.role)) {
      throw createError("Insufficient permissions", 403);
    }

    if (attemptsOrganizationRename && !isOwnerRole(actor.role)) {
      throw createError(
        "Only the organization owner can rename the organization",
        403,
      );
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

    // Merge with the existing value rather than replacing it outright — a
    // partial payload (e.g. only `riskAlerts`) must not silently drop the
    // other two keys, which would read back as "enabled" (see
    // isOrgNotificationEnabled's `!== false` semantics) even though they
    // were previously set to `false`.
    const currentNotificationPreferences =
      organization.settings?.notificationPreferences as
        | OrganizationNotificationPreferences
        | null
        | undefined;

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
          ...(input.notificationPreferences !== undefined && {
            notificationPreferences: {
              ...currentNotificationPreferences,
              ...input.notificationPreferences,
            },
          }),
        },
        create: {
          organizationId: actor.organizationId,
          timezone: input.timezone ?? "UTC",
          language: input.language ?? "en",
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

    return await toOrganizationSettingsResponse(updated);
  }

  async uploadOrganizationLogo(
    actor: SettingsActor,
    file: Express.Multer.File | undefined,
    requestContext: RequestContext,
  ) {
    if (!isAdminRole(actor.role)) {
      throw createError("Insufficient permissions", 403);
    }

    if (!file) {
      throw createError("Organization logo file is required", 422);
    }

    validateUploadedLogoFile(file);

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

    const previousStorageKey = organization.settings?.logoStorageKey ?? null;
    const sanitizedFileName = sanitizeLogoFileName(file.originalname);
    const storageKey = createOrganizationLogoStorageKey({
      organizationId: actor.organizationId,
      fileName: sanitizedFileName,
    });

    try {
      await uploadFile(storageKey, file.buffer, file.mimetype);
    } catch {
      throw createError("Could not store organization logo", 502);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.organizationSettings.upsert({
        where: { organizationId: actor.organizationId },
        update: { logoStorageKey: storageKey },
        create: {
          organizationId: actor.organizationId,
          logoStorageKey: storageKey,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorType: "USER",
          actorUserId: actor.userId,
          action: "ORGANIZATION_LOGO_UPLOADED",
          targetEntityType: "Organization",
          targetEntityId: actor.organizationId,
          oldValue: { logoStorageKey: previousStorageKey },
          newValue: { logoStorageKey: storageKey },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
        },
      });

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

    if (previousStorageKey) {
      try {
        await deleteFile(previousStorageKey);
      } catch {
        // The new logo is already persisted; a stale object left behind in
        // storage is not worth failing the request over.
      }
    }

    return await toOrganizationSettingsResponse(updated);
  }

  async deleteOrganizationLogo(
    actor: SettingsActor,
    requestContext: RequestContext,
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

    const storageKey = organization.settings?.logoStorageKey ?? null;

    if (!storageKey) {
      throw createError("Organization has no logo to delete", 404);
    }

    try {
      await deleteFile(storageKey);
    } catch {
      throw createError("Could not delete organization logo", 502);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.organizationSettings.update({
        where: { organizationId: actor.organizationId },
        data: { logoStorageKey: null },
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorType: "USER",
          actorUserId: actor.userId,
          action: "ORGANIZATION_LOGO_DELETED",
          targetEntityType: "Organization",
          targetEntityId: actor.organizationId,
          oldValue: { logoStorageKey: storageKey },
          newValue: { logoStorageKey: null },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
        },
      });

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

    return await toOrganizationSettingsResponse(updated);
  }
}

export const settingsService = new SettingsService();
