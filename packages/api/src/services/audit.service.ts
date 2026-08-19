import { getPrismaClient } from "@starter-kit/shared";
import type { AuditAction, AuditActorType, Prisma } from "@prisma/client";

const prisma = getPrismaClient();

interface AuditLogFilters {
  contractId?: string;
  actorUserId?: string;
  action?: AuditAction | AuditAction[];
  dateFrom?: Date;
  dateTo?: Date;
}

interface PaginationInput {
  page: number;
  limit: number;
}

// The single write path every domain service should call to record an
// audit event. `tx` is required (not optional) so a caller can't
// accidentally fire-and-forget an audit write outside the same
// transaction as the mutation it documents — every existing write site
// commits both in one `prisma.$transaction`, and this keeps that
// invariant impossible to violate by construction rather than by
// convention. As Contract/Note/Witness/AI domains get built, wiring up
// their audit trail should be exactly one call to this method from
// inside their own transaction — no bespoke `tx.auditLog.create` needed.
//
// A route-level "auditMiddleware" was considered instead (per the
// Blueprint) but doesn't fit here: it would run after the route handler
// resolves, outside the mutation's transaction, breaking the
// write-inside-the-same-transaction guarantee above. It also can't see
// the before/after values services compute internally (e.g. the previous
// role before a role change) without reaching back into response bodies.
export interface AuditEventInput {
  organizationId: string;
  actorType?: AuditActorType;
  actorUserId?: string;
  actorPlatformUserId?: string;
  action: AuditAction;
  targetEntityType: string;
  targetEntityId: string;
  contractId?: string;
  witnessInvitationId?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

// Resolves targetEntityId -> a human-readable label, batched per
// targetEntityType so a page of results costs one query per type instead
// of one per row. Only types with a registered resolver get a label;
// everything else falls back to the raw id client-side. Add an entry
// here (not a one-off in the frontend) when a new domain's target type
// should display a name instead of a UUID.
type TargetResolver = (
  ids: string[],
  organizationId: string,
) => Promise<Map<string, string>>;

const TARGET_RESOLVERS: Partial<Record<string, TargetResolver>> = {
  User: async (ids, organizationId) => {
    const users = await prisma.user.findMany({
      where: { id: { in: ids }, organizationId },
      select: { id: true, fullName: true },
    });
    return new Map(users.map((u) => [u.id, u.fullName]));
  },
  Contract: async (ids, organizationId) => {
    const contracts = await prisma.contract.findMany({
      where: { id: { in: ids }, organizationId },
      select: { id: true, title: true },
    });
    return new Map(contracts.map((c) => [c.id, c.title]));
  },
  OrganizationBrainItem: async (ids, organizationId) => {
    const items = await prisma.organizationBrainItem.findMany({
      where: { id: { in: ids }, organizationId },
      select: { id: true, title: true },
    });
    return new Map(items.map((item) => [item.id, item.title]));
  },
  // WitnessInvitation has no organizationId of its own — it's scoped to the
  // org through its Contract, same as every other witness query.
  WitnessInvitation: async (ids, organizationId) => {
    const invitations = await prisma.witnessInvitation.findMany({
      where: { id: { in: ids }, contract: { organizationId } },
      select: { id: true, witnessEmail: true, witnessName: true },
    });
    return new Map(
      invitations.map((w) => [w.id, w.witnessName ?? w.witnessEmail]),
    );
  },
};

export class AuditService {
  async logEvent(
    tx: Prisma.TransactionClient,
    input: AuditEventInput,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorType: input.actorType ?? "USER",
        actorUserId: input.actorUserId,
        actorPlatformUserId: input.actorPlatformUserId,
        action: input.action,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        contractId: input.contractId,
        witnessInvitationId: input.witnessInvitationId,
        oldValue: input.oldValue,
        newValue: input.newValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async listAuditLogs(
    organizationId: string,
    filters: AuditLogFilters,
    { page, limit }: PaginationInput,
  ) {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(filters.contractId && { contractId: filters.contractId }),
      ...(filters.actorUserId && { actorUserId: filters.actorUserId }),
      ...(filters.action && {
        action: Array.isArray(filters.action)
          ? { in: filters.action }
          : filters.action,
      }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        },
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = await this.withTargetDisplayNames(rows, organizationId);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async withTargetDisplayNames<
    T extends { targetEntityType: string; targetEntityId: string },
  >(
    rows: T[],
    organizationId: string,
  ): Promise<(T & { targetDisplayName: string | null })[]> {
    const idsByType = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!TARGET_RESOLVERS[row.targetEntityType]) continue;
      const ids = idsByType.get(row.targetEntityType) ?? new Set<string>();
      ids.add(row.targetEntityId);
      idsByType.set(row.targetEntityType, ids);
    }

    const namesByTypeAndId = new Map<string, Map<string, string>>();
    await Promise.all(
      Array.from(idsByType.entries()).map(async ([type, ids]) => {
        const resolver = TARGET_RESOLVERS[type]!;
        namesByTypeAndId.set(
          type,
          await resolver(Array.from(ids), organizationId),
        );
      }),
    );

    return rows.map((row) => ({
      ...row,
      targetDisplayName:
        namesByTypeAndId.get(row.targetEntityType)?.get(row.targetEntityId) ??
        null,
    }));
  }
}

export const auditService = new AuditService();
