import { Prisma, type OrganizationAccessRequest } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import type { SubmitAccessRequestInput } from "../schemas/access-request.schemas";

const prisma = getPrismaClient();

type SubmissionOutcome =
  | "CREATED"
  | "UPDATED"
  | "RESUBMITTED"
  | "APPROVED_NOOP";

function toPublicSubmissionResponse(outcome: SubmissionOutcome) {
  return {
    message: "If eligible, your access request has been submitted for review.",
    outcome,
  };
}

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
      const result = await prisma.$transaction(async (tx) => {
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

          return toPublicSubmissionResponse("CREATED");
        }

        if (existing.status === "APPROVED") {
          return toPublicSubmissionResponse("APPROVED_NOOP");
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

        return toPublicSubmissionResponse(
          existing.status === "DECLINED" ? "RESUBMITTED" : "UPDATED",
        );
      });

      return result;
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
}

export const accessRequestService = new AccessRequestService();

export type AccessRequestSubmissionResponse = Awaited<
  ReturnType<AccessRequestService["submitAccessRequest"]>
>;
