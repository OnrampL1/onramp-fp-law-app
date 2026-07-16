import {
  getPrismaClient,
  hashToken,
  generateRawToken,
  emailQueue,
} from "@starter-kit/shared";
import type { UserRole } from "@prisma/client";
import { createError } from "../middleware/error-handler";

const prisma = getPrismaClient();

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

interface PaginationInput {
  page: number;
  limit: number;
}

interface Actor {
  id: string;
  organizationId: string;
}

interface CreateInvitationInput {
  email: string;
  fullName: string;
  role: UserRole;
}

function toPublicInvitation(invitation: {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  };
}

async function sendInvitationEmail(params: {
  email: string;
  fullName?: string;
  rawToken: string;
}): Promise<void> {
  await emailQueue.add("invitation", {
    to: params.email,
    subject: "You've been invited to Clausio",
    template: "invitation",
    variables: {
      // Invitation.fullName isn't persisted (the invitee sets their own name
      // at acceptance time) — only present when sending the original invite.
      ...(params.fullName && { fullName: params.fullName }),
      acceptUrl: `${APP_URL}/accept-invitation?token=${params.rawToken}`,
    },
  });
}

export class InvitationService {
  async createInvitation(actor: Actor, input: CreateInvitationInput) {
    const [existingUser, existingInvitation] = await Promise.all([
      prisma.user.findUnique({ where: { email: input.email } }),
      prisma.invitation.findFirst({
        where: {
          organizationId: actor.organizationId,
          email: input.email,
          status: "PENDING",
        },
      }),
    ]);

    if (existingUser) {
      throw createError("A user with this email already exists", 409);
    }
    if (existingInvitation) {
      throw createError("An invitation is already pending for this email", 409);
    }

    const rawToken = generateRawToken();
    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.invitation.create({
        data: {
          organizationId: actor.organizationId,
          invitedByUserId: actor.id,
          email: input.email,
          role: input.role,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorType: "USER",
          actorUserId: actor.id,
          action: "USER_INVITED",
          targetEntityType: "Invitation",
          targetEntityId: created.id,
          newValue: { email: input.email, role: input.role },
        },
      });

      return created;
    });

    await sendInvitationEmail({
      email: input.email,
      fullName: input.fullName,
      rawToken,
    });

    return toPublicInvitation(invitation);
  }

  async listInvitations(organizationId: string, { page, limit }: PaginationInput) {
    const where = { organizationId, status: "PENDING" as const };

    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invitation.count({ where }),
    ]);

    return {
      data: invitations.map(toPublicInvitation),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async resendInvitation(actor: Actor, invitationId: string) {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: actor.organizationId },
    });

    if (!invitation) {
      throw createError("Invitation not found", 404);
    }
    if (invitation.status === "ACCEPTED") {
      throw createError("This invitation has already been accepted", 409);
    }
    if (invitation.status === "REVOKED") {
      throw createError("This invitation has been revoked", 409);
    }

    const rawToken = generateRawToken();
    const updated = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "PENDING",
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    await sendInvitationEmail({ email: updated.email, rawToken });

    return toPublicInvitation(updated);
  }
}

export const invitationService = new InvitationService();
