import {
  ContractListRow,
  contractRepository,
} from "../repositories/contract.repository";
import {
  ContractListFilters,
  ContractListItemDto,
  ContractListPagination,
  ContractListSort,
  PaginationMeta,
} from "../types/contract.types";

function toContractListItemDto(row: ContractListRow): ContractListItemDto {
  return {
    id: row.id,
    title: row.title,
    counterparty: row.counterparty,
    status: row.legalState,
    tags: row.tags,
    effectiveDate: row.effectiveDate
      ? row.effectiveDate.toISOString().slice(0, 10)
      : null,
    expirationDate: row.expirationDate
      ? row.expirationDate.toISOString().slice(0, 10)
      : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listContracts(
  organizationId: string,
  filters: ContractListFilters,
  sort: ContractListSort,
  pagination: ContractListPagination,
): Promise<{ items: ContractListItemDto[]; pagination: PaginationMeta }> {
  const [rows, total] = await Promise.all([
    contractRepository.findMany(organizationId, filters, sort, pagination),
    contractRepository.count(organizationId, filters),
  ]);

  return {
    items: rows.map(toContractListItemDto),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}

export const contractService = {
  listContracts,
};
