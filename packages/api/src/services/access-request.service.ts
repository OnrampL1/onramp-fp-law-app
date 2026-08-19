import { Prisma, type OrganizationAccessRequestStatus } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import type {
  ListAccessRequestsQuery,
  SubmitAccessRequestInput,
  ApproveAccessRequestInput,
  DeclineAccessRequestInput,
} from "../schemas/access-request.schemas";
import {
  createPlatformOrganizationInTransaction,
  type PlatformActor,
  type RequestContext,
} from "./platform-organization.service";

const prisma = getPrismaClient();

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

const PUBLIC_SUBMISSION_RESPONSE = {
  message: "If eligible, your access request has been submitted for review.",
};

function requestUpdateData(input: SubmitAccessRequestInput) {
  return {
    contactFirstName: input.contactFirstName,
    contactLastName: input.contactLastName,
    organizationName: input.organizationName,
    websiteUrl: input.websiteUrl,
    companySize: input.companySize,
    country: input.country,
    intendedUse: input.intendedUse,
    notes: input.notes,
  };
}

export class AccessRequestService {
  async submitAccessRequest(input: SubmitAccessRequestInput) {
    const contactEmail = input.contactEmail;

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.organizationAccessRequest.findUnique({
          where: { contactEmail },
        });

        if (!existing) {
          await tx.organizationAccessRequest.create({
            data: {
              ...requestUpdateData(input),
              contactEmail,
              status: "PENDING",
            },
          });

          return;
        }

        if (existing.status === "APPROVED") {
          return;
        }

        const data =
          existing.status === "DECLINED"
            ? {
                ...requestUpdateData(input),
                status: "PENDING" as const,
                reviewedAt: null,
                reviewedByPlatformUserId: null,
                declineReason: null,
              }
            : requestUpdateData(input);

        await tx.organizationAccessRequest.update({
          where: { id: existing.id },
          data,
        });
      });

      return PUBLIC_SUBMISSION_RESPONSE;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw createError("Please try submitting your request again.", 409);
      }

      throw err;
    }
  }

  async listAccessRequests(query: ListAccessRequestsQuery): Promise<{
    data: ReturnType<AccessRequestService["toPlatformAccessRequest"]>[];
    pagination: Pagination;
  }> {
    const where: Prisma.OrganizationAccessRequestWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          {
            contactEmail: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            organizationName: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            contactFirstName: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            contactLastName: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };

    const [accessRequests, total] = await Promise.all([
      prisma.organizationAccessRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          reviewedByPlatformUser: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      }),
      prisma.organizationAccessRequest.count({ where }),
    ]);

    return {
      data: accessRequests.map((request) =>
        this.toPlatformAccessRequest(request),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getAccessRequest(id: string) {
    const accessRequest = await prisma.organizationAccessRequest.findUnique({
      where: { id },
      include: {
        reviewedByPlatformUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!accessRequest) {
      throw createError("Access request not found", 404);
    }

    return this.toPlatformAccessRequest(accessRequest);
  }

  async approveAccessRequest(
    actor: PlatformActor,
    id: string,
    input: ApproveAccessRequestInput,
    requestContext: RequestContext = {},
  ) {
    try {
      const reviewedRequest = await prisma.$transaction(async (tx) => {
        const existingRequest = await tx.organizationAccessRequest.findUnique({
          where: { id },
        });

        if (!existingRequest) {
          throw createError("Access request not found", 404);
        }

        if (
          existingRequest.status !== "PENDING" ||
          existingRequest.organizationId
        ) {
          throw createError(
            "Only pending access requests can be approved",
            409,
          );
        }

        const organization = await createPlatformOrganizationInTransaction(
          tx,
          actor,
          input,
          requestContext,
          {
            name: input.name,
            slug: input.slug,
            status: "CREATED",
            source: "ACCESS_REQUEST",
            accessRequestId: existingRequest.id,
          },
        );

        const claimResult = await tx.organizationAccessRequest.updateMany({
          where: {
            id,
            status: "PENDING",
            organizationId: null,
          },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedByPlatformUserId: actor.id,
            organizationId: organization.id,
            declineReason: null,
          },
        });

        if (claimResult.count !== 1) {
          throw createError("Access request has already been reviewed", 409);
        }

        const updatedRequest = await tx.organizationAccessRequest.findUnique({
          where: { id },
          include: {
            reviewedByPlatformUser: {
              select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
        });

        if (!updatedRequest) {
          throw createError("Access request not found", 404);
        }

        return updatedRequest;
      });

      return this.toPlatformAccessRequest(reviewedRequest);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw createError("Organization slug is already in use", 409);
      }

      throw error;
    }
  }

  async declineAccessRequest(
    actor: PlatformActor,
    id: string,
    input: DeclineAccessRequestInput,
  ) {
    const reviewedRequest = await prisma.$transaction(async (tx) => {
      const existingRequest = await tx.organizationAccessRequest.findUnique({
        where: { id },
      });

      if (!existingRequest) {
        throw createError("Access request not found", 404);
      }

      if (
        existingRequest.status !== "PENDING" ||
        existingRequest.organizationId
      ) {
        throw createError("Only pending access requests can be declined", 409);
      }

      const claimResult = await tx.organizationAccessRequest.updateMany({
        where: {
          id,
          status: "PENDING",
          organizationId: null,
        },
        data: {
          status: "DECLINED",
          reviewedAt: new Date(),
          reviewedByPlatformUserId: actor.id,
          declineReason: input.declineReason ?? null,
        },
      });

      if (claimResult.count !== 1) {
        throw createError("Access request has already been reviewed", 409);
      }

      const updatedRequest = await tx.organizationAccessRequest.findUnique({
        where: { id },
        include: {
          reviewedByPlatformUser: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });

      if (!updatedRequest) {
        throw createError("Access request not found", 404);
      }

      return updatedRequest;
    });

    return this.toPlatformAccessRequest(reviewedRequest);
  }

  private toPlatformAccessRequest(
    accessRequest: Prisma.OrganizationAccessRequestGetPayload<{
      include: {
        reviewedByPlatformUser: {
          select: {
            id: true;
            email: true;
            fullName: true;
            role: true;
          };
        };
        organization: {
          select: {
            id: true;
            name: true;
            slug: true;
            status: true;
          };
        };
      };
    }>,
  ) {
    return {
      id: accessRequest.id,
      contactFirstName: accessRequest.contactFirstName,
      contactLastName: accessRequest.contactLastName,
      contactEmail: accessRequest.contactEmail,
      organizationName: accessRequest.organizationName,
      websiteUrl: accessRequest.websiteUrl,
      companySize: accessRequest.companySize,
      country: accessRequest.country,
      intendedUse: accessRequest.intendedUse,
      notes: accessRequest.notes,
      status: accessRequest.status as OrganizationAccessRequestStatus,
      reviewedAt: toIso(accessRequest.reviewedAt),
      declineReason: accessRequest.declineReason,
      organization: accessRequest.organization,
      reviewedByPlatformUser: accessRequest.reviewedByPlatformUser,
      createdAt: accessRequest.createdAt.toISOString(),
      updatedAt: accessRequest.updatedAt.toISOString(),
    };
  }
}

export const accessRequestService = new AccessRequestService();

export type AccessRequestSubmissionResponse = Awaited<
  ReturnType<AccessRequestService["submitAccessRequest"]>
>;
