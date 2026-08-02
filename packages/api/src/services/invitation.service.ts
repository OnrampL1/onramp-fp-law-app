import {
  getPrismaClient,
  hashToken,
  generateRawToken,
  emailQueue,
} from "@starter-kit/shared";
import type { InvitationStatus, UserRole } from "@prisma/client";
import { createError } from "../middleware/error-handler";
import { auditService } from "./audit.service";

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

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
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

// Both the inviter's name and the organization's name live outside the
// Invitation row itself (invitedByUserId/organizationId are just FKs), so
// they're looked up here purely to populate the email — nothing about the
// invitation/token data model changes.
async function getInviterAndOrgNames(
  inviterId: string,
  organizationId: string,
): Promise<{ inviterName?: string; organizationName?: string }> {
  const [inviter, organization] = await Promise.all([
    prisma.user.findUnique({ where: { id: inviterId }, select: { fullName: true } }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
  ]);

  return {
    inviterName: inviter?.fullName,
    organizationName: organization?.name,
  };
}

async function sendInvitationEmail(params: {
  email: string;
  fullName?: string;
  inviterName?: string;
  organizationName?: string;
  rawToken: string;
}): Promise<void> {
  await emailQueue.add("invitation", {
    to: params.email,
    subject: "You've been invited to join Clausio",
    template: "invitation",
    variables: {
      // Invitation.fullName isn't persisted (the invitee sets their own name
      // at acceptance time) — only present when sending the original invite.
      ...(params.fullName && { fullName: params.fullName }),
      ...(params.inviterName && { inviterName: params.inviterName }),
      ...(params.organizationName && { organizationName: params.organizationName }),
      // The invitee types this into the general /register page themselves —
      // no unique per-invitation link, so the token has to be visible text
      // rather than embedded in a URL.
      token: params.rawToken,
      registerUrl: `${APP_URL}/register`,
    },
  });
}

export class InvitationService {
  async createInvitation(
    actor: Actor,
    input: CreateInvitationInput,
    requestContext: RequestContext = {},
  ) {
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

      await auditService.logEvent(tx, {
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action: "USER_INVITED",
        targetEntityType: "Invitation",
        targetEntityId: created.id,
        newValue: { email: input.email, role: input.role },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return created;
    });

    const { inviterName, organizationName } = await getInviterAndOrgNames(
      actor.id,
      actor.organizationId,
    );

    await sendInvitationEmail({
      email: input.email,
      fullName: input.fullName,
      inviterName,
      organizationName,
      rawToken,
    });

    return toPublicInvitation(invitation);
  }

  async listInvitations(organizationId: string, { page, limit }: PaginationInput) {
    // PENDING invitations are actionable in the main roster; EXPIRED ones are
    // surfaced separately (invitation history) so an admin can still find and
    // resend them. ACCEPTED (now a User) and REVOKED (terminal, no further
    // action) are intentionally excluded from both views.
    const listedStatuses: InvitationStatus[] = ["PENDING", "EXPIRED"];
    const where = {
      organizationId,
      status: { in: listedStatuses },
    };

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

    const { inviterName, organizationName } = await getInviterAndOrgNames(
      updated.invitedByUserId,
      updated.organizationId,
    );

    await sendInvitationEmail({
      email: updated.email,
      inviterName,
      organizationName,
      rawToken,
    });

    return toPublicInvitation(updated);
  }

  async revokeInvitation(
    actor: Actor,
    invitationId: string,
    requestContext: RequestContext = {},
  ) {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: actor.organizationId },
    });

    if (!invitation) {
      throw createError("Invitation not found", 404);
    }
    if (invitation.status !== "PENDING") {
      throw createError("Only a pending invitation can be revoked", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const revoked = await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedByUserId: actor.id,
        },
      });

      await auditService.logEvent(tx, {
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action: "INVITATION_REVOKED",
        targetEntityType: "Invitation",
        targetEntityId: invitation.id,
        oldValue: { status: "PENDING" },
        newValue: { status: "REVOKED" },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return revoked;
    });

    return toPublicInvitation(updated);
  }

  /**
   * Proactive sweep for invitations whose expiresAt has passed while still
   * PENDING — today expiry is otherwise only enforced lazily, at accept time
   * (see auth.service.ts). Not wired to a scheduler yet; see the invitation
   * lifecycle review for the tradeoffs on how to trigger this periodically.
   * No AuditLog entry is written here: there is no INVITATION_EXPIRED action
   * in the AuditAction enum today (schema change, not made unilaterally).
   */
  async expireStaleInvitations(): Promise<number> {
    const { count } = await prisma.invitation.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });

    return count;
  }
}

export const invitationService = new InvitationService();
