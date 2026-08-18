import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import type { SubmitAccessRequestInput } from "../schemas/access-request.schemas";

const prisma = getPrismaClient();

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
}

export const accessRequestService = new AccessRequestService();

export type AccessRequestSubmissionResponse = Awaited<
  ReturnType<AccessRequestService["submitAccessRequest"]>
>;
