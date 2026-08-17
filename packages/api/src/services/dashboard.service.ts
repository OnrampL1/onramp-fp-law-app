import { dashboardRepository } from "../repositories/dashboard.repository";
import type { DashboardContractRow } from "../repositories/dashboard.repository";
import type {
  DashboardBusinessStatusCounts,
  DashboardContractItemDto,
  DashboardLegalStateCounts,
  DashboardSummaryDto,
} from "../types/dashboard.types";

function emptyLegalStateCounts(): DashboardLegalStateCounts {
  return {
    DRAFT: 0,
    ACTIVE: 0,
    EXPIRED: 0,
    TERMINATED: 0,
    UNSET: 0,
  };
}

function emptyBusinessStatusCounts(): DashboardBusinessStatusCounts {
  return {
    DRAFT: 0,
    UNDER_REVIEW: 0,
    COMPLETED: 0,
    ARCHIVED: 0,
  };
}

function toDateOnlyString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function toContractItemDto(
  row: DashboardContractRow,
): DashboardContractItemDto {
  return {
    id: row.id,
    title: row.title,
    counterparty: row.counterparty,
    businessStatus: row.businessStatus,
    legalState: row.legalState,
    effectiveDate: toDateOnlyString(row.effectiveDate),
    expirationDate: toDateOnlyString(row.expirationDate),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getSummary(
  organizationId: string,
): Promise<DashboardSummaryDto> {
  const rows = await dashboardRepository.getSummaryRows(organizationId);

  const legalStateCounts = emptyLegalStateCounts();
  for (const row of rows.legalStateCounts) {
    legalStateCounts[row.legalState ?? "UNSET"] = row.count;
  }

  const businessStatusCounts = emptyBusinessStatusCounts();
  for (const row of rows.businessStatusCounts) {
    businessStatusCounts[row.businessStatus] = row.count;
  }

  return {
    contracts: {
      total: rows.total,
      legalStateCounts,
      businessStatusCounts,
      expiringSoonCount: rows.expiringSoonCount,
      recent: rows.recentContracts.map(toContractItemDto),
      expiringSoon: rows.expiringContracts.map(toContractItemDto),
    },
  };
}

export const dashboardService = {
  getSummary,
};
