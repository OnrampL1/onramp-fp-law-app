import {
  Prisma,
  type ContractBusinessStatus,
  type ContractLegalState,
} from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";

const prisma = getPrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;
const RECENT_CONTRACTS_LIMIT = 5;
const EXPIRING_CONTRACTS_LIMIT = 5;

export const DASHBOARD_CONTRACT_SELECT = {
  id: true,
  title: true,
  counterparty: true,
  businessStatus: true,
  legalState: true,
  effectiveDate: true,
  expirationDate: true,
  updatedAt: true,
} satisfies Prisma.ContractSelect;

export type DashboardContractRow = Prisma.ContractGetPayload<{
  select: typeof DASHBOARD_CONTRACT_SELECT;
}>;

export interface DashboardLegalStateCountRow {
  legalState: ContractLegalState | null;
  count: number;
}

export interface DashboardBusinessStatusCountRow {
  businessStatus: ContractBusinessStatus;
  count: number;
}

export interface DashboardSummaryRows {
  total: number;
  legalStateCounts: DashboardLegalStateCountRow[];
  businessStatusCounts: DashboardBusinessStatusCountRow[];
  expiringSoonCount: number;
  recentContracts: DashboardContractRow[];
  expiringContracts: DashboardContractRow[];
}

function activeContractWhere(
  organizationId: string,
): Prisma.ContractWhereInput {
  return {
    organizationId,
    deletedAt: null,
  };
}

function todayUtcDate(): Date {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

async function getSummaryRows(
  organizationId: string,
): Promise<DashboardSummaryRows> {
  const today = todayUtcDate();
  const expiringSoonEnd = new Date(
    today.getTime() + EXPIRING_SOON_DAYS * DAY_MS,
  );

  const baseWhere = activeContractWhere(organizationId);

  const expiringSoonWhere: Prisma.ContractWhereInput = {
    ...baseWhere,
    businessStatus: { not: "ARCHIVED" },
    expirationDate: {
      gte: today,
      lte: expiringSoonEnd,
    },
  };

  const [
    total,
    legalStateGroups,
    businessStatusGroups,
    expiringSoonCount,
    recentContracts,
    expiringContracts,
  ] = await Promise.all([
    prisma.contract.count({
      where: baseWhere,
    }),

    prisma.contract.groupBy({
      by: ["legalState"],
      where: baseWhere,
      _count: { _all: true },
    }),

    prisma.contract.groupBy({
      by: ["businessStatus"],
      where: baseWhere,
      _count: { _all: true },
    }),

    prisma.contract.count({
      where: expiringSoonWhere,
    }),

    prisma.contract.findMany({
      where: baseWhere,
      select: DASHBOARD_CONTRACT_SELECT,
      orderBy: { updatedAt: "desc" },
      take: RECENT_CONTRACTS_LIMIT,
    }),

    prisma.contract.findMany({
      where: expiringSoonWhere,
      select: DASHBOARD_CONTRACT_SELECT,
      orderBy: { expirationDate: "asc" },
      take: EXPIRING_CONTRACTS_LIMIT,
    }),
  ]);

  return {
    total,
    legalStateCounts: legalStateGroups.map((row) => ({
      legalState: row.legalState,
      count: row._count._all,
    })),
    businessStatusCounts: businessStatusGroups.map((row) => ({
      businessStatus: row.businessStatus,
      count: row._count._all,
    })),
    expiringSoonCount,
    recentContracts,
    expiringContracts,
  };
}

export const dashboardRepository = {
  getSummaryRows,
};
