import { Prisma, type OrganizationStatus } from "@prisma/client";
import { getPrismaClient, hashPassword } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import type {
  CreatePlatformOrganizationInput,
  ListPlatformOrganizationsQuery,
  AssignPlatformOrganizationOwnerInput,
} from "../schemas/platform-organization.schemas";
import { auditService } from "./audit.service";

const prisma = getPrismaClient();

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PlatformActor {
  id: string;
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function buildOrganizationWhere(input: {
  search?: string;
  status?: OrganizationStatus;
}): Prisma.OrganizationWhereInput {
  return {
    ...(input.status && { status: input.status }),
    ...(input.search && {
      OR: [
        { name: { contains: input.search, mode: "insensitive" } },
        { slug: { contains: input.search, mode: "insensitive" } },
      ],
    }),
  };
}

function toOrganizationListItem(
  organization: Awaited<
    ReturnType<typeof findOrganizations>
  >["organizations"][number],
) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    ownerAssignedAt: toIso(organization.ownerAssignedAt),
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    owner: organization.ownerUser
      ? {
          id: organization.ownerUser.id,
          email: organization.ownerUser.email,
          fullName: organization.ownerUser.fullName,
          status: organization.ownerUser.status,
        }
      : null,
    counts: {
      members: organization._count.members,
      invitations: organization._count.invitations,
      contracts: organization._count.contracts,
    },
  };
}

async function findOrganizations(query: ListPlatformOrganizationsQuery) {
  const where = buildOrganizationWhere({
    search: query.search,
    status: query.status,
  });

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        ownerUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
          },
        },
        _count: {
          select: {
            members: true,
            invitations: true,
            contracts: true,
          },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return { organizations, total };
}

export class PlatformOrganizationService {
  async assignFirstOwner(
    actor: PlatformActor,
    organizationId: string,
    input: AssignPlatformOrganizationOwnerInput,
    requestContext: RequestContext = {},
  ) {
    const [existingUser, existingPlatformUser] = await Promise.all([
      prisma.user.findUnique({ where: { email: input.email } }),
      prisma.platformUser.findUnique({ where: { email: input.email } }),
    ]);

    if (existingUser || existingPlatformUser) {
      throw createError("Email is already in use", 409);
    }

    const passwordHash = await hashPassword(input.password);

    try {
      const organization = await prisma.$transaction(async (tx) => {
        const current = await tx.organization.findUnique({
          where: { id: organizationId },
        });

        if (!current) {
          throw createError("Organization not found", 404);
        }

        if (current.ownerUserId || current.status !== "CREATED") {
          throw createError(
            "First owner can only be assigned to a newly created organization",
            409,
          );
        }

        const owner = await tx.user.create({
          data: {
            organizationId: current.id,
            email: input.email,
            passwordHash,
            fullName: input.fullName,
            role: "OWNER",
            status: "ACTIVE",
          },
        });

        const updated = await tx.organization.update({
          where: { id: current.id },
          data: {
            ownerUserId: owner.id,
            ownerAssignedAt: new Date(),
            status: "OWNER_ASSIGNED",
          },
          include: {
            ownerUser: {
              select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                status: true,
              },
            },
            _count: {
              select: {
                members: true,
                invitations: true,
                contracts: true,
                auditLogs: true,
              },
            },
          },
        });

        await auditService.logEvent(tx, {
          organizationId: updated.id,
          actorType: "PLATFORM_USER",
          actorPlatformUserId: actor.id,
          action: "OWNER_ASSIGNED",
          targetEntityType: "Organization",
          targetEntityId: updated.id,
          oldValue: {
            status: current.status,
            ownerUserId: current.ownerUserId,
          },
          newValue: {
            status: updated.status,
            ownerUserId: owner.id,
            ownerEmail: owner.email,
          },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
        });

        return updated;
      });

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
        ownerAssignedAt: toIso(organization.ownerAssignedAt),
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
        owner: organization.ownerUser
          ? {
              id: organization.ownerUser.id,
              email: organization.ownerUser.email,
              fullName: organization.ownerUser.fullName,
              role: organization.ownerUser.role,
              status: organization.ownerUser.status,
            }
          : null,
        counts: {
          members: organization._count.members,
          invitations: organization._count.invitations,
          contracts: organization._count.contracts,
          auditLogs: organization._count.auditLogs,
        },
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw createError("Email is already in use", 409);
      }

      throw err;
    }
  }

  async createOrganization(
    actor: PlatformActor,
    input: CreatePlatformOrganizationInput,
    requestContext: RequestContext = {},
  ) {
    try {
      const organization = await prisma.$transaction(async (tx) => {
        const created = await tx.organization.create({
          data: {
            name: input.name,
            slug: input.slug,
            status: "CREATED",
            settings: {
              create: {
                timezone: input.timezone,
                language: input.language,
              },
            },
          },
          include: {
            ownerUser: {
              select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                status: true,
              },
            },
            _count: {
              select: {
                members: true,
                invitations: true,
                contracts: true,
                auditLogs: true,
              },
            },
          },
        });

        await auditService.logEvent(tx, {
          organizationId: created.id,
          actorType: "PLATFORM_USER",
          actorPlatformUserId: actor.id,
          action: "ORGANIZATION_CREATED",
          targetEntityType: "Organization",
          targetEntityId: created.id,
          newValue: {
            name: created.name,
            slug: created.slug,
            status: created.status,
          },
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
        });

        return created;
      });

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
        ownerAssignedAt: toIso(organization.ownerAssignedAt),
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
        owner: null,
        counts: {
          members: organization._count.members,
          invitations: organization._count.invitations,
          contracts: organization._count.contracts,
          auditLogs: organization._count.auditLogs,
        },
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw createError("Organization slug is already in use", 409);
      }

      throw err;
    }
  }

  async listOrganizations(query: ListPlatformOrganizationsQuery): Promise<{
    data: ReturnType<typeof toOrganizationListItem>[];
    pagination: Pagination;
  }> {
    const { organizations, total } = await findOrganizations(query);

    return {
      data: organizations.map(toOrganizationListItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getOrganization(id: string) {
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        ownerUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
          },
        },
        _count: {
          select: {
            members: true,
            invitations: true,
            contracts: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!organization) {
      throw createError("Organization not found", 404);
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      ownerAssignedAt: toIso(organization.ownerAssignedAt),
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
      owner: organization.ownerUser
        ? {
            id: organization.ownerUser.id,
            email: organization.ownerUser.email,
            fullName: organization.ownerUser.fullName,
            role: organization.ownerUser.role,
            status: organization.ownerUser.status,
          }
        : null,
      counts: {
        members: organization._count.members,
        invitations: organization._count.invitations,
        contracts: organization._count.contracts,
        auditLogs: organization._count.auditLogs,
      },
    };
  }
}

export const platformOrganizationService = new PlatformOrganizationService();
