import {
  getPrismaClient,
  hashToken,
  generateRawToken,
  signWitnessSessionToken,
  emailQueue,
  getPresignedUrl,
} from "@starter-kit/shared";
import { createError } from "../middleware/error-handler";
import { WITNESS_CONTRACT_SELECT } from "../repositories/selects/contract.select";
import { auditService } from "./audit.service";

// Short-lived — this URL is handed to an unauthenticated external party,
// so it should only be usable for roughly as long as the page that
// requested it is actually open, not indefinitely.
const WITNESS_FILE_URL_EXPIRES_IN_SECONDS = 15 * 60;

// createWitnessLinkSchema's own default for expiresInHours — reused here
// because a resend has no per-request expiry input of its own (unlike
// creation) and the original expiresInHours isn't persisted on the row.
const WITNESS_RESEND_EXPIRES_IN_HOURS = 72;

const prisma = getPrismaClient();

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

interface Actor {
  id: string;
  organizationId: string;
}

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface CreateWitnessLinkInput {
  contractId: string;
  witnessEmail: string;
  witnessName?: string;
  expiresInHours: number;
  sendEmail: boolean;
}

// Both the issuer's name and the organization's name live outside the
// WitnessInvitation row itself, so they're looked up purely to populate the
// email — mirrors getInviterAndOrgNames in invitation.service.ts.
async function getIssuerAndOrgNames(
  issuerId: string,
  organizationId: string,
): Promise<{ issuerName?: string; organizationName?: string }> {
  const [issuer, organization] = await Promise.all([
    prisma.user.findUnique({ where: { id: issuerId }, select: { fullName: true } }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
  ]);

  return {
    issuerName: issuer?.fullName,
    organizationName: organization?.name,
  };
}

async function sendWitnessEmail(params: {
  witnessEmail: string;
  witnessName?: string | null;
  issuerName?: string;
  organizationName?: string;
  contractTitle: string;
  witnessUrl: string;
  expiresAt: Date;
}): Promise<void> {
  await emailQueue.add("witness", {
    to: params.witnessEmail,
    subject: "You've been invited to witness a contract on Clausio",
    template: "witness",
    variables: {
      ...(params.witnessName && { witnessName: params.witnessName }),
      ...(params.issuerName && { issuerName: params.issuerName }),
      ...(params.organizationName && { organizationName: params.organizationName }),
      contractTitle: params.contractTitle,
      witnessUrl: params.witnessUrl,
      expiresAt: params.expiresAt.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    },
  });
}

interface ListWitnessLinksFilters {
  contractId?: string;
}

interface PaginationInput {
  page: number;
  limit: number;
}

function toPublicContractPreview(contract: {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: string;
  legalState: string | null;
  expirationDate: Date | null;
}) {
  // Deliberately minimal — this is a preview shown alongside "you're about
  // to review X", not the scoped read view itself (notes/AI analyses/full
  // file are never part of this, per BR-8, and building the actual witness
  // contract-read endpoint is a separate follow-up step).
  return {
    id: contract.id,
    title: contract.title,
    counterparty: contract.counterparty,
    businessStatus: contract.businessStatus,
    legalState: contract.legalState,
    expirationDate: contract.expirationDate,
  };
}

type PublicWitnessStatus = "pending" | "used" | "revoked" | "expired";

// Only the list view needs this — the three mutation methods below always
// know their own resulting status outright (just-created is trivially
// "pending", just-redeemed is "used", just-revoked is "revoked"). Listing
// has to derive it live because expiry is never written back to the status
// column by any scheduled process (same as invitations' expireStaleInvitations
// not being wired to a scheduler) — so a row can be well past expiresAt while
// its stored status still says ISSUED.
function deriveWitnessStatus(row: {
  isRevoked: boolean;
  status: string;
  expiresAt: Date;
}): PublicWitnessStatus {
  if (row.isRevoked) return "revoked";
  if (row.status === "USED") return "used";
  if (row.expiresAt.getTime() < Date.now()) return "expired";
  return "pending";
}

function toPublicWitnessToken(
  invitation: {
    id: string;
    contractId: string;
    witnessEmail: string;
    witnessName: string | null;
    expiresAt: Date;
    createdAt: Date;
    emailSentAt: Date | null;
  },
  status: PublicWitnessStatus,
  // Only present at creation — WitnessToken.token in openapi.yaml is
  // explicitly "only present in the create-witness-link response"; the
  // raw token is never persisted, so redemption has nothing to hand back.
  rawToken: string | null,
) {
  return {
    id: invitation.id,
    contractId: invitation.contractId,
    token: rawToken,
    witnessUrl: rawToken ? `${APP_URL}/witness/${rawToken}` : null,
    witnessEmail: invitation.witnessEmail,
    witnessName: invitation.witnessName,
    status,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    emailSentAt: invitation.emailSentAt,
  };
}

function toPublicWitnessListItem(row: {
  id: string;
  contractId: string;
  contract: { title: string };
  witnessEmail: string;
  witnessName: string | null;
  issuedBy: { id: string; fullName: string };
  status: string;
  isRevoked: boolean;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  emailSentAt: Date | null;
}) {
  return {
    id: row.id,
    contractId: row.contractId,
    contractTitle: row.contract.title,
    witnessEmail: row.witnessEmail,
    witnessName: row.witnessName,
    issuedBy: row.issuedBy,
    // No `token`/`witnessUrl` here, ever — only the hash is persisted, so
    // there is no raw link to show for a row that wasn't just created in
    // this same request. Matches WitnessToken.token in openapi.yaml being
    // "only present in the create-witness-link response."
    status: deriveWitnessStatus(row),
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    createdAt: row.createdAt,
    emailSentAt: row.emailSentAt,
  };
}

export class WitnessService {
  async listWitnessLinks(
    organizationId: string,
    filters: ListWitnessLinksFilters,
    { page, limit }: PaginationInput,
  ) {
    // WitnessInvitation has no organizationId column — scoped through its
    // Contract, same as revocation and the audit resolver.
    const where = {
      contract: { organizationId },
      ...(filters.contractId && { contractId: filters.contractId }),
    };

    const [rows, total] = await Promise.all([
      prisma.witnessInvitation.findMany({
        where,
        include: {
          contract: { select: { title: true } },
          issuedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.witnessInvitation.count({ where }),
    ]);

    return {
      data: rows.map(toPublicWitnessListItem),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // Real, org-scoped counts backing the Witness Workflow page's KPI cards
  // and review-progress funnel — no historical snapshotting exists, so the
  // "last 7 days" figures are new-occurrence counts (created/used/newly
  // expired in that window), not true before/after deltas.
  async getWitnessLinkStats(organizationId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const scope = { contract: { organizationId } };
    // Same isRevoked-before-status precedence as deriveWitnessStatus, so
    // these counts stay consistent with what every row already displays as
    // (e.g. a used-then-revoked invitation counts as revoked, not used).
    const notRevoked = { ...scope, isRevoked: false };
    // pending/expired are split by expiresAt alone (status != USED), not by
    // status: "ISSUED" — WitnessStatus has a real EXPIRED value in the schema
    // (seed data uses it), but nothing in the app ever writes it; expiry is
    // always derived live, same as deriveWitnessStatus. Filtering on
    // status: "ISSUED" would silently drop any row stored as EXPIRED from
    // both buckets, undercounting relative to total.
    const notUsed = { status: { not: "USED" as const } };

    const [
      total,
      totalNewLast7Days,
      pending,
      used,
      usedThisMonth,
      usedLast7Days,
      expired,
      expiredNewLast7Days,
      revoked,
    ] = await Promise.all([
      prisma.witnessInvitation.count({ where: scope }),
      prisma.witnessInvitation.count({ where: { ...scope, createdAt: { gte: sevenDaysAgo } } }),
      prisma.witnessInvitation.count({
        where: { ...notRevoked, ...notUsed, expiresAt: { gte: now } },
      }),
      prisma.witnessInvitation.count({ where: { ...notRevoked, status: "USED" } }),
      prisma.witnessInvitation.count({
        where: { ...notRevoked, status: "USED", usedAt: { gte: startOfMonth } },
      }),
      prisma.witnessInvitation.count({
        where: { ...notRevoked, status: "USED", usedAt: { gte: sevenDaysAgo } },
      }),
      prisma.witnessInvitation.count({
        where: { ...notRevoked, ...notUsed, expiresAt: { lt: now } },
      }),
      prisma.witnessInvitation.count({
        where: {
          ...notRevoked,
          ...notUsed,
          expiresAt: { gte: sevenDaysAgo, lt: now },
        },
      }),
      prisma.witnessInvitation.count({ where: { ...scope, isRevoked: true } }),
    ]);

    return {
      total,
      totalNewLast7Days,
      active: pending + used,
      pending,
      used,
      usedThisMonth,
      usedLast7Days,
      expired,
      expiredNewLast7Days,
      revoked,
    };
  }

  async createWitnessLink(
    actor: Actor,
    input: CreateWitnessLinkInput,
    requestContext: RequestContext = {},
  ) {
    // Tenant isolation must never rely on frontend filtering (or on trusting
    // a client-supplied contractId) — confirm the contract actually belongs
    // to the actor's organization, and isn't soft-deleted, before issuing
    // any access to it.
    const contract = await prisma.contract.findFirst({
      where: { id: input.contractId, organizationId: actor.organizationId, deletedAt: null },
    });

    if (!contract) {
      throw createError("Contract not found", 404);
    }

    // Same "active" definition deriveWitnessStatus uses for the list view's
    // "pending" status: not revoked, not yet used, not yet expired. Blocking
    // on it here prevents a contract+witness pair from ever having two
    // simultaneously-usable links outstanding.
    const existingActiveLink = await prisma.witnessInvitation.findFirst({
      where: {
        contractId: contract.id,
        witnessEmail: input.witnessEmail,
        isRevoked: false,
        status: { not: "USED" },
        expiresAt: { gt: new Date() },
      },
    });

    if (existingActiveLink) {
      throw createError(
        "An active witness link already exists for this contract and witness",
        409,
      );
    }

    const rawToken = generateRawToken();
    const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);

    let invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.witnessInvitation.create({
        data: {
          contractId: contract.id,
          issuedByUserId: actor.id,
          witnessEmail: input.witnessEmail,
          witnessName: input.witnessName,
          tokenHash: hashToken(rawToken),
          expiresAt,
        },
      });

      await auditService.logEvent(tx, {
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action: "WITNESS_INVITATION_CREATED",
        targetEntityType: "WitnessInvitation",
        targetEntityId: created.id,
        contractId: contract.id,
        witnessInvitationId: created.id,
        newValue: { witnessEmail: input.witnessEmail, expiresAt, emailSent: input.sendEmail },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return created;
    });

    // Sent after the transaction commits, same as invitation.service.ts's
    // sendInvitationEmail — rawToken is only ever in scope here, never
    // persisted, so this is the one chance to embed it in the email. Not
    // wrapped in try/catch: a failed enqueue surfaces as a 500 even though
    // the invitation row already exists, matching the same known asymmetry
    // the invitation flow already has.
    if (input.sendEmail) {
      const { issuerName, organizationName } = await getIssuerAndOrgNames(
        actor.id,
        actor.organizationId,
      );

      await sendWitnessEmail({
        witnessEmail: input.witnessEmail,
        witnessName: input.witnessName,
        issuerName,
        organizationName,
        contractTitle: contract.title,
        witnessUrl: `${APP_URL}/witness/${rawToken}`,
        expiresAt,
      });

      invitation = await prisma.witnessInvitation.update({
        where: { id: invitation.id },
        data: { emailSentAt: new Date() },
      });
    }

    return toPublicWitnessToken(invitation, "pending", rawToken);
  }

  async redeemWitnessLink(rawToken: string, requestContext: RequestContext = {}) {
    // Looked up by hash, same as invitation redemption — the raw token is
    // never persisted, so it can never be compared to directly.
    const invitation = await prisma.witnessInvitation.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { contract: true },
    });

    if (!invitation) {
      throw createError("Witness link not found", 404);
    }

    if (invitation.isRevoked) {
      throw createError("This witness link has been revoked", 410);
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw createError("This witness link has expired", 410);
    }

    if (invitation.status !== "ISSUED") {
      throw createError("This witness link has already been used", 410);
    }

    const sessionToken = await prisma.$transaction(async (tx) => {
      // The single-use guard: Postgres evaluates this WHERE clause against
      // the row's current state as part of the UPDATE itself, so of two
      // concurrent redemptions of the same link, only one can ever flip
      // ISSUED -> USED. The loser gets count 0 back, not an exception —
      // checked explicitly rather than assumed.
      const { count } = await tx.witnessInvitation.updateMany({
        where: { id: invitation.id, status: "ISSUED" },
        data: { status: "USED", usedAt: new Date() },
      });

      if (count !== 1) {
        throw createError("This witness link has already been used", 410);
      }

      await auditService.logEvent(tx, {
        organizationId: invitation.contract.organizationId,
        // No User/PlatformUser actor exists — a witness is never a member
        // and has no account (BR-4). The witnessInvitationId is how this
        // event is tied back to who actually accessed the contract.
        actorType: "SYSTEM",
        action: "WITNESS_ACCESSED",
        targetEntityType: "WitnessInvitation",
        targetEntityId: invitation.id,
        contractId: invitation.contractId,
        witnessInvitationId: invitation.id,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return signWitnessSessionToken(invitation.id);
    });

    return {
      sessionToken,
      contract: toPublicContractPreview(invitation.contract),
      witnessToken: toPublicWitnessToken(invitation, "used", null),
    };
  }

  async getWitnessScopedContract(contractId: string) {
    // contractId here is req.witnessSession.contractId, already resolved
    // and validated (not revoked/expired) by witnessSessionMiddleware from
    // the invitation row — never a client-supplied id. This query re-scopes
    // to it anyway (and to deletedAt: null) rather than trusting even a
    // value the middleware attached, matching the "never trust a client-
    // supplied contract id" principle all the way through.
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, deletedAt: null },
      select: WITNESS_CONTRACT_SELECT,
    });

    if (!contract) {
      throw createError("Contract not found", 404);
    }

    const fileUrl = await getPresignedUrl(
      contract.fileKey,
      WITNESS_FILE_URL_EXPIRES_IN_SECONDS,
    );

    return {
      id: contract.id,
      title: contract.title,
      counterparty: contract.counterparty,
      businessStatus: contract.businessStatus,
      legalState: contract.legalState,
      tags: contract.tags,
      effectiveDate: contract.effectiveDate,
      expirationDate: contract.expirationDate,
      processingStatus: contract.processingStatus,
      processingError: contract.processingError,
      extractedText: contract.extractedText,
      fileUrl,
      fileUrlExpiresInSeconds: WITNESS_FILE_URL_EXPIRES_IN_SECONDS,
    };
  }

  async revokeWitnessLink(
    actor: Actor,
    witnessInvitationId: string,
    requestContext: RequestContext = {},
  ) {
    // WitnessInvitation has no organizationId of its own — scoped through
    // its Contract, same as everywhere else this needs checking (audit
    // resolver, redemption's audit write). A cross-org id simply resolves
    // to nothing, never trusted from the client.
    const invitation = await prisma.witnessInvitation.findFirst({
      where: { id: witnessInvitationId, contract: { organizationId: actor.organizationId } },
      include: { contract: true },
    });

    if (!invitation) {
      throw createError("Witness invitation not found", 404);
    }

    // isRevoked — not status — is the field witnessSessionMiddleware and
    // redemption actually check to decide whether access is still allowed.
    // Guarding on it directly (rather than on status) is what makes this
    // correct for a USED invitation, not just an ISSUED one: a witness who
    // already redeemed the link may still be mid-session, and BR-8 requires
    // revocation to cut that off immediately — so USED must remain
    // revocable. Only an invitation that's already revoked is rejected;
    // that's the sole terminal state for this action.
    if (invitation.isRevoked) {
      throw createError("This witness invitation has already been revoked", 409);
    }

    const revoked = await prisma.$transaction(async (tx) => {
      const updated = await tx.witnessInvitation.update({
        where: { id: invitation.id },
        data: {
          isRevoked: true,
          // Status moves to the terminal REVOKED value regardless of
          // whether it was ISSUED or USED beforehand — usedAt is never
          // cleared, so "was this ever redeemed before being revoked"
          // remains visible in history even once status says REVOKED.
          status: "REVOKED",
        },
      });

      await auditService.logEvent(tx, {
        organizationId: actor.organizationId,
        actorUserId: actor.id,
        action: "WITNESS_INVITATION_REVOKED",
        targetEntityType: "WitnessInvitation",
        targetEntityId: invitation.id,
        contractId: invitation.contractId,
        witnessInvitationId: invitation.id,
        oldValue: { status: invitation.status, isRevoked: invitation.isRevoked },
        newValue: { status: "REVOKED", isRevoked: true },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
      });

      return updated;
    });

    return toPublicWitnessToken(revoked, "revoked", null);
  }

  // Mirrors invitation.service.ts's resendInvitation: rotates the token and
  // expiresAt rather than reusing the original (confirmed that's what that
  // method actually does, despite the token staying secret either way — a
  // rotated token invalidates anything already sent, which is the right
  // behavior when an admin explicitly asks to resend). No audit log entry
  // here either, matching resendInvitation — there's no WITNESS_INVITATION
  // _RESENT action in AuditAction, and resends aren't audited for user
  // invitations either.
  async resendWitnessLink(actor: Actor, witnessInvitationId: string) {
    const invitation = await prisma.witnessInvitation.findFirst({
      where: { id: witnessInvitationId, contract: { organizationId: actor.organizationId } },
      include: { contract: true },
    });

    if (!invitation) {
      throw createError("Witness invitation not found", 404);
    }
    if (invitation.isRevoked) {
      throw createError("This witness invitation has been revoked", 409);
    }
    if (invitation.status === "USED") {
      throw createError("This witness invitation has already been used", 409);
    }

    const rawToken = generateRawToken();
    const expiresAt = new Date(
      Date.now() + WITNESS_RESEND_EXPIRES_IN_HOURS * 60 * 60 * 1000,
    );

    const updated = await prisma.witnessInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ISSUED",
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    const { issuerName, organizationName } = await getIssuerAndOrgNames(
      updated.issuedByUserId,
      actor.organizationId,
    );

    await sendWitnessEmail({
      witnessEmail: updated.witnessEmail,
      witnessName: updated.witnessName,
      issuerName,
      organizationName,
      contractTitle: invitation.contract.title,
      witnessUrl: `${APP_URL}/witness/${rawToken}`,
      expiresAt,
    });

    const resent = await prisma.witnessInvitation.update({
      where: { id: updated.id },
      data: { emailSentAt: new Date() },
    });

    return toPublicWitnessToken(resent, "pending", rawToken);
  }
}

export const witnessService = new WitnessService();
